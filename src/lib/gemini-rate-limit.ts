export const GEMINI_RATE_LIMIT_MS = 5000;

export class GeminiRateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(
      `Vui lòng đợi ${Math.ceil(retryAfterMs / 1000)} giây trước khi gửi yêu cầu tiếp theo.`,
    );
    this.name = "GeminiRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

const lastCallByKey = new Map<string, number>();

/** Throws if the client called Gemini too recently. Reserves the slot on success. */
export function acquireGeminiSlot(key: string): void {
  const now = Date.now();
  const last = lastCallByKey.get(key) ?? 0;
  const wait = GEMINI_RATE_LIMIT_MS - (now - last);

  if (wait > 0) {
    throw new GeminiRateLimitError(wait);
  }

  lastCallByKey.set(key, now);

  if (lastCallByKey.size > 1000) {
    const cutoff = now - 3600_000;
    for (const [k, t] of lastCallByKey) {
      if (t < cutoff) lastCallByKey.delete(k);
    }
  }
}

export function getRateLimitKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "anonymous";
}

export function geminiRateLimitResponse(err: GeminiRateLimitError): Response {
  return Response.json(
    { error: err.message, retryAfterMs: err.retryAfterMs },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(err.retryAfterMs / 1000)),
      },
    },
  );
}
