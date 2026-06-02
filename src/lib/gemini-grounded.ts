import { GoogleGenAI } from "@google/genai";
import { acquireGeminiSlot } from "./gemini-rate-limit";
import { withGeminiKeyPool } from "./gemini-keys";
import { applySkill } from "./skills";
import type {
  ContentStatus,
  Source,
  VerificationStatus,
} from "./gemini";

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

export interface SourceContentVerificationItem {
  name: string;
  contentStatus: ContentStatus;
  contentNote: string;
}

export interface SourceContentValidationResult {
  contentVerifications: SourceContentVerificationItem[];
}

interface ContentValidationResponse {
  contentVerifications?: SourceContentVerificationItem[];
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

function parseContentValidationResponse(
  raw: string,
): SourceContentVerificationItem[] {
  try {
    const parsed = JSON.parse(extractJson(raw)) as ContentValidationResponse;
    return parsed.contentVerifications ?? [];
  } catch {
    return [];
  }
}

/** Collects all URLs to HTTP-probe after discovery. */
export function collectUrlsForProbe(
  textUrls: string[],
  verification: SourceVerificationResult,
  sources: Array<{ citedUrl?: string | null }>,
): string[] {
  const set = new Set<string>(textUrls);
  for (const v of verification.verifications) {
    if (v.discoveredUrl) set.add(v.discoveredUrl);
  }
  for (const g of verification.groundingUrls) {
    if (g.uri) set.add(g.uri);
  }
  for (const s of sources) {
    if (s.citedUrl) set.add(s.citedUrl);
  }
  return [...set];
}

function buildUrlReachabilityPayload(
  urls: string[],
  urlChecks: Map<string, "reachable" | "unreachable">,
): string {
  const entries = urls.map((url) => ({
    url,
    reachability: urlChecks.get(url) ?? "unreachable",
  }));
  return JSON.stringify(entries, null, 2);
}

function buildUrlDiscoveryPayload(
  sources: Source[],
  verification: SourceVerificationResult,
): string {
  const byName = new Map(
    verification.verifications.map((v) => [normalizeName(v.name), v]),
  );
  const payload = sources.map((s) => {
    const v = byName.get(normalizeName(s.name));
    return {
      name: s.name,
      citedUrl: s.citedUrl ?? null,
      discoveredUrl: v?.discoveredUrl ?? null,
      verificationStatus: v?.verificationStatus ?? "not_found",
      searchNote: v?.searchNote ?? "",
    };
  });
  return JSON.stringify(payload, null, 2);
}

/** Uses Gemini + Google Search to check whether excerpts align with web evidence. */
export async function validateSourceContentWithSearch(
  text: string,
  sourceContext: SourceContextItem[],
  sources: Source[],
  verification: SourceVerificationResult,
  urlsToProbe: string[],
  urlChecks: Map<string, "reachable" | "unreachable">,
  rateLimitKey: string,
): Promise<SourceContentValidationResult> {
  if (sourceContext.length === 0) {
    return { contentVerifications: [] };
  }

  acquireGeminiSlot(rateLimitKey);

  const prompt = applySkill("step1-source-content-validation.md", {
    text,
    sources: JSON.stringify(
      sourceContext.map((s) => s.name),
      null,
      2,
    ),
    source_context: JSON.stringify(sourceContext, null, 2),
    url_reachability: buildUrlReachabilityPayload(urlsToProbe, urlChecks),
    url_discovery: buildUrlDiscoveryPayload(sources, verification),
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
    const contentVerifications = parseContentValidationResponse(raw);
    return { contentVerifications };
  });
}

function isUrlReachable(
  url: string | null | undefined,
  urlChecks: Map<string, "reachable" | "unreachable">,
): boolean {
  if (!url) return false;
  return urlChecks.get(url) === "reachable";
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

function applyUrlReachability(
  urlInText: string | null,
  discoveredUrl: string | null,
  verificationStatus: VerificationStatus,
  searchNote: string,
  urlChecks: Map<string, "reachable" | "unreachable">,
  searchStatus: VerificationStatus | undefined,
): {
  discoveredUrl: string | null;
  verificationStatus: VerificationStatus;
  searchNote: string;
} {
  const citedReachable = isUrlReachable(urlInText, urlChecks);
  const discoveredReachable = isUrlReachable(discoveredUrl, urlChecks);

  if (urlInText && citedReachable) {
    return {
      discoveredUrl: discoveredUrl ?? urlInText,
      verificationStatus: "in_text",
      searchNote:
        searchNote || "Link có trong văn bản và phản hồi hợp lệ.",
    };
  }

  if (
    urlInText &&
    !citedReachable &&
    discoveredUrl &&
    discoveredReachable &&
    discoveredUrl !== urlInText
  ) {
    const status =
      searchStatus === "verified" ? "verified" : "partial";
    return {
      discoveredUrl,
      verificationStatus: status,
      searchNote:
        searchNote ||
        "Link trong văn bản không còn hoạt động; tìm thấy trang thay thế.",
    };
  }

  if (urlInText && !citedReachable) {
    if (discoveredReachable && discoveredUrl) {
      const status =
        searchStatus === "verified" ? "verified" : "partial";
      return {
        discoveredUrl,
        verificationStatus: status,
        searchNote:
          searchNote ||
          "Link trong văn bản không còn hoạt động; tìm thấy trang thay thế.",
      };
    }
    return {
      discoveredUrl: discoveredUrl ?? urlInText,
      verificationStatus: "unreachable",
      searchNote:
        searchNote ||
        "Link có trong văn bản nhưng không truy cập được.",
    };
  }

  if (discoveredUrl && !discoveredReachable) {
    return {
      discoveredUrl,
      verificationStatus: "unreachable",
      searchNote:
        searchNote || "Link không truy cập được (kiểm tra HTTP).",
    };
  }

  if (discoveredUrl && discoveredReachable) {
    return { discoveredUrl, verificationStatus, searchNote };
  }

  return { discoveredUrl, verificationStatus, searchNote };
}

function applyContentScoring(
  matchScore: number,
  verificationStatus: VerificationStatus,
  contentStatus: ContentStatus,
  hasLiveUrl: boolean,
): { matchScore: number; status: Source["status"] } {
  let score = matchScore;

  if (contentStatus === "mismatch") {
    score = Math.min(score, 40);
  } else if (contentStatus === "aligned" && hasLiveUrl) {
    score = Math.max(score, 72);
  } else if (contentStatus === "partial") {
    score = Math.max(score, 55);
  }

  if (
    verificationStatus === "not_found" ||
    verificationStatus === "unreachable"
  ) {
    score = Math.min(score, 45);
  } else if (
    verificationStatus === "verified" ||
    verificationStatus === "in_text"
  ) {
    score = Math.max(score, 72);
  } else if (verificationStatus === "partial") {
    score = Math.max(score, 60);
  }

  if (contentStatus === "mismatch") {
    return { matchScore: score, status: "broken" };
  }

  const status: Source["status"] =
    verificationStatus === "verified" ||
    verificationStatus === "in_text" ||
    verificationStatus === "partial"
      ? "active"
      : "broken";

  return { matchScore: score, status };
}

/** Merges detection, URL discovery, HTTP probes, and content alignment. */
export function mergeSourceVerifications(
  sources: Source[],
  verification: SourceVerificationResult,
  urlChecks: Map<string, "reachable" | "unreachable">,
  textUrls: string[],
  searchFailed = false,
  content: SourceContentValidationResult = { contentVerifications: [] },
  contentFailed = false,
): Source[] {
  if (searchFailed) {
    return sources.map((source) => ({
      ...source,
      verificationStatus: "search_failed" as VerificationStatus,
      searchNote:
        "Không thể tìm kiếm trên web do lỗi API. Vui lòng thử lại.",
      contentStatus: "unknown" as ContentStatus,
      contentNote: contentFailed
        ? "Không thể kiểm tra nội dung do lỗi API."
        : "",
    }));
  }

  const byName = new Map(
    verification.verifications.map((v) => [normalizeName(v.name), v]),
  );
  const contentByName = new Map(
    content.contentVerifications.map((c) => [normalizeName(c.name), c]),
  );

  const merged: Source[] = sources.map((source) => {
    const v = byName.get(normalizeName(source.name));
    let discoveredUrl = v?.discoveredUrl ?? null;
    const urlInText =
      source.citedUrl ??
      findUrlInTextForSource(source.name, textUrls);
    let verificationStatus: VerificationStatus =
      v?.verificationStatus ?? "not_found";
    let searchNote = v?.searchNote ?? "";

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

    const urlResult = applyUrlReachability(
      urlInText,
      discoveredUrl,
      verificationStatus,
      searchNote,
      urlChecks,
      v?.verificationStatus,
    );
    discoveredUrl = urlResult.discoveredUrl;
    verificationStatus = urlResult.verificationStatus;
    searchNote = urlResult.searchNote;

    if (
      verificationStatus === "not_found" &&
      !discoveredUrl &&
      !urlInText
    ) {
      searchNote = searchNote || "Không tìm thấy link phù hợp trên web.";
    }

    const contentItem = contentByName.get(normalizeName(source.name));
    const contentStatus: ContentStatus = contentFailed
      ? "unknown"
      : (contentItem?.contentStatus ?? "unknown");
    const contentNote = contentFailed
      ? "Không thể kiểm tra nội dung do lỗi API."
      : (contentItem?.contentNote ?? "");

    const hasLiveUrl =
      isUrlReachable(urlInText, urlChecks) ||
      isUrlReachable(discoveredUrl, urlChecks);

    const { matchScore, status } = applyContentScoring(
      source.matchScore,
      verificationStatus,
      contentStatus,
      hasLiveUrl,
    );

    return {
      ...source,
      citedUrl: source.citedUrl ?? urlInText ?? null,
      status,
      matchScore,
      color: matchScore >= 60 ? "green" : "yellow",
      discoveredUrl,
      urlInText,
      verificationStatus,
      searchNote,
      contentStatus,
      contentNote,
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
      citedUrl: url,
      discoveredUrl: url,
      urlInText: url,
      verificationStatus: reachable ? "in_text" : "unreachable",
      searchNote: reachable
        ? "Link có trong văn bản và phản hồi hợp lệ."
        : "Link có trong văn bản nhưng không truy cập được.",
      contentStatus: "unknown",
      contentNote: "",
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
