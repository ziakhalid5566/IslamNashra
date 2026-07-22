/**
 * Swappable image provider module.
 *
 * Currently uses the Pexels API (free tier: 200 req/hour, 20,000/month).
 * No billing required — just a free API key from pexels.com/api.
 *
 * To swap providers later, replace the body of `fetchImage` below.
 * The interface stays the same: fetchImage(query) → { url, attribution } | null
 */

import { logger } from "./logger";

export interface ImageResult {
  url: string;
  attribution: string;
}

/**
 * Fetch a relevant image for a news article using the Pexels API.
 * Returns null if no image is found or PEXELS_API_KEY is not configured.
 */
export async function fetchImage(query: string): Promise<ImageResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    logger.warn("imageProvider: PEXELS_API_KEY not set — image fetching disabled");
    return null;
  }

  try {
    // Append "Islamic" to the query to bias towards relevant imagery
    const searchQuery = encodeURIComponent(`${query} Islamic`);
    const url = `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=1&orientation=landscape`;

    const response = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      let errBody: unknown;
      try { errBody = await response.json(); } catch { errBody = null; }
      logger.error(
        { status: response.status, statusText: response.statusText, body: errBody },
        "imageProvider: Pexels API request failed",
      );
      return null;
    }

    const data = (await response.json()) as {
      photos?: Array<{
        src: { large: string; medium: string };
        photographer: string;
        photographer_url: string;
      }>;
      total_results?: number;
    };

    if (!data.photos || data.photos.length === 0) {
      // Try a broader fallback query: just "mosque"
      logger.warn({ query }, "imageProvider: Pexels returned no results, trying fallback query");
      return fetchFallback(apiKey);
    }

    const photo = data.photos[0];
    return {
      url: photo.src.large,
      attribution: `Photo by ${photo.photographer} on Pexels`,
    };
  } catch (err) {
    logger.error({ err }, "imageProvider: unexpected error during Pexels fetch");
    return null;
  }
}

/** Fallback to a generic mosque photo if the topic-specific query returns nothing. */
async function fetchFallback(apiKey: string): Promise<ImageResult | null> {
  try {
    const response = await fetch(
      "https://api.pexels.com/v1/search?query=mosque&per_page=5&orientation=landscape",
      { headers: { Authorization: apiKey } },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      photos?: Array<{
        src: { large: string };
        photographer: string;
      }>;
    };

    if (!data.photos || data.photos.length === 0) return null;

    // Pick a random one of the 5 so articles don't all get the same fallback image
    const photo = data.photos[Math.floor(Math.random() * data.photos.length)];
    return {
      url: photo.src.large,
      attribution: `Photo by ${photo.photographer} on Pexels`,
    };
  } catch {
    return null;
  }
}
