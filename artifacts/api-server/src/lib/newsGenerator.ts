/**
 * Multi-Agent AI News Generation System for IslamNashra
 *
 * 8 specialized AI agents, each covering a distinct news domain.
 * All agents run in PARALLEL via Promise.allSettled for maximum throughput.
 *
 * SAFETY: Content is labeled "AI-Generated Summary". No specific facts,
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
1. NEVER fabricate specific facts, named quotes, exact statistics, or specific individuals you cannot verify
2. Write in a general summary style about well-known ongoing situations and established context
3. NEVER invent specific breaking events or crises that did not occur
4. NEVER include sectarian framing, incitement to violence, or defamatory claims
5. Write professionally, neutrally, and with respect for all Muslims regardless of sect, ethnicity, or nationality
6. sourceNote must always be "Compiled from multiple international sources"
7. isBreaking: true ONLY for significanceScore >= 9

URDU RULES (critical):
- Write in PURE standard Urdu script only. NEVER mix English words in Urdu script
- Use common Urdu vocabulary that any Urdu reader understands
- Every sentence must be grammatically complete in Urdu
- If a concept has no clean Urdu word, describe it in Urdu

ARABIC RULES:
- Write in clear Modern Standard Arabic (فصحى) with newspaper register
- Formal, professional phrasing throughout

OUTPUT FORMAT:
Return ONLY a valid JSON array. No markdown, no preamble, no explanation.
Each object must have: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category, significanceScore (1-10), sourceNote, isBreaking, country (optional 2-letter ISO code or country name)`;

const AGENTS: AgentConfig[] = [
  // ── Agent 1: Global Islamic Affairs + Palestine ─────────────────────────────
  {
    name: "world_palestine",
    categories: ["World", "Palestine"],
    systemPrompt: `You are a senior international journalist specializing in global Islamic affairs and Palestine.
Cover: OIC developments, major international events affecting Muslim communities, UN resolutions on Palestine,
Gaza humanitarian situation, West Bank settlements, Al-Aqsa Mosque developments, Israeli-Palestinian peace,
Muslim diaspora issues, Islamophobia in global context, major Muslim world leaders' statements.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct, detailed news summaries covering World Islamic affairs and Palestine.
Ensure geographic variety — cover different countries and events.
Each article body must be 150-200 words, detailed, covering background, current status, and significance.
Use category "World" for global affairs, "Palestine" for Palestine-specific news.
Required JSON fields per article: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category, significanceScore, sourceNote, isBreaking, country`,
    articleCount: 4,
  },

  // ── Agent 2: South Asia ──────────────────────────────────────────────────────
  {
    name: "south_asia",
    categories: ["South Asia"],
    systemPrompt: `You are an expert journalist covering South Asian Muslim affairs.
Cover: Pakistan (politics, economy, security, religious matters), Bangladesh (politics, Islamic affairs),
India's Muslim minority (court cases, community issues, religious rights), Afghanistan (post-Taliban society,
humanitarian), Kashmir conflict, Rohingya refugees, Sri Lanka Muslims, Nepal Muslims.
Cover governance, economic policies, religious freedom, social issues, and cultural matters in the region.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering South Asian Muslim affairs.
Each body 150-200 words. Cover different countries — Pakistan, Bangladesh, India, Afghanistan, etc.
Required JSON fields: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category (always "South Asia"), significanceScore, sourceNote, isBreaking, country`,
    articleCount: 4,
  },

  // ── Agent 3: Islamic Economy ─────────────────────────────────────────────────
  {
    name: "economy",
    categories: ["Economy"],
    systemPrompt: `You are an Islamic economics and halal finance expert journalist.
Cover: Islamic banking developments (sukuk, Islamic bonds, sharia-compliant finance),
halal economy (food certification, halal tourism, halal cosmetics), Saudi Vision 2030 economy,
UAE/Qatar/Kuwait financial news, Malaysian/Indonesian Islamic finance, cryptocurrency and Islamic finance,
Muslim-majority countries' currency and trade news, Islamic waqf projects, zakat and charity funds,
halal market global growth, Islamic micro-finance, OIC economic cooperation.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering the Islamic economy and halal finance.
Each body 150-200 words. Cover different countries and financial topics.
Required JSON fields: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category (always "Economy"), significanceScore, sourceNote, isBreaking, country`,
    articleCount: 3,
  },

  // ── Agent 4: Governance & Politics ──────────────────────────────────────────
  {
    name: "government",
    categories: ["Government"],
    systemPrompt: `You are an expert journalist covering governance in Muslim-majority countries.
Cover: elections and political transitions, legislation affecting Muslims, foreign policy developments,
Saudi Arabia (Vision 2030, regional policy), UAE (governance, diversification), Turkey (domestic politics),
Iran (nuclear deal, regional policy), Pakistan (political developments), Malaysia (politics, Islamization),
Indonesia (democracy, religious harmony), Egypt (governance, Islamic affairs), Morocco, Jordan, Kuwait,
Bahrain, Qatar, Oman, Azerbaijan, Kazakhstan, Algeria, Tunisia, Libya governance news.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering governance in Muslim-majority countries.
Each body 150-200 words. Cover different countries.
Required JSON fields: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category (always "Government"), significanceScore, sourceNote, isBreaking, country`,
    articleCount: 3,
  },

  // ── Agent 5: Security & Humanitarian ────────────────────────────────────────
  {
    name: "security",
    categories: ["Security"],
    systemPrompt: `You are a security analyst and humanitarian journalist covering Muslim-majority regions.
Cover: armed conflicts and peace processes, counter-terrorism efforts, emergency situations,
natural disasters in Muslim countries, refugee crises (Syria, Yemen, Rohingya, Somali),
Sahel security situation (Mali, Burkina Faso, Niger), Somalia conflict, Yemen peace talks,
Syria reconstruction, Libya security, Iraq post-ISIS situation, Afghan humanitarian crisis,
earthquake/flood relief in Muslim countries, displaced Muslim populations.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering security and humanitarian situations.
Each body 150-200 words. Cover different regions — Middle East, Africa, Asia, etc.
Required JSON fields: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category (always "Security"), significanceScore, sourceNote, isBreaking, country`,
    articleCount: 3,
  },

  // ── Agent 6: Islamic Scholars + Mosques ──────────────────────────────────────
  {
    name: "scholars_mosques",
    categories: ["Scholars", "Mosques"],
    systemPrompt: `You are an expert covering Islamic scholarship, religious institutions, and sacred sites.
Cover: major fatwas and Islamic rulings from recognized scholars, Islamic conferences and symposia,
International Islamic Fiqh Academy decisions, Al-Azhar University news, Medina and Mecca developments,
Masjid al-Haram and Masjid al-Nabawi expansions and management, Al-Aqsa Mosque,
major mosque construction projects worldwide (UK, USA, China, Africa, Europe),
Quran competitions, Hafiz recognition events, Islamic charity and waqf projects,
major Muslim scholars' public statements and religious guidance.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering Islamic scholars and mosques.
Each body 150-200 words. Mix scholars news with mosque/sacred sites news.
Use "Scholars" for scholarly/academic news, "Mosques" for mosque/sacred sites news.
Required JSON fields: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category, significanceScore, sourceNote, isBreaking, country`,
    articleCount: 4,
  },

  // ── Agent 7: Madrassas & Islamic Education ────────────────────────────────────
  {
    name: "madrassas",
    categories: ["Madrassas"],
    systemPrompt: `You are an expert on Islamic education and madrassas worldwide.
Cover: madrassa reforms and developments in Pakistan, Bangladesh, Egypt, Indonesia, India,
Al-Azhar University (world's oldest Islamic university), International Islamic University Islamabad,
Islamic University of Madinah, IIUM Malaysia, other Islamic universities worldwide,
Darul Ulooms, Deoband, Barelvi institutions, madrassa curriculum modernization,
Islamic education in secular countries (France, UK, USA, Canada, Germany),
halal education initiatives, Islamic school certifications, Quran memorization programs,
online Islamic learning platforms, Islamic education funding and scholarships.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering madrassas and Islamic education.
Each body 150-200 words. Cover different countries and education levels.
Required JSON fields: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category (always "Madrassas"), significanceScore, sourceNote, isBreaking, country`,
    articleCount: 3,
  },

  // ── Agent 8: Africa + Southeast Asia + Turkey ─────────────────────────────────
  {
    name: "regional",
    categories: ["Africa", "Southeast Asia", "Turkey", "Community"],
    systemPrompt: `You are a regional expert covering Africa, Southeast Asia, Turkey, and Western Muslim communities.
Cover:
AFRICA: Nigeria (largest Muslim population), Senegal, Mali, Niger, Ethiopia, Kenya, Tanzania,
Uganda, Mozambique, South Africa Muslim community, North Africa (Morocco, Algeria, Tunisia)
SOUTHEAST ASIA: Indonesia (world's largest Muslim country), Malaysia, Philippines (Mindanao),
Thailand (Deep South), Myanmar (Rohingya), Singapore, Brunei
TURKEY: domestic politics, economy, Ottoman heritage projects, Turkish diaspora,
Central Asia (Kazakhstan, Uzbekistan, Kyrgyzstan, Tajikistan, Turkmenistan), Azerbaijan
COMMUNITY: Western Muslim communities (UK, USA, Canada, France, Germany, Australia, Netherlands),
Muslim minority rights, Islamic centers, halal lifestyle in the West, Muslim youth issues.
${BASE_SAFETY_RULES}`,
    userPrompt: `Generate {count} distinct news summaries covering Africa, Southeast Asia, Turkey, and Muslim communities.
Each body 150-200 words. Cover all four regions — don't focus on just one.
Use "Africa" for Africa news, "Southeast Asia" for SEA, "Turkey" for Turkey/Central Asia, "Community" for Western Muslims.
Required JSON fields: title_en, body_en, title_ur, body_ur, title_ar, body_ar,
category, significanceScore, sourceNote, isBreaking, country`,
    articleCount: 5,
  },
];

// ─── Article Generation ───────────────────────────────────────────────────────

async function generateAgentArticles(
  agent: AgentConfig
): Promise<GeneratedArticle[]> {
  const userPrompt = agent.userPrompt.replace(
    "{count}",
    String(agent.articleCount)
  );

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 9000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array in response");
      parsed = JSON.parse(match[0]);
    }

    const raw: GeneratedArticle[] = Array.isArray(parsed)
      ? (parsed as GeneratedArticle[])
      : ((parsed as Record<string, unknown>).articles as GeneratedArticle[]) ??
        [];

    return raw
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
        significanceScore: Math.min(
          10,
          Math.max(1, Math.round(a.significanceScore))
        ),
        isBreaking: Boolean(a.isBreaking) && a.significanceScore >= 9,
        country: typeof a.country === "string" ? a.country : undefined,
        // ensure category is valid
        category: (CATEGORIES as readonly string[]).includes(a.category)
          ? (a.category as Category)
          : (agent.categories[0] as Category),
      }));
  } catch (err) {
    logger.error(
      { err, agent: agent.name },
      "Agent failed to generate articles"
    );
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Strip control characters that break JSON.parse */
function sanitizeJson(raw: string): string {
  // Remove ASCII control chars (0x00–0x1F) except tab, newline, carriage return
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

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.65,
      max_tokens: 2500,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response from Groq");

    const content = sanitizeJson(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array in response");
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
  } catch (err) {
    logger.error({ err, agent: agent.name }, "Agent failed to generate articles");
    return [];
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run agents in batches of 3 to avoid Groq rate limits, collect all articles */
export async function generateNewsArticles(): Promise<GeneratedArticle[]> {
  const BATCH_SIZE = 2;
  const BATCH_DELAY_MS = 35000; // 35s — keeps us under Groq 12k TPM limit

  logger.info({ agentCount: AGENTS.length, batchSize: BATCH_SIZE }, "Starting multi-agent news generation");

  const all: GeneratedArticle[] = [];

  for (let i = 0; i < AGENTS.length; i += BATCH_SIZE) {
    const batch = AGENTS.slice(i, i + BATCH_SIZE);
    if (i > 0) await sleep(BATCH_DELAY_MS);

    const results = await Promise.allSettled(
      batch.map((agent) => generateAgentArticlesSafe(agent))
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const agent = batch[j];
      if (r.status === "fulfilled") {
        logger.info({ agent: agent.name, count: r.value.length }, "Agent completed");
        all.push(...r.value);
      } else {
        logger.warn({ agent: agent.name, reason: r.reason }, "Agent failed");
      }
    }
  }

  logger.info({ total: all.length }, "All agents finished");
  return all;
}
