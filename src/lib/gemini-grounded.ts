import { GoogleGenAI } from "@google/genai";
import { acquireGeminiSlot } from "./gemini-rate-limit";
import { withGeminiKeyPool } from "./gemini-keys";
import { applySkill } from "./skills";
import type { Source, VerificationStatus } from "./gemini";

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const brace = raw.match(/\{[\s\S]*\}/);
  return brace ? brace[0].trim() : raw.trim();
}

export interface SourceContextItem {
  name: string;
  excerpt: string;
}

export interface SourceVerificationItem {
  name: string;
  discoveredUrl: string | null;
  verificationStatus: VerificationStatus;
  searchNote: string;
}

export interface GroundingUrl {
  title?: string;
  uri?: string;
}

export interface SourceVerificationResult {
  verifications: SourceVerificationItem[];
  groundingUrls: GroundingUrl[];
  searchFailed?: boolean;
}

interface VerificationResponse {
  verifications?: SourceVerificationItem[];
}

function parseGroundingUrls(
  chunks: Array<{ web?: { title?: string; uri?: string } }> | undefined,
): GroundingUrl[] {
  const urls: GroundingUrl[] = [];
  for (const chunk of chunks ?? []) {
    if (chunk.web?.uri) {
      urls.push({ title: chunk.web.title, uri: chunk.web.uri });
    }
  }
  return urls;
}

function parseVerificationResponse(raw: string): SourceVerificationItem[] {
  try {
    const parsed = JSON.parse(extractJson(raw)) as VerificationResponse;
    return parsed.verifications ?? [];
  } catch {
    return [];
  }
}

/** Uses Gemini + Google Search grounding to find URLs for extracted sources. */
export async function verifySourcesWithSearch(
  text: string,
  sourceContext: SourceContextItem[],
  rateLimitKey: string,
): Promise<SourceVerificationResult> {
  if (sourceContext.length === 0) {
    return { verifications: [], groundingUrls: [] };
  }

  acquireGeminiSlot(rateLimitKey);

  const prompt = applySkill("step1-source-verification.md", {
    text,
    sources: JSON.stringify(
      sourceContext.map((s) => s.name),
      null,
      2,
    ),
    source_context: JSON.stringify(sourceContext, null, 2),
  });

  return withGeminiKeyPool(async (key) => {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const raw = response.text ?? "";
    const groundingUrls = parseGroundingUrls(
      response.candidates?.[0]?.groundingMetadata?.groundingChunks,
    );
    const verifications = parseVerificationResponse(raw);

    return { verifications, groundingUrls };
  });
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

function extractSourceTokens(name: string): string[] {
  const lower = name.toLowerCase();
  const fromSplit = lower
    .split(/[\s,;/()[\]–—]+/)
    .map((t) => t.replace(/[^a-z0-9.-]/g, ""))
    .filter((t) => t.length >= 2);
  const fromPattern = lower.match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? [];
  return [...new Set([...fromSplit, ...fromPattern])];
}

function findGroundingUrlForSource(
  sourceName: string,
  groundingUrls: GroundingUrl[],
): GroundingUrl | null {
  const tokens = extractSourceTokens(sourceName);
  if (tokens.length === 0) return null;

  let best: { url: GroundingUrl; score: number } | null = null;

  for (const g of groundingUrls) {
    if (!g.uri) continue;
    const haystack = `${g.uri} ${g.title ?? ""}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (token.length >= 2 && haystack.includes(token)) {
        score += token.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { url: g, score };
    }
  }

  return best?.url ?? null;
}

function findUrlInTextForSource(
  sourceName: string,
  textUrls: string[],
): string | null {
  const lower = sourceName.toLowerCase();
  for (const url of textUrls) {
    if (
      lower.includes(url.toLowerCase()) ||
      url.toLowerCase().includes(lower)
    ) {
      return url;
    }
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const token = host.split(".")[0];
      if (token.length > 3 && lower.includes(token)) {
        return url;
      }
    } catch {
      // ignore invalid URL
    }
  }
  return null;
}

function applyGroundingMatch(
  sourceName: string,
  groundingUrls: GroundingUrl[],
  currentUrl: string | null,
  currentStatus: VerificationStatus,
): {
  discoveredUrl: string | null;
  verificationStatus: VerificationStatus;
  searchNote: string;
} {
  if (currentUrl || groundingUrls.length === 0) {
    return {
      discoveredUrl: currentUrl,
      verificationStatus: currentStatus,
      searchNote: "",
    };
  }

  const match = findGroundingUrlForSource(sourceName, groundingUrls);
  if (!match?.uri) {
    return {
      discoveredUrl: currentUrl,
      verificationStatus: currentStatus,
      searchNote: "",
    };
  }

  const tokens = extractSourceTokens(sourceName);
  const haystack = `${match.uri} ${match.title ?? ""}`.toLowerCase();
  const strongMatch = tokens.some(
    (t) => t.length >= 4 && haystack.includes(t),
  );

  return {
    discoveredUrl: match.uri,
    verificationStatus: strongMatch ? "verified" : "partial",
    searchNote: strongMatch
      ? "Tìm thấy trang chính thức qua Google Search."
      : "Tìm thấy nguồn liên quan qua Google Search (khớp một phần).",
  };
}

/** Merges Phase 1 sources with web verification and in-text URL checks. */
export function mergeSourceVerifications(
  sources: Source[],
  verification: SourceVerificationResult,
  urlChecks: Map<string, "reachable" | "unreachable">,
  textUrls: string[],
  searchFailed = false,
): Source[] {
  if (searchFailed) {
    return sources.map((source) => ({
      ...source,
      verificationStatus: "search_failed" as VerificationStatus,
      searchNote:
        "Không thể tìm kiếm trên web do lỗi API. Vui lòng thử lại.",
    }));
  }

  const byName = new Map(
    verification.verifications.map((v) => [normalizeName(v.name), v]),
  );

  const merged: Source[] = sources.map((source) => {
    const v = byName.get(normalizeName(source.name));
    let discoveredUrl = v?.discoveredUrl ?? null;
    const urlInText = findUrlInTextForSource(source.name, textUrls);
    let verificationStatus: VerificationStatus =
      v?.verificationStatus ?? "not_found";
    let searchNote = v?.searchNote ?? "";

    if (urlInText) {
      const reachable = urlChecks.get(urlInText) === "reachable";
      verificationStatus = reachable ? "in_text" : "unreachable";
      discoveredUrl = discoveredUrl ?? urlInText;
      if (!searchNote) {
        searchNote = reachable
          ? "Link có trong văn bản và phản hồi hợp lệ."
          : "Link có trong văn bản nhưng không truy cập được.";
      }
    }

    if (!discoveredUrl) {
      const grounding = applyGroundingMatch(
        source.name,
        verification.groundingUrls,
        discoveredUrl,
        verificationStatus,
      );
      if (grounding.discoveredUrl) {
        discoveredUrl = grounding.discoveredUrl;
        verificationStatus = grounding.verificationStatus;
        searchNote = searchNote || grounding.searchNote;
      }
    }

    if (
      verificationStatus === "not_found" &&
      !discoveredUrl &&
      !urlInText
    ) {
      searchNote = searchNote || "Không tìm thấy link phù hợp trên web.";
    }

    const status: Source["status"] =
      verificationStatus === "verified" ||
      verificationStatus === "in_text" ||
      verificationStatus === "partial"
        ? "active"
        : "broken";

    let matchScore = source.matchScore;
    if (
      verificationStatus === "not_found" ||
      verificationStatus === "unreachable"
    ) {
      matchScore = Math.min(matchScore, 45);
    } else if (
      verificationStatus === "verified" ||
      verificationStatus === "in_text"
    ) {
      matchScore = Math.max(matchScore, 72);
    } else if (verificationStatus === "partial") {
      matchScore = Math.max(matchScore, 60);
    }

    return {
      ...source,
      status,
      matchScore,
      color: matchScore >= 60 ? "green" : "yellow",
      discoveredUrl,
      urlInText,
      verificationStatus,
      searchNote,
    };
  });

  const usedUrls = new Set(
    merged.map((s) => s.urlInText).filter((u): u is string => !!u),
  );

  for (const url of textUrls) {
    if (usedUrls.has(url)) continue;
    const reachable = urlChecks.get(url) === "reachable";
    let hostname = url;
    try {
      hostname = new URL(url).hostname;
    } catch {
      // keep raw url as name
    }

    merged.push({
      name: hostname,
      status: reachable ? "active" : "broken",
      matchScore: reachable ? 75 : 30,
      color: reachable ? "green" : "yellow",
      tier: "C",
      reliabilityScore: reachable ? 70 : 30,
      reliabilityGrade: reachable ? "B" : "D",
      reason: reachable
        ? "URL được trích xuất trực tiếp từ văn bản."
        : "URL trong văn bản không truy cập được.",
      discoveredUrl: url,
      urlInText: url,
      verificationStatus: reachable ? "in_text" : "unreachable",
      searchNote: reachable
        ? "Link có trong văn bản và phản hồi hợp lệ."
        : "Link có trong văn bản nhưng không truy cập được.",
    });
  }

  return merged;
}

export function buildSourceContext(
  text: string,
  sources: Source[],
  radius = 120,
): SourceContextItem[] {
  return sources.map((source) => ({
    name: source.name,
    excerpt: extractExcerpt(text, source.name, radius),
  }));
}

function extractExcerpt(text: string, name: string, radius: number): string {
  const idx = text.toLowerCase().indexOf(name.toLowerCase());
  if (idx === -1) return text.slice(0, Math.min(text.length, radius * 2));
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + name.length + radius);
  return text.slice(start, end).trim();
}
