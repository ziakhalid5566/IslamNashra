/**
 * News Generation Job
 *
 * Calls Groq to generate AI news articles, runs content moderation,
 * optionally fetches images for high-significance articles,
 * and publishes to the posts table.
 *
 * Image budget: DAILY_IMAGE_BUDGET images per day (Pexels free tier: 20,000/month).
 * Articles with significanceScore >= IMAGE_SCORE_THRESHOLD get image priority.
 */

import { db } from "@workspace/db";
import { postsTable, flaggedPostsTable, userPreferencesTable } from "@workspace/db";
import { generateNewsArticles } from "../lib/newsGenerator";
import { moderateContent } from "../lib/contentModeration";
import { fetchImage } from "../lib/imageProvider";
import { sendPushNotifications } from "../lib/pushNotifications";
import { logger } from "../lib/logger";
import { eq } from "drizzle-orm";

// Daily image budget — Pexels free tier is 20,000/month so 600/day is safe
const DAILY_IMAGE_BUDGET = 500;
// Only fetch images for articles at or above this significance score
const IMAGE_SCORE_THRESHOLD = 6;
// 72-hour TTL for all posts
const POST_TTL_MS = 72 * 60 * 60 * 1000;

// In-memory daily counter (resets when the process restarts or at midnight)
let dailyImageCount = 0;
let imageCountDate = new Date().toDateString();

function resetDailyCountIfNeeded(): void {
  const today = new Date().toDateString();
  if (today !== imageCountDate) {
    dailyImageCount = 0;
    imageCountDate = today;
    logger.info("Daily image count reset for new UTC day");
  }
}

export async function runNewsGenerationJob(): Promise<void> {
  logger.info("News generation job: starting");

  try {
    const articles = await generateNewsArticles();
    if (articles.length === 0) {
      logger.warn("News generation job: no articles returned from AI");
      return;
    }

    logger.info({ count: articles.length }, "News generation job: articles generated");
    resetDailyCountIfNeeded();

    // Sort by significance descending — highest-scored articles get images first
    const sorted = [...articles].sort((a, b) => b.significanceScore - a.significanceScore);

    for (const article of sorted) {
      // Run content moderation before publishing
      const mod = moderateContent(article.title, article.body);

      if (mod.flagged) {
        await db.insert(flaggedPostsTable).values({
          title: article.title,
          body: article.body,
          category: article.category,
          significanceScore: article.significanceScore,
          sourceNote: article.sourceNote,
          flagReason: mod.reason ?? "Flagged by automated content filter",
        });
        logger.warn(
          { title: article.title, reason: mod.reason },
          "Article queued for moderation review",
        );
        continue;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + POST_TTL_MS);

      // Decide whether this article gets an image
      let imageUrl: string | null = null;
      let hasImage = false;

      const eligible =
        dailyImageCount < DAILY_IMAGE_BUDGET &&
        article.significanceScore >= IMAGE_SCORE_THRESHOLD;

      if (eligible) {
        const img = await fetchImage({ titleEn: article.title_en, category: article.category });
        if (img) {
          imageUrl = img.url;
          hasImage = true;
          dailyImageCount++;
          logger.info(
            { dailyImageCount, title: article.title },
            "Image fetched for article",
          );
        } else {
          logger.warn(
            { title: article.title, score: article.significanceScore },
            "Image fetch returned null for eligible article — check imageProvider logs for details",
          );
        }
      }

      const [post] = await db
        .insert(postsTable)
        .values({
          // title/body store English content for backwards-compat (notifications, API fallback)
          title: article.title_en,
          body: article.body_en,
          category: article.category,
          imageUrl,
          hasImage,
          significanceScore: article.significanceScore,
          sourceNote: article.sourceNote,
          publishedAt: now,
          expiresAt,
          isBreaking: article.isBreaking,
          // Multi-language fields
          titleEn: article.title_en,
          bodyEn: article.body_en,
          titleUr: article.title_ur,
          bodyUr: article.body_ur,
          titleAr: article.title_ar,
          bodyAr: article.body_ar,
        })
        .returning();

      logger.info(
        { postId: post.id, category: post.category, score: post.significanceScore, hasImage },
        "Post published",
      );

      // Send push notifications for breaking or high-significance articles
      if (post.isBreaking || post.significanceScore >= 8) {
        await notifySubscribers(post.id, post.title, post.body, post.category, post.isBreaking);
      }
    }

    logger.info("News generation job: completed");
  } catch (err) {
    logger.error({ err }, "News generation job: failed");
  }
}

async function notifySubscribers(
  postId: string,
  title: string,
  body: string,
  category: string,
  isBreaking: boolean,
): Promise<void> {
  try {
    const prefs = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.notificationsEnabled, true));

    const tokens = prefs
      .filter((p) => {
        if (!p.pushToken) return false;
        // No category filter = subscribed to everything
        if (p.followedCategories.length === 0) return true;
        return p.followedCategories.includes(category);
      })
      .map((p) => p.pushToken as string);

    if (tokens.length === 0) return;

    await sendPushNotifications(
      tokens,
      isBreaking ? `Breaking: ${title}` : title,
      body.substring(0, 120) + (body.length > 120 ? "…" : ""),
      { postId },
    );
  } catch (err) {
    logger.error({ err }, "Failed to send push notifications for post");
  }
}
