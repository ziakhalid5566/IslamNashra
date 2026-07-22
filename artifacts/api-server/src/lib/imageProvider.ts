/**
 * Swappable image provider module.
 *
 * Currently uses Google Custom Search JSON API (free tier: 100 searches/day).
 * Daily budget is enforced at the job level (see newsGenerationJob.ts).
 *
 * To swap providers later, replace the body of `fetchImage` below.
 * Possible alternatives: Pexels API, Pixabay API, AI-generated images.
 *
 * IMPORTANT: Rotating multiple Google API accounts/keys to bypass the 100/day quota
 * may violate Google's Terms of Service. The single-account limit is the recommended
 * safe default. Use multi-account rotation at your own risk.
 *
 * Images are stored as URLs only (not downloaded to storage). They are displayed
 * for up to 72 hours before the post auto-deletes, reducing but not eliminating
 * copyright exposure. An attribution note "Image via Google Search" is included
 * in the attribution field for transparency.
 */

import { logger } from "./logger";

export interface ImageResult {
  url: string;
  attribution: string;
}

/**
 * Fetch a relevant image for a news article.
 * Returns null if no image is found or the API is not configured.
 */
export async function fetchImage(query: string): Promise<ImageResult | null> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !engineId) {
    return null;
  }

  try {
    const searchQuery = encodeURIComponent(`${query} mosque Muslim`);
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${searchQuery}&searchType=image&num=1&safe=active&imgType=photo`;

    const response = await fetch(url);
    if (!response.ok) {
      let errBody: unknown;
      try { errBody = await response.json(); } catch { errBody = null; }
      logger.error(
        { status: response.status, statusText: response.statusText, body: errBody },
        "imageProvider: Google CSE request failed",
      );
      return null;
    }

    const data = (await response.json()) as {
      items?: Array<{ link: string; title?: string }>;
    };

    if (!data.items || data.items.length === 0) {
      logger.warn({ query }, "imageProvider: Google CSE returned no image results");
      return null;
    }

    return {
      url: data.items[0].link,
      attribution: "Image via Google Search",
    };
  } catch (err) {
    logger.error({ err }, "imageProvider: unexpected error during image fetch");
    return null;
  }
}
