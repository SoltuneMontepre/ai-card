"use client";

import {
  Shield,
  BookOpen,
  Clock,
  User,
  X,
  CheckCircle,
  LogIn,
  LogOut,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface InteractiveHeaderProps {
  onLogoClick: () => void;
  onLoginClick: () => void;
}

interface StepResult {
  stepNumber: number;
  data: Record<string, unknown>;
}

interface AuditEntry {
  id: string;
  auditCode: string;
  trustScore: number | null;
  completedAt: string | null;
  createdAt: string;
  stepResults: StepResult[];
}


function stepIcon(step: StepResult) {
  const d = step.data as Record<string, unknown>;
  const isWarning =
    (step.stepNumber === 3 && d.issueDetected) ||
    (step.stepNumber === 5 && Number(d.hallucinationRisk ?? 0) > 30);
  return isWarning ? (
    <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
  ) : (
    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
  );
}

function trustColor(score: number | null) {
  if (score === null) return "bg-slate-100 text-slate-600";
  if (score >= 70) return "bg-emerald-100 text-emerald-700";
  if (score >= 40) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function InteractiveHeader({
  onLogoClick,
  onLoginClick,
}: InteractiveHeaderProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const [isPhilosophyModalOpen, setIsPhilosophyModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { data: history, isLoading: historyLoading } = useQuery<AuditEntry[]>({
    queryKey: ["audit-history"],
    queryFn: () => axios.get("/api/audit").then((r) => r.data),
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  return (
    <>
      <header className="border-b border-slate-200/60 backdrop-blur-sm bg-white/80 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button
              onClick={onLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold text-slate-900">
                AI Verification Card
              </span>
            </button>

            {/* Nav */}
            <nav className="flex items-center gap-6">
              <button
                onClick={() => setIsPhilosophyModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all font-medium"
              >
                <BookOpen className="w-5 h-5" />
                <span>Cơ sở triết học</span>
              </button>

              {/* History dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all font-medium"
                >
                  <Clock className="w-5 h-5" />
                  <span>Lịch sử quét</span>
                  {history && history.length > 0 && (
                    <span className="w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {history.length}
                    </span>
                  )}
                </button>

                {isHistoryOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsHistoryOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">
                          Lịch sử kiểm chứng
                        </h3>
                        {history && (
                          <span className="text-xs text-slate-500">
                            {history.length} phiên
                          </span>
                        )}
                      </div>

                      <div className="max-h-[480px] overflow-y-auto">
                        {historyLoading && (
                          <div className="flex items-center justify-center py-8 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            <span className="text-sm">Đang tải...</span>
                          </div>
                        )}

                        {!historyLoading && !isLoggedIn && (
                          <div className="py-8 text-center text-sm text-slate-500">
                            Đăng nhập để xem lịch sử
                          </div>
                        )}

                        {!historyLoading &&
                          isLoggedIn &&
                          (!history || history.length === 0) && (
                            <div className="py-8 text-center text-sm text-slate-500">
                              Chưa có phiên kiểm chứng nào
                            </div>
                          )}

                        {history && history.length > 0 && (
                          <div className="divide-y divide-slate-100">
                            {history.map((audit) => (
                              <Link
                                key={audit.id}
                                href={`/history/${audit.auditCode}`}
                                onClick={() => setIsHistoryOpen(false)}
                                className="block p-4 hover:bg-slate-50 transition-colors group"
                              >
                                <div className="flex items-start justify-between mb-1.5">
                                  <span className="font-mono text-sm font-semibold text-slate-700">
                                    #{audit.auditCode.slice(-8).toUpperCase()}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${trustColor(audit.trustScore)}`}>
                                      {audit.trustScore ?? "?"}%
                                    </span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 transition-colors -rotate-90" />
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {formatDate(audit.completedAt ?? audit.createdAt)}
                                  {audit.trustScore !== null && (
                                    <span className="ml-2">
                                      •{" "}
                                      {audit.trustScore >= 70
                                        ? "Độ tin cậy cao"
                                        : audit.trustScore >= 40
                                          ? "Cần xem xét"
                                          : "Cảnh báo ảo giác"}
                                    </span>
                                  )}
                                </div>
                                {/* Step chips */}
                                {audit.stepResults.length > 0 && (
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {audit.stepResults.map((step) => (
                                      <div key={step.stepNumber} className="flex items-center gap-0.5">
                                        {stepIcon(step)}
                                      </div>
                                    ))}
                                    <span className="text-xs text-slate-400 ml-1">
                                      {audit.stepResults.length}/5 bước
                                    </span>
                                  </div>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                        {/* Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                          <Link
                            href="/history"
                            onClick={() => setIsHistoryOpen(false)}
                            className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
                          >
                            Xem tất cả lịch sử →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </nav>

            {/* Auth */}
            {!isLoggedIn ? (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-5 py-2 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all font-semibold"
              >
                <LogIn className="w-5 h-5" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {session?.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      className="w-9 h-9 rounded-full ring-2 ring-emerald-200 object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center ring-2 ring-emerald-200">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900">
                      {session?.user?.name ?? "Tài khoản"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {session?.user?.email}
                    </div>
                  </div>
                </button>

                {isProfileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-slate-200 bg-gradient-to-br from-emerald-50 to-green-50">
                        <div className="flex items-center gap-3">
                          {session?.user?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={session.user.image}
                              alt=""
                              className="w-12 h-12 rounded-full ring-2 ring-emerald-300 object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center ring-2 ring-emerald-300">
                              <User className="w-7 h-7 text-white" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">
                              {session?.user?.name ?? "Người dùng"}
                            </div>
                            <div className="text-sm text-slate-600">
                              {session?.user?.email}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">Thông tin cá nhân</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
                          <CheckCircle className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">Lịch sử kiểm chứng</span>
                        </button>
                      </div>
                      <div className="p-3 bg-slate-50 border-t border-slate-200">
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            signOut({ callbackUrl: "/" });
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-semibold border border-red-200"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Philosophy Modal */}
      {isPhilosophyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsPhilosophyModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    Cơ sở lý luận Triết học
                  </h2>
                  <p className="text-emerald-100 text-sm">
                    Đề tài SPST086 - Môn MLN111
                  </p>
                </div>
                <button
                  onClick={() => setIsPhilosophyModalOpen(false)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
                  <BookOpen className="w-4 h-4" />
                  <span>Triết học Mác - Lênin</span>
                </div>
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-lg text-slate-700 leading-relaxed mb-4">
                  Ứng dụng vận dụng nguyên lý của Lý luận nhận thức Mác -
                  Lênin:{" "}
                  <strong className="text-emerald-600">
                    &ldquo;Thực tiễn là tiêu chuẩn của chân lý&rdquo;
                  </strong>
                  .
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Hệ thống không kiểm chứng văn bản bằng cảm quan chủ quan, mà
                  tự động kết nối API học thuật để đối chiếu luận điểm của AI
                  với dữ liệu thực tiễn khách quan, từ đó vạch trần các ảo giác
                  AI (Hallucination) và xác thực chân lý học thuật.
                </p>
              </div>
              <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Phương pháp luận:</strong> Đối chiếu trực tiếp với
                  thực tiễn khách quan thông qua cơ sở dữ liệu học thuật quốc
                  tế (Google Scholar, Wikipedia, PubMed).
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsPhilosophyModalOpen(false)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-emerald-600/30"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
