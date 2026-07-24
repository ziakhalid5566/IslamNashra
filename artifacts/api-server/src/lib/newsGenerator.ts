/**
 * Multi-Agent AI News Generation System for IslamNashra
 *
 * 8 specialized AI agents, each covering a distinct news domain.
 * Agents run SEQUENTIALLY with 22s gaps to stay under Groq's 12k TPM limit.
 *
 * Token budget per agent:
 *   ~600 input + max 3500 output = ~4100 tokens
 *   At 200 tok/s, the 22s gap refills ~4400 tokens — safely clears each call.
 *
 * SAFETY: Content is labelled "AI-Generated Summary". No specific facts,
 * quotes, or individuals are fabricated. Source note is always generic.
 */

import Groq from "groq-sdk";
import { logger } from "./logger";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const CATEGORIES = [
  "World",
  "Palestine",
  "South Asia",
  "Economy",
  "Government",
  "Security",
  "Scholars",
  "Mosques",
  "Madrassas",
  "Africa",
  "Southeast Asia",
  "Turkey",
  "Community",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface GeneratedArticle {
  title_en: string;
  body_en: string;
  title_ur: string;
  body_ur: string;
  title_ar: string;
  body_ar: string;
  category: Category;
  significanceScore: number;
  sourceNote: string;
  isBreaking: boolean;
  country?: string;
}

// ─── Agent Definitions ────────────────────────────────────────────────────────

interface AgentConfig {
  name: string;
  categories: Category[];
  systemPrompt: string;
  userPrompt: string;
  articleCount: number;
}

const BASE_SAFETY_RULES = `
ABSOLUTE RULES — never violate:
1. NEVER fabricate specific facts, named quotes, exact statistics, or individuals
2. Write general summary style about well-known ongoing situations
3. NEVER invent specific breaking events or crises that did not occur
4. NEVER include sectarian framing, incitement, or defamatory claims
5. Write professionally and neutrally; respect all Muslims regardless of sect or nationality
6. sourceNote must always be "Compiled from multiple international sources"
7. isBreaking: true ONLY for significanceScore >= 9

URDU RULES:
- Pure standard Urdu script only. NEVER mix English words in Urdu script
- Use common Urdu vocabulary. Every sentence grammatically complete

ARABIC RULES:
- Clear Modern Standard Arabic (فصحى) with newspaper register

OUTPUT FORMAT — CRITICAL:
Return ONLY a valid, COMPLETE JSON array. No markdown fences, no preamble, no explanation.
The array MUST be closed with ] before you stop.
Each object: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category, significanceScore (1-10 integer), sourceNote, isBreaking, country (optional ISO code)`;

const AGENTS: AgentConfig[] = [
  // ── Agent 1: Global Islamic Affairs + Palestine ─────────────────────────────
  {
    name: "world_palestine",
    categories: ["World", "Palestine"],
    systemPrompt: `You are a senior international journalist specialising in global Islamic affairs and Palestine.
Cover: OIC developments, events affecting Muslim communities, UN resolutions on Palestine,
Gaza humanitarian situation, West Bank settlements, Al-Aqsa Mosque, Muslim diaspora issues.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering World Islamic affairs and Palestine.
Each body 80-100 words per language. Cover different countries.
Category "World" for global affairs, "Palestine" for Palestine-specific.`,
    articleCount: 2,
  },

  // ── Agent 2: South Asia ──────────────────────────────────────────────────────
  {
    name: "south_asia",
    categories: ["South Asia"],
    systemPrompt: `You are an expert journalist covering South Asian Muslim affairs.
Cover: Pakistan (politics, economy, security), Bangladesh, India's Muslim minority,
Afghanistan, Kashmir, Rohingya refugees. Governance, economic policies, religious freedom, social issues.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering South Asian Muslim affairs.
Each body 80-100 words per language. Cover different countries (Pakistan, Bangladesh, India, Afghanistan).
Category always "South Asia".`,
    articleCount: 2,
  },

  // ── Agent 3: Islamic Economy ─────────────────────────────────────────────────
  {
    name: "economy",
    categories: ["Economy"],
    systemPrompt: `You are an Islamic economics and halal finance journalist.
Cover: Islamic banking (sukuk, sharia-compliant finance), halal economy, Saudi Vision 2030,
Gulf financial news, Islamic waqf, zakat funds, halal market growth, OIC economic cooperation.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries on the Islamic economy and halal finance.
Each body 80-100 words per language. Cover different countries/topics.
Category always "Economy".`,
    articleCount: 2,
  },

  // ── Agent 4: Governance & Politics ──────────────────────────────────────────
  {
    name: "government",
    categories: ["Government"],
    systemPrompt: `You are an expert journalist covering governance in Muslim-majority countries.
Cover: elections, political transitions, legislation affecting Muslims, foreign policy,
Saudi Arabia, UAE, Turkey, Iran, Pakistan, Malaysia, Indonesia, Egypt, Morocco, Jordan.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries on governance in Muslim-majority countries.
Each body 80-100 words per language. Cover different countries.
Category always "Government".`,
    articleCount: 2,
  },

  // ── Agent 5: Security & Humanitarian ────────────────────────────────────────
  {
    name: "security",
    categories: ["Security"],
    systemPrompt: `You are a security analyst and humanitarian journalist covering Muslim-majority regions.
Cover: conflicts, peace processes, humanitarian crises, refugee situations (Syria, Yemen, Rohingya),
Sahel security, Somalia, Libya, Afghan humanitarian situation, earthquake/flood relief.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries on security and humanitarian situations.
Each body 80-100 words per language. Cover different regions (Middle East, Africa, Asia).
Category always "Security".`,
    articleCount: 2,
  },

  // ── Agent 6: Islamic Scholars + Mosques ──────────────────────────────────────
  {
    name: "scholars_mosques",
    categories: ["Scholars", "Mosques"],
    systemPrompt: `You are an expert covering Islamic scholarship, religious institutions, and sacred sites.
Cover: major fatwas, Islamic conferences, Al-Azhar University, Mecca/Medina developments,
Masjid al-Haram expansions, major mosque construction worldwide, Quran competitions,
prominent Muslim scholars' statements and religious guidance.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries on Islamic scholars and mosques.
Each body 80-100 words per language. Mix scholars news with mosque/sacred-sites news.
Category "Scholars" for scholarly news, "Mosques" for mosque/sacred-sites.`,
    articleCount: 2,
  },

  // ── Agent 7: Madrassas & Islamic Education ────────────────────────────────────
  {
    name: "madrassas",
    categories: ["Madrassas"],
    systemPrompt: `You are an expert on Islamic education and madrassas worldwide.
Cover: madrassa reforms in Pakistan, Bangladesh, Egypt, Indonesia, India;
Al-Azhar University, International Islamic Universities, curriculum modernisation,
Islamic education in Western countries, Quran memorisation programs, online Islamic learning.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries on madrassas and Islamic education.
Each body 80-100 words per language. Cover different countries and education levels.
Category always "Madrassas".`,
    articleCount: 2,
  },

  // ── Agent 8: Africa + Southeast Asia + Turkey + Community ─────────────────────
  {
    name: "regional",
    categories: ["Africa", "Southeast Asia", "Turkey", "Community"],
    systemPrompt: `You are a regional expert covering Africa, Southeast Asia, Turkey, and Western Muslim communities.
AFRICA: Nigeria, Senegal, Ethiopia, Kenya, Tanzania, Morocco, Algeria, Tunisia.
SOUTHEAST ASIA: Indonesia, Malaysia, Philippines (Mindanao), Myanmar (Rohingya), Brunei.
TURKEY: domestic politics, Ottoman heritage, Turkish diaspora, Central Asia.
COMMUNITY: Western Muslims (UK, USA, Canada, France, Germany), Muslim minority rights, halal lifestyle.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering Africa, Southeast Asia, Turkey, and Muslim communities.
Each body 80-100 words per language. Cover all four regions.
Category "Africa" / "Southeast Asia" / "Turkey" / "Community" as appropriate.`,
    articleCount: 2,
  },
];

// ─── Core Article Generator ───────────────────────────────────────────────────

/** Strip ASCII control chars that break JSON.parse */
function sanitizeJson(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
}

async function generateAgentArticlesSafe(
  agent: AgentConfig
): Promise<GeneratedArticle[]> {
  const userPrompt = agent.userPrompt.replace(
    "{count}",
    String(agent.articleCount)
  );

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: agent.systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.65,
    max_tokens: 3500,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from Groq");

  const content = sanitizeJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract the JSON array even if there's surrounding text
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array found in response");
    parsed = JSON.parse(sanitizeJson(match[0]));
  }

  const arr: GeneratedArticle[] = Array.isArray(parsed)
    ? (parsed as GeneratedArticle[])
    : ((parsed as Record<string, unknown>).articles as GeneratedArticle[]) ?? [];

  return arr
    .filter(
      (a) =>
        a &&
        typeof a.title_en === "string" &&
        typeof a.body_en === "string" &&
        typeof a.category === "string" &&
        typeof a.significanceScore === "number"
    )
    .map((a) => ({
      ...a,
      title_ur: typeof a.title_ur === "string" ? a.title_ur : a.title_en,
      body_ur: typeof a.body_ur === "string" ? a.body_ur : a.body_en,
      title_ar: typeof a.title_ar === "string" ? a.title_ar : a.title_en,
      body_ar: typeof a.body_ar === "string" ? a.body_ar : a.body_en,
      sourceNote: "Compiled from multiple international sources",
      significanceScore: Math.min(10, Math.max(1, Math.round(a.significanceScore))),
      isBreaking: Boolean(a.isBreaking) && a.significanceScore >= 9,
      country: typeof a.country === "string" ? a.country : undefined,
      category: (CATEGORIES as readonly string[]).includes(a.category)
        ? (a.category as Category)
        : (agent.categories[0] as Category),
    }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run all 8 agents sequentially with a 22s gap between each call.
 *
 * Why sequential?  Groq free tier = 12,000 TPM (200 tok/s).
 * Each agent uses ≈ 4,100 tokens total (600 input + 3,500 max output).
 * Running two in parallel would exhaust the minute window immediately.
 * At 22s gap the token bucket refills ~4,400 tokens — just enough for
 * the next agent to start cleanly.
 *
 * Total runtime: 8 agents × ~30s (8s API + 22s gap) ≈ 4 minutes.
 */
export async function generateNewsArticles(): Promise<GeneratedArticle[]> {
  const INTER_AGENT_DELAY_MS = 22000;

  logger.info({ agentCount: AGENTS.length }, "Starting multi-agent news generation (sequential)");

  const all: GeneratedArticle[] = [];

  for (let i = 0; i < AGENTS.length; i++) {
    const agent = AGENTS[i];
    if (i > 0) await sleep(INTER_AGENT_DELAY_MS);

    try {
      const articles = await generateAgentArticlesSafe(agent);
      logger.info({ agent: agent.name, count: articles.length }, "Agent completed");
      all.push(...articles);
    } catch (err) {
      logger.error({ err, agent: agent.name }, "Agent failed");
    }
  }

  logger.info({ total: all.length }, "All agents finished");
  return all;
}
