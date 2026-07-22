/**
 * Cron scheduler for IslamNashra background jobs.
 *
 * Schedules:
 * - News generation:  every 45 minutes (configurable via NEWS_GENERATION_CRON env var)
 * - Auto-delete:      every 15 minutes (configurable via AUTO_DELETE_CRON env var)
 *
 * To adjust posting frequency, set NEWS_GENERATION_CRON to any valid cron expression.
 * Examples:
 *   "* /30 * * * *"  → every 30 minutes (~48 articles/day, ~240 images/day — exceeds budget!)
 *   "* /45 * * * *"  → every 45 minutes (~32 articles/day, ~160 images/day — within budget)
 *   "0 * * * *"     → every hour (~24 articles/day, ~120 images/day)
 *   "0 * /2 * * *"  → every 2 hours (~12 articles/day, ~60 images/day)
 *
 * Note: each job run generates 5 articles. Image budget is 90/day (Google Custom Search free tier).
 * At 45-min intervals: 32 runs × 5 articles = ~160 articles/day, ~96 images used.
 * Adjust IMAGE_SCORE_THRESHOLD in newsGenerationJob.ts to stay within budget.
 */

import cron from "node-cron";
import { logger } from "../lib/logger";
import { runNewsGenerationJob } from "./newsGenerationJob";
import { runAutoDeleteJob } from "./autoDeleteJob";

export function startScheduler(): void {
  const newsSchedule = process.env.NEWS_GENERATION_CRON ?? "*/45 * * * *";
  const deleteSchedule = process.env.AUTO_DELETE_CRON ?? "*/15 * * * *";

  // News generation job
  cron.schedule(newsSchedule, async () => {
    logger.info({ schedule: newsSchedule }, "Cron: news generation triggered");
    await runNewsGenerationJob();
  });

  // Auto-delete job
  cron.schedule(deleteSchedule, async () => {
    await runAutoDeleteJob();
  });

  logger.info(
    { newsSchedule, deleteSchedule },
    "Scheduler started",
  );

  // Run an initial news generation pass shortly after startup
  const initialDelayMs = 8000;
  setTimeout(() => {
    runNewsGenerationJob().catch((err) =>
      logger.error({ err }, "Initial news generation failed"),
    );
  }, initialDelayMs);
}
