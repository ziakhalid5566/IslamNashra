/**
 * AI news generation using Groq.
 *
 * IMPORTANT SAFETY NOTE: This module generates AI text summaries about Islamic affairs.
 * The AI is explicitly instructed NOT to fabricate specific facts, quotes, statistics,
 * or named individuals. All content must be treated as AI-compiled summaries, not
 * verified journalism. The "AI-Generated Summary" label must appear in the UI on
 * every article.
 *
 * Multi-language: Each article is generated in English, Urdu, and Arabic in a single
 * Groq call to minimise API cost while supporting a multilingual audience.
 */

import Groq from "groq-sdk";
import { logger } from "./logger";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const CATEGORIES = [
  "World",
  "Palestine",
  "South Asia",
  "Scholars",
  "Community",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface GeneratedArticle {
  /** English headline — also stored in the legacy `title` column */
  title_en: string;
  /** English body — also stored in the legacy `body` column */
  body_en: string;
  /** Urdu headline */
  title_ur: string;
  /** Urdu body */
  body_ur: string;
  /** Arabic headline */
  title_ar: string;
  /** Arabic body */
  body_ar: string;
  category: string;
  significanceScore: number;
  sourceNote: string;
  isBreaking: boolean;
}

const SYSTEM_PROMPT = `You are an AI news summarizer for IslamNashra, a global Islamic news aggregation platform.
Your role is to generate balanced, respectful news summaries about Muslim communities and Islamic affairs worldwide.

ABSOLUTE RULES — never violate these:
1. NEVER fabricate specific facts, named quotes, exact statistics, or specific individuals you cannot verify
2. Write in a general summary style about well-known ongoing situations and established context
3. NEVER invent specific breaking events or crises that did not occur
4. NEVER include sectarian framing, incitement to violence, or defamatory claims
5. Write professionally, neutrally, and with respect for all Muslims regardless of sect, ethnicity, or nationality
6. Source note must always be "Compiled from multiple international sources" — never cite a specific source
7. Content must be informative and educational, suitable for a global Muslim readership

Coverage areas: Palestine, Saudi Arabia, Turkey, UAE, Indonesia, Malaysia, Pakistan, Bangladesh, Africa,
Western Muslim communities (UK, USA, Canada, France, Germany), Islamic scholarship, community events, halal economy,
Hajj/Umrah updates, Islamic education, humanitarian affairs involving Muslim communities.`;

const USER_PROMPT = `Generate exactly 5 distinct news summaries about global Islamic and Muslim affairs.
Ensure variety in geography and topic — do not repeat the same region or theme twice.

For each item, produce a JSON object with ALL of these fields:
- "title_en": Concise English headline (max 15 words, no sensationalism)
- "body_en": 100-150 word factual English summary in news style. General context, no fabricated specifics.
- "title_ur": Urdu translation of the English headline
- "body_ur": Urdu translation of the English body (natural, fluent Urdu — not word-for-word)
- "title_ar": Arabic translation of the English headline
- "body_ar": Arabic translation of the English body (natural, fluent Arabic)
- "category": Exactly one of: "World", "Palestine", "South Asia", "Scholars", "Community"
- "significanceScore": Integer 1-10 (1 = minor community news, 10 = major international event)
- "sourceNote": Always "Compiled from multiple international sources"
- "isBreaking": boolean — true ONLY for significanceScore >= 9

Return ONLY a valid JSON array with exactly 5 objects. No markdown, no preamble, no explanation.`;

export async function generateNewsArticles(): Promise<GeneratedArticle[]> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.65,
      max_tokens: 12000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    // Handle both array and object-wrapped responses
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try extracting a JSON array from the response
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array in response");
      parsed = JSON.parse(match[0]);
    }

    const articles: GeneratedArticle[] = Array.isArray(parsed)
      ? (parsed as GeneratedArticle[])
      : ((parsed as Record<string, unknown>).articles as GeneratedArticle[]) ??
        ((parsed as Record<string, unknown>).items as GeneratedArticle[]) ??
        [];

    // Validate and sanitize each article
    return articles
      .filter(
        (a) =>
          a &&
          typeof a.title_en === "string" &&
          typeof a.body_en === "string" &&
          typeof a.category === "string" &&
          typeof a.significanceScore === "number",
      )
      .map((a) => ({
        ...a,
        title_ur: typeof a.title_ur === "string" ? a.title_ur : a.title_en,
        body_ur: typeof a.body_ur === "string" ? a.body_ur : a.body_en,
        title_ar: typeof a.title_ar === "string" ? a.title_ar : a.title_en,
        body_ar: typeof a.body_ar === "string" ? a.body_ar : a.body_en,
        // Enforce source note — never allow AI to invent sources
        sourceNote: "Compiled from multiple international sources",
        // Cap significance score to valid range
        significanceScore: Math.min(10, Math.max(1, Math.round(a.significanceScore))),
        // Ensure isBreaking is boolean
        isBreaking: Boolean(a.isBreaking) && a.significanceScore >= 9,
      }));
  } catch (err) {
    logger.error({ err }, "Failed to generate news articles from Groq");
    return [];
  }
}
