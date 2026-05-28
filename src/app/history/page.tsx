import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, CheckCircle2, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch sử kiểm chứng — AI Verification Card",
};

function trustBadge(score: number | null) {
  if (score === null) return { cls: "bg-slate-100 text-slate-600", label: "?" };
  if (score >= 70) return { cls: "bg-emerald-100 text-emerald-700", label: `${score}%` };
  if (score >= 40) return { cls: "bg-yellow-100 text-yellow-700", label: `${score}%` };
  return { cls: "bg-red-100 text-red-700", label: `${score}%` };
}

const STEP_LABELS = ["Nguồn", "Logic", "Thực tiễn", "Cập nhật", "Ảo giác"];

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) redirect("/");

  const audits = await prisma.auditSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      auditCode: true,
      trustScore: true,
      completedAt: true,
      createdAt: true,
      stepResults: {
        orderBy: { stepNumber: "asc" },
        select: { stepNumber: true, data: true },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900">AI Verification Card</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 text-slate-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              Lịch sử kiểm chứng · {audits.length} phiên
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {audits.length === 0 ? (
          <div className="text-center py-24">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 text-lg font-medium">
              Chưa có phiên kiểm chứng nào
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Bắt đầu kiểm chứng từ{" "}
              <Link href="/" className="text-emerald-500 hover:text-emerald-600">
                trang chủ
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audits.map((audit) => {
              const shortCode = audit.auditCode.slice(-8).toUpperCase();
              const date = new Date(
                audit.completedAt ?? audit.createdAt,
              ).toLocaleDateString("vi-VN");
              const badge = trustBadge(audit.trustScore);
              const hasWarning = audit.stepResults.some(
                (s) =>
                  (s.stepNumber === 3 &&
                    !!(s.data as Record<string, unknown>).issueDetected) ||
                  (s.stepNumber === 5 &&
                    Number(
                      (s.data as Record<string, unknown>).hallucinationRisk ?? 0,
                    ) > 30),
              );

              return (
                <Link
                  key={audit.auditCode}
                  href={`/history/${audit.auditCode}`}
                  className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all p-5"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-mono font-bold text-slate-800 text-sm">
                        #{shortCode}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{date}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-sm font-bold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {hasWarning && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  {/* Step chips */}
                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    {audit.stepResults.map((step) => {
                      const warn =
                        (step.stepNumber === 3 &&
                          !!(step.data as Record<string, unknown>).issueDetected) ||
                        (step.stepNumber === 5 &&
                          Number(
                            (step.data as Record<string, unknown>)
                              .hallucinationRisk ?? 0,
                          ) > 30);
                      return (
                        <div
                          key={step.stepNumber}
                          title={STEP_LABELS[step.stepNumber - 1]}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            warn
                              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {warn ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {STEP_LABELS[step.stepNumber - 1]}
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-end text-xs text-slate-400 group-hover:text-emerald-600 transition-colors font-medium">
                    Xem chi tiết
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
