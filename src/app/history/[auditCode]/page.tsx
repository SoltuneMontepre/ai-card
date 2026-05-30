import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  Shield, ArrowLeft, CheckCircle2, AlertTriangle,
  Check, Award, ExternalLink,
} from "lucide-react";
import type { Metadata } from "next";
import Animated from "@/app/components/Animated";
import ThemeToggle from "@/app/components/ThemeToggle";
import { step4HasDataYear, step4DataYear } from "@/lib/step4-display";

// ── Types ─────────────────────────────────────────────────────────────────────

type StepData = Record<string, unknown>;

async function getAudit(auditCode: string, userId: string) {
  return prisma.auditSession.findFirst({
    where: { auditCode, userId },          // user can only see their own audits
    select: {
      id: true,
      auditCode: true,
      verifyUrl: true,
      trustScore: true,
      inputText: true,
      completedAt: true,
      createdAt: true,
      stepResults: {
        orderBy: { stepNumber: "asc" },
        select: { stepNumber: true, data: true },
      },
    },
  });
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ auditCode: string }>;
}): Promise<Metadata> {
  const { auditCode } = await params;
  return {
    title: `Kiểm chứng #${auditCode.slice(-8).toUpperCase()} — AI Verification Card`,
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
  if (score === null) return { label: "—", cls: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" };
  if (score >= 70) return { label: "Độ tin cậy cao", cls: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800" };
  if (score >= 40) return { label: "Cần xem xét", cls: "text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-800" };
  return { label: "Cảnh báo: Rủi ro cao", cls: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800" };
}

function isWarning(step: { stepNumber: number; data: StepData }) {
  const d = step.data;
  return (
    (step.stepNumber === 3 && !!d.issueDetected) ||
    (step.stepNumber === 5 && Number(d.hallucinationRisk ?? 0) > 30)
  );
}

function StepCard({ step }: { step: { stepNumber: number; data: StepData } }) {
  const d = step.data;
  const warn = isWarning(step);

  let body: React.ReactNode = null;

  switch (step.stepNumber) {
    case 1: {
      const sources = (d.sources as Array<Record<string, unknown>>) ?? [];
      const overview = d.referenceOverview as Record<string, unknown> | undefined;
      body = (
        <Animated className="space-y-2">
          <p className="text-sm text-slate-500">
            {d.citationsFound as number} trích dẫn phát hiện
          </p>
          {overview?.summary && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="font-semibold text-blue-800">Reference rubric</span>
                <span className="font-mono text-xs font-bold text-blue-700">
                  {overview.reliabilityGrade as string} · {overview.reliabilityScore as number}/100
                </span>
              </div>
              <p className="text-xs text-slate-600">{overview.summary as string}</p>
            </div>
          )}
          {sources.map((s, i) => (
            <div
              key={i}
              className={`px-3 py-2 rounded-lg text-sm ${
                s.color === "green"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-yellow-50 border border-yellow-200 text-yellow-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{s.name as string}</span>
                <span className="font-mono font-bold text-xs ml-2">
                  {(s.reliabilityGrade as string | undefined) ?? "N/A"} · {(s.reliabilityScore as number | undefined) ?? (s.matchScore as number)}%
                </span>
              </div>
              {s.reason && (
                <p className="text-xs text-slate-600 mt-1">
                  Tier {(s.tier as string | undefined) ?? "?"}: {s.reason as string}
                </p>
              )}
            </div>
          ))}
          {sources.length === 0 && (
            <p className="text-sm text-slate-400 italic">Không tìm thấy trích dẫn</p>
          )}
        </Animated>
      );
      break;
    }
    case 2: {
      const score = d.logicScore as number;
      body = (
        <div>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl font-bold text-blue-600">{score}%</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-slate-600">{d.summary as string}</p>
        </div>
      );
      break;
    }
    case 3: {
      const evidence = (d.evidence as Array<Record<string, unknown>>) ?? [];
      body = (
        <Animated className="space-y-3">
          {evidence.map((ev, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border ${
                ev.color === "green"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <p className="text-xs text-slate-500 mb-1">Dữ kiện:</p>
              <p className="text-sm font-medium text-slate-800 italic mb-1.5">
                &ldquo;{ev.text as string}&rdquo;
              </p>
              <p
                className={`text-sm ${
                  ev.color === "green" ? "text-emerald-700" : "text-yellow-700"
                }`}
              >
                {ev.result as string}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Match: {ev.matchRate as number}%
              </p>
            </div>
          ))}
        </Animated>
      );
      break;
    }
    case 4:
      body = step4HasDataYear(d) ? (
        <div>
          <div className="flex items-center gap-8 mb-3">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">Năm hiện tại</p>
              <p className="text-3xl font-bold text-purple-600">2026</p>
            </div>
            <div className="text-slate-300 text-2xl">→</div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">Năm dữ liệu</p>
              <p className="text-3xl font-bold text-pink-600">
                {step4DataYear(d)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">Cách đây</p>
              <p className="text-2xl font-bold text-slate-600">
                {2026 - step4DataYear(d)} năm
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600">{d.freshness as string}</p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
            Không có mốc thời gian trong văn bản
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{d.freshness as string}</p>
        </div>
      );
      break;
    case 5: {
      const risk = d.hallucinationRisk as number;
      const riskColor =
        risk < 30 ? "text-emerald-600" : risk < 60 ? "text-yellow-600" : "text-red-600";
      const barColor =
        risk < 30 ? "bg-emerald-500" : risk < 60 ? "bg-yellow-500" : "bg-red-500";
      body = (
        <div>
          <div className="flex items-center gap-4 mb-3">
            <span className={`text-4xl font-bold ${riskColor}`}>{risk}%</span>
            <div className="flex-1 bg-slate-100 rounded-full h-3">
              <div
                className={`${barColor} h-3 rounded-full transition-all`}
                style={{ width: `${risk}%` }}
              />
            </div>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                risk < 30
                  ? "bg-emerald-100 text-emerald-700"
                  : risk < 60
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {risk < 30 ? "Low" : risk < 60 ? "Medium" : "High"} Risk
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {risk < 30
              ? "Rủi ro ảo giác thấp — nội dung có thể tin cậy."
              : risk < 60
                ? "Rủi ro ảo giác trung bình — nên kiểm tra lại một số điểm."
                : "Rủi ro ảo giác cao — cần xác minh cẩn thận trước khi sử dụng."}
          </p>
        </div>
      );
      break;
    }
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border-2 shadow-sm overflow-hidden ${
        warn ? "border-yellow-300" : "border-slate-100"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-5 py-3 border-b ${
          warn ? "border-yellow-100 bg-yellow-50" : "border-slate-100 bg-slate-50"
        }`}
      >
        {warn ? (
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        )}
        <h3 className="font-semibold text-slate-800 text-sm">
          Bước {step.stepNumber} — {STEP_LABELS[step.stepNumber - 1]}
        </h3>
      </div>
      <div className="p-5">{body}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ auditCode: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/");

  const { auditCode } = await params;
  const audit = await getAudit(auditCode, user.id);
  if (!audit) notFound();

  const shortCode = audit.auditCode.slice(-8).toUpperCase();
  const date = new Date(audit.completedAt ?? audit.createdAt).toLocaleDateString("vi-VN");
  const band = trustBand(audit.trustScore);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/history"
            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Lịch sử
          </Link>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">AI Verification Card</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <span className="font-mono text-sm text-slate-400">#{shortCode}</span>
            {audit.verifyUrl && (
              <a
                href={audit.verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Xem thẻ công khai
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-3 gap-8">
          {/* Left: summary panel */}
          <div className="space-y-5">
            {/* Trust score card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-yellow-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                <Shield className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full mb-3">
                <Award className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700">
                  VERIFIED
                </span>
              </div>
              <div
                className={`text-5xl font-bold mb-1 ${
                  (audit.trustScore ?? 0) >= 70
                    ? "text-emerald-600"
                    : (audit.trustScore ?? 0) >= 40
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {audit.trustScore ?? "?"}%
              </div>
              <div
                className={`text-xs font-semibold px-3 py-1 rounded-full border mt-1 ${band.cls}`}
              >
                {band.label}
              </div>
            </div>

            {/* Meta info */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Audit ID</span>
                <span className="font-mono font-semibold text-slate-800">
                  #{shortCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày kiểm chứng</span>
                <span className="font-semibold text-slate-800">{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số bước hoàn thành</span>
                <span className="font-semibold text-slate-800">
                  {audit.stepResults.length}/5
                </span>
              </div>
            </div>

            {/* Step overview chips */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Tổng quan bước
              </p>
              <Animated className="space-y-2">
                {audit.stepResults.map((step) => (
                  <div key={step.stepNumber} className="flex items-center gap-2.5">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isWarning(step as { stepNumber: number; data: StepData })
                          ? "bg-yellow-100"
                          : "bg-emerald-100"
                      }`}
                    >
                      {isWarning(step as { stepNumber: number; data: StepData }) ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <span className="text-xs text-slate-600">
                      {STEP_LABELS[step.stepNumber - 1]}
                    </span>
                  </div>
                ))}
              </Animated>
            </div>

            {/* Original text snippet */}
            {audit.inputText && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Văn bản đã kiểm chứng
                </p>
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-6">
                  {audit.inputText}
                </p>
              </div>
            )}
          </div>

          {/* Right: step detail cards */}
          <div className="col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">
              Chi tiết từng bước kiểm chứng
            </h2>
            {audit.stepResults.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-12 text-center">
                <p className="text-slate-400">
                  Không có dữ liệu chi tiết cho phiên kiểm chứng này.
                </p>
              </div>
            ) : (
              <Animated className="space-y-4">
                {audit.stepResults.map((step) => (
                  <StepCard
                    key={step.stepNumber}
                    step={step as { stepNumber: number; data: StepData }}
                  />
                ))}
              </Animated>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
