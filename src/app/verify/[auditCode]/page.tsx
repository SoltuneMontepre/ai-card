import { notFound } from "next/navigation";
import { Shield, Award, CheckCircle2, AlertTriangle, Check, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { getPublicAudit } from "@/lib/audit-public";
import Animated from "@/app/components/Animated";
import { step4HasDataYear, step4DataYear } from "@/lib/step4-display";
import {
  getSourceLinkFromRecord,
  getVerificationLabelFromRecord,
} from "@/lib/source-display";

// ── Types ─────────────────────────────────────────────────────────────────────

type StepResult = NonNullable<
  Awaited<ReturnType<typeof getPublicAudit>>
>["stepResults"][number];

function asRecord(value: StepResult["data"]): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ auditCode: string }>;
}): Promise<Metadata> {
  const { auditCode } = await params;
  const audit = await getPublicAudit(auditCode);
  const score = audit?.trustScore ?? "?";
  return {
    title: `Xác minh #${auditCode.slice(-8).toUpperCase()} · ${score}% — AI Verification Card`,
    description: `Kết quả kiểm chứng học thuật: Trust Score ${score}%. Được xác thực bởi AI Verification Card.`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STEP_LABELS = [
  "Tự động quét Nguồn gốc",
  "Phân tích Cấu trúc Logic",
  "Đối chiếu Thực tiễn Tự động",
  "Kiểm tra Tính cập nhật",
  "Đánh giá Ảo giác AI",
];

function trustBand(score: number | null) {
  if (score === null) return { label: "Chưa chấm điểm", color: "text-slate-400", border: "border-slate-600", bg: "bg-slate-800/50" };
  if (score >= 70) return { label: "Độ tin cậy cao", color: "text-emerald-400", border: "border-emerald-500", bg: "bg-emerald-900/30" };
  if (score >= 40) return { label: "Cần xem xét thêm", color: "text-yellow-400", border: "border-yellow-500", bg: "bg-yellow-900/30" };
  return { label: "Cảnh báo: Rủi ro cao", color: "text-red-400", border: "border-red-500", bg: "bg-red-900/30" };
}

function isWarningStep(step: StepResult): boolean {
  const d = asRecord(step.data);
  return (
    (step.stepNumber === 3 && !!d.issueDetected) ||
    (step.stepNumber === 5 && Number(d.hallucinationRisk ?? 0) > 30)
  );
}

// Detailed human-readable content per step
function StepDetail({ step }: { step: StepResult }) {
  const d = asRecord(step.data);
  const warning = isWarningStep(step);

  let content: React.ReactNode;

  switch (step.stepNumber) {
    case 1: {
      const sources = (d.sources as Array<Record<string, unknown>>) ?? [];
      const overview = d.referenceOverview as Record<string, unknown> | undefined;
      const overviewSummary =
        typeof overview?.summary === "string" ? overview.summary : "";
      const overviewGrade =
        typeof overview?.reliabilityGrade === "string"
          ? overview.reliabilityGrade
          : "N/A";
      const overviewScore =
        typeof overview?.reliabilityScore === "number"
          ? overview.reliabilityScore
          : 0;
      content = (
        <Animated className="space-y-2">
          <p className="text-white/60 text-xs">
            {d.citationsFound as number} trích dẫn phát hiện
          </p>
          {overviewSummary && (
            <div className="rounded-lg bg-blue-900/30 border border-blue-500/30 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-blue-200 font-semibold">Tổng quan rubric tham chiếu</span>
                <span className="text-blue-100 font-mono text-xs">
                  {overviewGrade} · {overviewScore}/100
                </span>
              </div>
              <p className="text-white/70 text-xs">{overviewSummary}</p>
            </div>
          )}
          {sources.map((s, i) => {
            const link = getSourceLinkFromRecord(s);
            return (
            <div
              key={i}
              className={`py-2 px-3 rounded-lg text-sm ${
                s.color === "green"
                  ? "bg-emerald-900/40 text-emerald-300"
                  : "bg-yellow-900/40 text-yellow-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{s.name as string}</span>
                <span className="font-mono font-bold text-xs ml-2">
                  {(s.reliabilityGrade as string | undefined) ?? "N/A"} · {(s.reliabilityScore as number | undefined) ?? (s.matchScore as number)}%
                </span>
              </div>
              <p className="text-white/50 text-xs mt-1">
                {getVerificationLabelFromRecord(s)}
              </p>
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-300 underline break-all block mt-1"
                >
                  {link}
                </a>
              )}
              {typeof s.searchNote === "string" && s.searchNote.length > 0 && (
                <p className="text-white/40 text-xs mt-1">{s.searchNote}</p>
              )}
              {typeof s.reason === "string" && s.reason.length > 0 && (
                <p className="text-white/60 text-xs mt-1">
                  Bậc {(s.tier as string | undefined) ?? "?"}: {s.reason}
                </p>
              )}
            </div>
          );
          })}
        </Animated>
      );
      break;
    }
    case 2: {
      const score = d.logicScore as number;
      content = (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl font-bold text-blue-400">{score}%</div>
            <div className="flex-1 bg-white/10 rounded-full h-2">
              <div
                className="bg-blue-400 h-2 rounded-full"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
          <p className="text-white/70 text-sm">{d.summary as string}</p>
        </div>
      );
      break;
    }
    case 3: {
      const evidence = (d.evidence as Array<Record<string, unknown>>) ?? [];
      content = (
        <Animated className="space-y-2">
          {evidence.map((ev, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg text-sm ${
                ev.color === "green"
                  ? "bg-emerald-900/40"
                  : "bg-yellow-900/40"
              }`}
            >
              <p className="text-white/60 text-xs mb-1">Dữ kiện:</p>
              <p className="text-white/90 italic mb-1.5">
                &ldquo;{String(ev.text ?? "").slice(0, 100)}&hellip;&rdquo;
              </p>
              <p
                className={
                  ev.color === "green" ? "text-emerald-300" : "text-yellow-300"
                }
              >
                {ev.result as string}
              </p>
              <p className="text-white/40 text-xs mt-1">
                Match: {ev.matchRate as number}%
              </p>
            </div>
          ))}
        </Animated>
      );
      break;
    }
    case 4: {
      const hasYear = step4HasDataYear(d);
      content = hasYear ? (
        <div>
          <div className="flex items-center gap-6 mb-2">
            <div className="text-center">
              <p className="text-white/40 text-xs">Năm hiện tại</p>
              <p className="text-2xl font-bold text-purple-400">2026</p>
            </div>
            <div className="text-white/30 text-xl">→</div>
            <div className="text-center">
              <p className="text-white/40 text-xs">Năm dữ liệu</p>
              <p className="text-2xl font-bold text-pink-400">
                {step4DataYear(d)}
              </p>
            </div>
          </div>
          <p className="text-white/70 text-sm">{d.freshness as string}</p>
        </div>
      ) : (
        <div>
          <p className="text-white/90 text-sm font-medium mb-2">
            Không có mốc thời gian trong văn bản
          </p>
          <p className="text-white/70 text-sm">{d.freshness as string}</p>
        </div>
      );
      break;
    }
    case 5: {
      const risk = d.hallucinationRisk as number;
      const riskColor =
        risk < 30 ? "text-emerald-400" : risk < 60 ? "text-yellow-400" : "text-red-400";
      content = (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`text-3xl font-bold ${riskColor}`}>{risk}%</div>
            <div className="flex-1 bg-white/10 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  risk < 30 ? "bg-emerald-400" : risk < 60 ? "bg-yellow-400" : "bg-red-400"
                }`}
                style={{ width: `${risk}%` }}
              />
            </div>
          </div>
          <p className="text-white/70 text-sm">
            {risk < 30
              ? "Rủi ro ảo giác thấp — nội dung có thể tin cậy"
              : risk < 60
                ? "Rủi ro ảo giác trung bình — cần kiểm tra lại một số điểm"
                : "Rủi ro ảo giác cao — cần xác minh cẩn thận"}
          </p>
        </div>
      );
      break;
    }
    default:
      content = null;
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        warning ? "border-yellow-600/40 bg-yellow-900/20" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {warning ? (
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        )}
        <h3 className="font-semibold text-white/90 text-sm">
          Bước {step.stepNumber} — {STEP_LABELS[step.stepNumber - 1]}
        </h3>
      </div>
      {content}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ auditCode: string }>;
}) {
  const { auditCode } = await params;
  const audit = await getPublicAudit(auditCode);
  if (!audit) notFound();

  const shortCode = audit.auditCode.slice(-8).toUpperCase();
  const date = new Date(audit.completedAt ?? audit.createdAt).toLocaleDateString("vi-VN");
  const band = trustBand(audit.trustScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Header bar */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-white text-sm">AI Verification Card</span>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_SITE_URL ?? "/"}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
          >
            Kiểm chứng văn bản của bạn
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Certificate card */}
        <div className="relative bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-2xl shadow-2xl overflow-hidden border-2 border-emerald-500/60">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
            <div className="absolute top-0 left-0 w-40 h-40 border-l-2 border-t-2 border-emerald-400" />
            <div className="absolute bottom-0 right-0 w-40 h-40 border-r-2 border-b-2 border-emerald-400" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border border-emerald-400 rounded-full" />
          </div>

          <div className="relative z-10 p-8 flex flex-col items-center text-center">
            {/* Verified badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 border border-emerald-400/60 rounded-full mb-6">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 font-semibold text-xs tracking-wider">
                VERIFIED CONTENT
              </span>
            </div>

            {/* Shield icon */}
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-yellow-500 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/40">
              <Shield className="w-14 h-14 text-white" strokeWidth={2.5} />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">
              AI Verification Card
            </h1>
            <p className="text-emerald-400 text-sm mb-1">
              Đã kiểm chứng bởi Khung MLN111
            </p>
            <p className="text-white/50 text-xs mb-6">Nhóm SPST086</p>

            {/* Trust score */}
            <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl border-2 ${band.border} ${band.bg} mb-6`}>
              <span className={`text-4xl font-bold ${band.color}`}>
                {audit.trustScore ?? "?"}%
              </span>
              <div className="text-left">
                <p className="text-white/40 text-xs">Trust Score</p>
                <p className={`text-sm font-semibold ${band.color}`}>
                  {band.label}
                </p>
              </div>
            </div>

            {/* Quick step overview */}
            {audit.stepResults.length > 0 && (
              <Animated className="flex gap-3 mb-6">
                {audit.stepResults.map((step) => (
                  <div
                    key={step.stepNumber}
                    title={STEP_LABELS[step.stepNumber - 1]}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isWarningStep(step)
                        ? "bg-yellow-900/60 border border-yellow-500/60"
                        : "bg-emerald-900/60 border border-emerald-500/60"
                    }`}
                  >
                    {isWarningStep(step) ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                ))}
              </Animated>
            )}

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent mb-5" />

            {/* Footer row */}
            <div className="flex items-end justify-between w-full text-sm">
              <div className="text-left">
                <p className="text-white/40 text-xs mb-0.5">Audit ID</p>
                <p className="text-white font-mono font-bold">#{shortCode}</p>
              </div>
              <div className="text-center">
                <p className="text-white/40 text-xs mb-0.5">Ngày</p>
                <p className="text-white font-semibold">{date}</p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs mb-0.5">Xác thực</p>
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold justify-end">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_80px_rgba(16,185,129,0.12)] pointer-events-none" />
        </div>

        {/* Step-by-step details */}
        {audit.stepResults.length > 0 && (
          <div>
            <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3 px-1">
              Chi tiết kiểm chứng
            </h2>
            <Animated className="space-y-3">
              {audit.stepResults.map((step) => (
                <StepDetail key={step.stepNumber} step={step} />
              ))}
            </Animated>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-white/25 text-xs pb-4">
          Được tạo bởi{" "}
          <a
            href={process.env.NEXT_PUBLIC_SITE_URL ?? "/"}
            className="text-emerald-500/60 hover:text-emerald-400 transition-colors"
          >
            AI Verification Card
          </a>{" "}
          · Đồ án thực hành sáng tạo MLN111 · Mã đề tài SPST086
        </p>
      </div>
    </div>
  );
}
