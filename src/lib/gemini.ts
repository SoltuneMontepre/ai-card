import { GoogleGenerativeAI } from "@google/generative-ai";
import { applySkill } from "./skills";

// ── Key Pool ──────────────────────────────────────────────────────────────────

function getApiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter((k): k is string => !!k?.trim());
}

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

// Try each key in order; move to the next on any error
async function generate<T>(prompt: string): Promise<T> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("No Gemini API keys configured (GEMINI_API_KEY_1 … _5)");
  }

  let lastError: unknown;
  for (const key of keys) {
    try {
      const result = await makeModel(key).generateContent(prompt);
      const raw = result.response.text();
      return JSON.parse(extractJson(raw)) as T;
    } catch (err) {
      console.warn(
        `[gemini] key …${key.slice(-6)} failed:`,
        err instanceof Error ? err.message : err,
      );
      lastError = err;
    }
  }

  throw lastError ?? new Error("All Gemini API keys failed");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Source {
  name: string;
  status: "active" | "broken";
  matchScore: number;
  color: "green" | "yellow";
}

export interface Step1Result {
  citationsFound: number;
  sources: Source[];
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
    lines.push("**Step 1 — Source Detection:**");
    lines.push(`- Citations found: ${ctx.step1.citationsFound}`);
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
    lines.push(`- Most recent data year: ${ctx.step4.dataYear}`);
    lines.push(`- Freshness: ${ctx.step4.freshness}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ── Prompt Functions (prompts live in skills/*.md) ────────────────────────────

export async function analyzeStep1(text: string): Promise<Step1Result> {
  return generate<Step1Result>(applySkill("step1-source-detection.md", { text }));
}

export async function analyzeStep2(text: string, ctx: StepContext = {}): Promise<Step2Result> {
  return generate<Step2Result>(
    applySkill("step2-logic-analysis.md", {
      text,
      previous_context: formatPreviousContext(ctx, 2),
    }),
  );
}

export async function analyzeStep3(text: string, ctx: StepContext = {}): Promise<Step3Result> {
  return generate<Step3Result>(
    applySkill("step3-reality-check.md", {
      text,
      previous_context: formatPreviousContext(ctx, 3),
    }),
  );
}

export async function analyzeStep4(text: string, ctx: StepContext = {}): Promise<Step4Result> {
  return generate<Step4Result>(
    applySkill("step4-data-currency.md", {
      text,
      previous_context: formatPreviousContext(ctx, 4),
    }),
  );
}

export async function analyzeStep5(text: string, ctx: StepContext = {}): Promise<Step5Result> {
  return generate<Step5Result>(
    applySkill("step5-hallucination-risk.md", {
      text,
      previous_context: formatPreviousContext(ctx, 5),
    }),
  );
}
