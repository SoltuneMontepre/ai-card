import { GoogleGenerativeAI } from "@google/generative-ai";
import { acquireGeminiSlot } from "./gemini-rate-limit";
import { withGeminiKeyPool } from "./gemini-keys";
import {
  buildSourceContext,
  mergeSourceVerifications,
  verifySourcesWithSearch,
  type SourceVerificationResult,
} from "./gemini-grounded";
import { applySkill, loadSkillReference } from "./skills";
import { checkUrlsInText, extractUrlsFromText } from "./source-url";

function makeModel(apiKey: string) {
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
}

// Extract JSON even if Gemini wraps it in a markdown code block
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : raw.trim();
}

async function generate<T>(prompt: string, rateLimitKey: string): Promise<T> {
  acquireGeminiSlot(rateLimitKey);

  return withGeminiKeyPool(async (key) => {
    const result = await makeModel(key).generateContent(prompt);
    const raw = result.response.text();
    return JSON.parse(extractJson(raw)) as T;
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type VerificationStatus =
  | "verified"
  | "partial"
  | "not_found"
  | "unreachable"
  | "in_text"
  | "search_failed";

export interface Source {
  name: string;
  status: "active" | "broken";
  matchScore: number;
  color: "green" | "yellow";
  tier: "S" | "A" | "B" | "C" | "D";
  reliabilityScore: number;
  reliabilityGrade: "A+" | "A" | "B" | "C" | "D";
  reason: string;
  discoveredUrl?: string | null;
  urlInText?: string | null;
  verificationStatus?: VerificationStatus;
  searchNote?: string;
}

export interface Step1Result {
  citationsFound: number;
  sources: Source[];
  referenceOverview: {
    reliabilityScore: number;
    reliabilityGrade: "A+" | "A" | "B" | "C" | "D";
    confidence: "High" | "Medium" | "Low" | "Cao" | "Trung bình" | "Thấp";
    summary: string;
  };
}

export interface Step2Result {
  logicScore: number;
  summary: string;
}

export interface EvidenceItem {
  text: string;
  result: string;
  matchRate: number;
  status: "verified" | "warning";
  color: "green" | "yellow";
}

export interface Step3Result {
  issueDetected: boolean;
  evidence: EvidenceItem[];
}

export interface Step4Result {
  hasDataYear: boolean;
  dataYear: number;
  freshness: string;
}

export interface Step5Result {
  hallucinationRisk: number;
}

// ── Previous-step context builder ────────────────────────────────────────────

export interface StepContext {
  step1?: Step1Result;
  step2?: Step2Result;
  step3?: Step3Result;
  step4?: Step4Result;
}

/**
 * Converts accumulated step results into a human-readable summary that Gemini
 * can use as grounding context. Only includes results for steps completed
 * before the current one.
 */
function formatPreviousContext(ctx: StepContext, currentStep: number): string {
  if (currentStep <= 1) return "(This is the first step — no prior context.)";

  const lines: string[] = [
    "The following results from earlier verification steps should inform your analysis:\n",
  ];

  if (currentStep > 1 && ctx.step1) {
    const broken = ctx.step1.sources.filter((s) => s.status === "broken");
    const weak = ctx.step1.sources.filter((s) => s.reliabilityScore < 70);
    lines.push("**Step 1 — Source Detection:**");
    lines.push(`- Citations found: ${ctx.step1.citationsFound}`);
    lines.push(
      `- Reference grade: ${ctx.step1.referenceOverview?.reliabilityGrade ?? "N/A"} ` +
        `(${ctx.step1.referenceOverview?.reliabilityScore ?? 0}/100)`,
    );
    if (weak.length > 0) {
      lines.push(
        `- Weak references: ${weak.map((s) => `${s.name} (${s.tier}, ${s.reliabilityScore})`).join(", ")}`,
      );
    }
    lines.push(
      `- Suspicious sources (broken): ${broken.length}` +
        (broken.length > 0
          ? ` → ${broken.map((s) => s.name).join(", ")}`
          : ""),
    );
    lines.push("");
  }

  if (currentStep > 2 && ctx.step2) {
    lines.push("**Step 2 — Logic Analysis:**");
    lines.push(`- Logic score: ${ctx.step2.logicScore}%`);
    lines.push(`- Summary: ${ctx.step2.summary}`);
    lines.push("");
  }

  if (currentStep > 3 && ctx.step3) {
    const warnings = ctx.step3.evidence.filter((e) => e.status === "warning");
    lines.push("**Step 3 — Reality Check:**");
    lines.push(`- Issues detected: ${ctx.step3.issueDetected}`);
    if (warnings.length > 0) {
      lines.push(
        `- Unverified claims: ${warnings.map((e) => `"${e.text.slice(0, 60)}…" (${e.matchRate}%)`).join("; ")}`,
      );
    }
    lines.push("");
  }

  if (currentStep > 4 && ctx.step4) {
    lines.push("**Step 4 — Data Currency:**");
    if (ctx.step4.hasDataYear) {
      lines.push(`- Most recent data year: ${ctx.step4.dataYear}`);
    } else {
      lines.push("- No temporal data year found in text");
    }
    lines.push(`- Freshness: ${ctx.step4.freshness}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ── Prompt Functions (prompts live in skills/*.md) ────────────────────────────

export async function analyzeStep1(
  text: string,
  rateLimitKey: string,
): Promise<Step1Result> {
  const phase1 = await generate<Step1Result>(
    applySkill("step1-source-detection.md", {
      text,
      reference_rubric: loadSkillReference("AI_ReferenceRubric.md"),
    }),
    rateLimitKey,
  );

  const textUrls = extractUrlsFromText(text);
  const urlChecks = await checkUrlsInText(textUrls);

  let verification: SourceVerificationResult = {
    verifications: [],
    groundingUrls: [],
  };
  const sourceNames = phase1.sources.map((s) => s.name);
  let searchFailed = false;

  if (sourceNames.length > 0) {
    try {
      verification = await verifySourcesWithSearch(
        text,
        buildSourceContext(text, phase1.sources),
        rateLimitKey,
      );
    } catch (err) {
      searchFailed = true;
      console.warn(
        "[step1] Google Search verification failed, using preliminary results:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const sources = mergeSourceVerifications(
    phase1.sources,
    verification,
    urlChecks,
    textUrls,
    searchFailed,
  );

  const citationsFound = Math.max(phase1.citationsFound, sources.length);

  return {
    ...phase1,
    citationsFound,
    sources,
  };
}

export async function analyzeStep2(
  text: string,
  rateLimitKey: string,
  ctx: StepContext = {},
): Promise<Step2Result> {
  return generate<Step2Result>(
    applySkill("step2-logic-analysis.md", {
      text,
      previous_context: formatPreviousContext(ctx, 2),
    }),
    rateLimitKey,
  );
}

export async function analyzeStep3(
  text: string,
  rateLimitKey: string,
  ctx: StepContext = {},
): Promise<Step3Result> {
  return generate<Step3Result>(
    applySkill("step3-reality-check.md", {
      text,
      previous_context: formatPreviousContext(ctx, 3),
    }),
    rateLimitKey,
  );
}

export async function analyzeStep4(
  text: string,
  rateLimitKey: string,
  ctx: StepContext = {},
): Promise<Step4Result> {
  return generate<Step4Result>(
    applySkill("step4-data-currency.md", {
      text,
      previous_context: formatPreviousContext(ctx, 4),
    }),
    rateLimitKey,
  );
}

export async function analyzeStep5(
  text: string,
  rateLimitKey: string,
  ctx: StepContext = {},
): Promise<Step5Result> {
  return generate<Step5Result>(
    applySkill("step5-hallucination-risk.md", {
      text,
      previous_context: formatPreviousContext(ctx, 5),
    }),
    rateLimitKey,
  );
}
