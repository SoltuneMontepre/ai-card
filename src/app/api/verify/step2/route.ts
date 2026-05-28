import { NextRequest } from "next/server";
import { analyzeStep2, type StepContext } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { text, context = {} } = await request.json() as { text: string; context?: StepContext };
    if (!text?.trim()) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }
    const result = await analyzeStep2(text, context);
    return Response.json({ ...result, loading: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[verify/step2]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
