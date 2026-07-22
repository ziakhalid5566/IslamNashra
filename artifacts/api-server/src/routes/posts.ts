import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { postsTable } from "@workspace/db";
import { and, gt, eq, desc, count } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

const listPostsQuerySchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /posts — list active (non-expired) posts, optionally filtered by category
router.get("/posts", async (req, res): Promise<void> => {
  const parsed = listPostsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, page, limit } = parsed.data;
  const now = new Date();
  const offset = (page - 1) * limit;

  const baseConditions = [gt(postsTable.expiresAt, now)];
  if (category && category !== "All") {
    baseConditions.push(eq(postsTable.category, category));
  }
  const whereClause = and(...baseConditions);

  const [posts, totalResult] = await Promise.all([
    db
      .select()
      .from(postsTable)
      .where(whereClause)
      .orderBy(desc(postsTable.publishedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(postsTable).where(whereClause),
  ]);

  res.json({
    posts,
    total: Number(totalResult[0]?.total ?? 0),
    page,
    limit,
  });
});

// GET /posts/categories — category breakdown of active posts
router.get("/posts/categories", async (_req, res): Promise<void> => {
  const now = new Date();
  const rows = await db
    .select({ category: postsTable.category, count: count() })
    .from(postsTable)
    .where(gt(postsTable.expiresAt, now))
    .groupBy(postsTable.category)
    .orderBy(desc(count()));

  res.json(rows.map((r) => ({ category: r.category, count: Number(r.count) })));
});

// GET /posts/:id — get a single post by ID
router.get("/posts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, raw));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(post);
});

export default router;
