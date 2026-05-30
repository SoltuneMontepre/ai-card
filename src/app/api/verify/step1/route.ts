import { NextRequest } from "next/server";
import { analyzeStep1 } from "@/lib/gemini";
import {
  GeminiRateLimitError,
  geminiRateLimitResponse,
  getRateLimitKeyFromRequest,
} from "@/lib/gemini-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }
    const result = await analyzeStep1(text, getRateLimitKeyFromRequest(request));
    return Response.json({ ...result, loading: false });
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      return geminiRateLimitResponse(err);
    }
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[verify/step1]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
