import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, CheckCircle2, AlertTriangle, Clock, ArrowRight, ArrowLeft, Home } from "lucide-react";
import type { Metadata } from "next";
import Animated from "@/app/components/Animated";
import ThemeToggle from "@/app/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Lịch sử kiểm chứng — AI Verification Card",
};

function trustBadge(score: number | null) {
  if (score === null) return { cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", label: "?" };
  if (score >= 70) return { cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", label: `${score}%` };
  if (score >= 40) return { cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300", label: `${score}%` };
  return { cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", label: `${score}%` };
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 overflow-x-hidden">
      <header className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-40 safe-top">
        <div className="page-container-narrow py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="hidden sm:inline font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                AI Verification Card
              </span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="page-container-narrow py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Lịch sử kiểm chứng
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            {audits.length === 0
              ? "Các phiên kiểm chứng của bạn sẽ hiển thị tại đây."
              : `${audits.length} phiên đã lưu — chọn một phiên để xem chi tiết.`}
          </p>
        </div>

        {audits.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-medium">
              Chưa có phiên kiểm chứng nào
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2 max-w-sm mx-auto">
              Bắt đầu kiểm chứng từ trang chủ để tạo phiên đầu tiên.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              <Home className="w-4 h-4" />
              Về trang chủ
            </Link>
          </div>
        ) : (
          <Animated className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all p-4 sm:p-5 min-w-0"
                >
                  <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                        #{shortCode}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{date}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 sm:px-2.5 py-1 rounded-full text-xs sm:text-sm font-bold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {hasWarning && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                      )}
                    </div>
                  </div>

                  <Animated className="flex gap-1.5 mb-4 flex-wrap">
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
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium max-w-full ${
                            warn
                              ? "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          }`}
                        >
                          {warn ? (
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                          )}
                          <span className="truncate">{STEP_LABELS[step.stepNumber - 1]}</span>
                        </div>
                      );
                    })}
                  </Animated>

                  {/* CTA */}
                  <div className="flex items-center justify-end text-xs text-slate-400 group-hover:text-emerald-600 transition-colors font-medium">
                    Xem chi tiết
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </Animated>
        )}
      </div>
    </div>
  );
}
