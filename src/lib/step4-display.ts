import type { Step4Result } from "./gemini";

/** Supports new `hasDataYear` field and older saved audits that only have `dataYear`. */
export function step4HasDataYear(
  data: Step4Result | Record<string, unknown>,
): boolean {
  if (typeof data.hasDataYear === "boolean") return data.hasDataYear;
  return typeof data.dataYear === "number" && data.dataYear > 0;
}

export function step4DataYear(
  data: Step4Result | Record<string, unknown>,
): number {
  return typeof data.dataYear === "number" ? data.dataYear : 0;
}
