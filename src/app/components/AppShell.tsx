"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { PieChart, Pie, Cell } from "recharts";
import QRCode from "react-qr-code";
import {
  FileText,
  Check,
  CheckCircle2,
  Home,
  Award,
  Shield,
  Download,
  Loader2,
} from "lucide-react";
import AIAutomatedStepper from "./AIAutomatedStepper";
import PremiumLandingPage from "./PremiumLandingPage";
import InteractiveHeader from "./InteractiveHeader";
import AuthModal from "./AuthModal";
import Toast from "./Toast";
import Animated, { useAnimatedRef } from "./Animated";
import { downloadElementAsPdf } from "@/lib/download-certificate-pdf";

const screenAnimateOptions = { duration: 280, easing: "ease-in-out" as const };
import type {
  Step1Result,
  Step2Result,
  Step3Result,
  Step4Result,
  Step5Result,
} from "@/lib/gemini";

type Screen = "landing" | "workspace" | "result";

interface AIAnalysisState {
  step1: Step1Result;
  step2: Step2Result;
  step3: Step3Result;
  step4: Step4Result;
  step5: Step5Result;
}

const defaultAnalysis: AIAnalysisState = {
  step1: { citationsFound: 0, sources: [] },
  step2: { logicScore: 0, summary: "" },
  step3: { issueDetected: false, evidence: [] },
  step4: { hasDataYear: false, dataYear: 0, freshness: "" },
  step5: { hallucinationRisk: 0 },
};

export default function AppShell() {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  const [currentScreen, setCurrentScreen] = useState<Screen>("landing");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [step3UserChoice, setStep3UserChoice] = useState<
    "accept" | "override" | null
  >(null);
  const [aiAnalysis, setAiAnalysis] =
    useState<AIAnalysisState>(defaultAnalysis);

  const [inputValue, setInputValue] = useState("");
  const [selectedTab, setSelectedTab] = useState<"text" | "file">("text");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(false);
  const [auditCode, setAuditCode] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);
  const [screenRef] = useAnimatedRef(screenAnimateOptions);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Store the text being verified so it doesn't change mid-session
  const verifiedText = useRef("");

  const wordCount = inputValue.trim()
    ? inputValue.trim().split(/\s+/).length
    : 0;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const parseFileMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return axios
        .post<{ text: string }>("/api/parse-file", fd)
        .then((r) => r.data.text);
    },
  });

  function makeStepMutation<T extends object>(
    url: string,
    stepKey: keyof AIAnalysisState,
  ) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMutation({
      mutationFn: ({ text, context }: { text: string; context: Partial<AIAnalysisState> }) =>
        axios.post<T>(url, { text, context }).then((r) => r.data),
      onSuccess: (data) =>
        setAiAnalysis((prev) => ({ ...prev, [stepKey]: data })),
    });
  }

  const step1 = makeStepMutation<Step1Result>("/api/verify/step1", "step1");
  const step2 = makeStepMutation<Step2Result>("/api/verify/step2", "step2");
  const step3 = makeStepMutation<Step3Result>("/api/verify/step3", "step3");
  const step4 = makeStepMutation<Step4Result>("/api/verify/step4", "step4");
  const step5 = makeStepMutation<Step5Result>("/api/verify/step5", "step5");

  const stepMutations = [step1, step2, step3, step4, step5];
  // Derive pending state from TanStack Query — no manual loading flags needed
  const stepPending = stepMutations.map((m) => m.isPending);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const completedCount = completedSteps.filter(Boolean).length;
  const allStepsCompleted = completedSteps.every((s) => s);
  const progressPercentage = (completedCount / 5) * 100;

  const toggleStep = (index: number) =>
    setExpandedStep(expandedStep === index ? null : index);

  const approveStep = (index: number) => {
    const newSteps = [...completedSteps];
    newSteps[index] = true;
    setCompletedSteps(newSteps);

    const nextIndex = index + 1;
    if (nextIndex < 5) {
      // Expand immediately so the loading skeleton is visible right away
      setExpandedStep(nextIndex);
      stepMutations[nextIndex].mutate({ text: verifiedText.current, context: aiAnalysis });
    } else {
      setExpandedStep(null);
    }
  };

  const goBackToPreviousStep = (currentStep: number) => {
    if (currentStep > 0) {
      setExpandedStep(currentStep - 1);
      const newSteps = [...completedSteps];
      newSteps[currentStep] = false;
      setCompletedSteps(newSteps);
    }
  };

  const resetAndGoHome = () => {
    setCurrentScreen("landing");
    setCompletedSteps([false, false, false, false, false]);
    setExpandedStep(null);
    setStep3UserChoice(null);
    setInputValue("");
    setUploadedFile(null);
    setIsLoading(false);
    setSelectedTab("text");
    setAiAnalysis(defaultAnalysis);
    setAuditCode(null);
    setVerifyUrl(null);
    verifiedText.current = "";
  };

  const loadSampleText = () => {
    setInputValue(
      `Trí tuệ nhân tạo sinh tạo (Generative AI) là một lĩnh vực của học máy tập trung vào việc tạo ra nội dung mới như văn bản, hình ảnh, âm thanh và video. Các mô hình như GPT-4 và DALL-E đã cho thấy khả năng tạo ra nội dung có chất lượng gần như con người. Công nghệ này đang được ứng dụng rộng rãi trong nhiều lĩnh vực từ giáo dục, nghệ thuật đến y tế và kinh doanh.

Theo nghiên cứu của OpenAI năm 2023, các mô hình ngôn ngữ lớn có thể xử lý và tạo ra văn bản với độ chính xác lên đến 85% trong các nhiệm vụ phức tạp. Tuy nhiên, người dùng cần lưu ý rằng AI vẫn có thể tạo ra thông tin không chính xác hoặc thiên kiến dựa trên dữ liệu huấn luyện.`,
    );
  };

  const handleStartVerification = async () => {
    if (!isLoggedIn) {
      setIsLoginModalOpen(true);
      setPendingNavigation(true);
      return;
    }

    setIsLoading(true);

    try {
      let textToVerify = inputValue;

      // For file uploads, parse first (usually fast)
      if (selectedTab === "file" && uploadedFile) {
        textToVerify = await parseFileMutation.mutateAsync(uploadedFile);
        setInputValue(textToVerify);
      }

      verifiedText.current = textToVerify;
      setAiAnalysis(defaultAnalysis);

      // Navigate to workspace immediately — step 1 shows its loading skeleton
      setCurrentScreen("workspace");
      setExpandedStep(0);
      step1.mutate({ text: textToVerify, context: {} });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setShowToast(true);
    if (pendingNavigation) {
      setPendingNavigation(false);
      setTimeout(() => handleStartVerification(), 500);
    }
  };

  const handleGoToResult = async () => {
    setCurrentScreen("result");

    // Persist the completed audit session with all step results
    try {
      const { data } = await axios.post<{ auditCode: string; verifyUrl: string }>("/api/audit", {
        inputText: verifiedText.current,
        trustScore: 100 - aiAnalysis.step5.hallucinationRisk,
        stepResults: [
          { stepNumber: 1, data: aiAnalysis.step1 },
          { stepNumber: 2, data: aiAnalysis.step2 },
          { stepNumber: 3, data: aiAnalysis.step3 },
          { stepNumber: 4, data: aiAnalysis.step4 },
          { stepNumber: 5, data: aiAnalysis.step5 },
        ],
      });
      setAuditCode(data.auditCode);
      setVerifyUrl(data.verifyUrl);
    } catch {
      // non-critical — result still shown
    }
  };

  const trustScore = Math.max(
    0,
    Math.min(100, 100 - aiAnalysis.step5.hallucinationRisk),
  );
  const chartData = [
    { name: "Trust", value: trustScore },
    { name: "Remaining", value: 100 - trustScore },
  ];

  const today = new Date().toLocaleDateString("vi-VN");

  const handleDownloadCertificate = async () => {
    if (!certificateRef.current) return;
    setIsDownloadingPdf(true);
    setPdfToast(null);
    try {
      const code = auditCode?.slice(-6).toUpperCase() ?? "certificate";
      await downloadElementAsPdf(
        certificateRef.current,
        `ai-verification-card-${code}.pdf`,
      );
    } catch {
      setPdfToast("Không thể tải PDF. Vui lòng thử lại.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // ── Screens ────────────────────────────────────────────────────────────────

  return (
    <>
      <div ref={screenRef}>
        {currentScreen === "landing" && (
          <div key="landing">
            <PremiumLandingPage
            inputValue={inputValue}
            setInputValue={setInputValue}
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            uploadedFile={uploadedFile}
            onFileSelect={setUploadedFile}
            onFileRemove={() => setUploadedFile(null)}
            isLoading={isLoading}
            wordCount={wordCount}
            loadSampleText={loadSampleText}
            handleStartVerification={handleStartVerification}
            onLogoClick={resetAndGoHome}
            onLoginClick={() => setIsLoginModalOpen(true)}
          />
          </div>
        )}

        {currentScreen === "workspace" && (
          <div key="workspace" className="min-h-screen bg-gray-50 dark:bg-slate-950">
            <InteractiveHeader
              onLogoClick={resetAndGoHome}
              onLoginClick={() => setIsLoginModalOpen(true)}
            />

            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm">
              <div className="w-full max-w-360 mx-auto px-8 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-2xl mx-auto">
                    <div className="mb-2 text-sm text-slate-600 dark:text-slate-400 text-center font-semibold">
                      Hoàn thành: Bước {completedCount}/5
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 shadow-inner">
                      <div
                        className="bg-linear-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/30"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={resetAndGoHome}
                    className="px-4 py-2 border-2 border-red-500 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-all font-semibold"
                  >
                    Hủy phiên
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full max-w-360 mx-auto px-8 py-8">
              <div className="grid grid-cols-5 gap-8">
                <div className="col-span-2">
                  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                          Đoạn văn bản cần kiểm tra
                        </h2>
                      </div>
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm rounded-full">
                        {wordCount} từ
                      </span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                      {verifiedText.current}
                    </div>
                  </div>
                </div>

                <AIAutomatedStepper
                  completedSteps={completedSteps}
                  expandedStep={expandedStep}
                  aiAnalysis={aiAnalysis}
                  stepPending={stepPending}
                  step3UserChoice={step3UserChoice}
                  onToggleStep={toggleStep}
                  onApproveStep={approveStep}
                  onSetStep3Choice={setStep3UserChoice}
                  onGoBack={goBackToPreviousStep}
                  allStepsCompleted={allStepsCompleted}
                  onGoToResult={handleGoToResult}
                />
              </div>
            </div>
          </div>
        )}

        {currentScreen === "result" && (
          <div key="result" className="min-h-screen bg-gray-50 dark:bg-slate-950">
            <InteractiveHeader
              onLogoClick={resetAndGoHome}
              onLoginClick={() => setIsLoginModalOpen(true)}
            />

            <div className="bg-linear-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border-b border-emerald-200 dark:border-emerald-900 shadow-sm">
              <div className="w-full max-w-360 mx-auto px-8 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-2xl mx-auto">
                    <div className="mb-2 text-sm text-emerald-700 dark:text-emerald-400 font-bold text-center flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Hoàn thành: Bước 5/5</span>
                    </div>
                    <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-3 shadow-inner">
                      <div
                        className="bg-linear-to-r from-emerald-500 to-emerald-600 h-3 rounded-full shadow-lg shadow-emerald-500/50 animate-pulse"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={resetAndGoHome}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-semibold shadow-md"
                  >
                    <Home className="w-4 h-4" />
                    <span>Về trang chủ</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full max-w-360 mx-auto px-8 py-12">
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg dark:shadow-black/30 p-8">
                    <div className="flex flex-col items-center">
                      <div className="relative w-[280px] h-[280px]">
                        <PieChart width={280} height={280}>
                          <Pie
                            data={chartData}
                            cx={140}
                            cy={140}
                            startAngle={90}
                            endAngle={-270}
                            innerRadius={100}
                            outerRadius={130}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell
                              fill={
                                trustScore >= 70
                                  ? "#10B981"
                                  : trustScore >= 40
                                    ? "#F59E0B"
                                    : "#EF4444"
                              }
                            />
                            <Cell fill="#E5E7EB" />
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                          <div className={`text-6xl font-bold leading-none ${
                            trustScore >= 70
                              ? "text-emerald-600"
                              : trustScore >= 40
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}>
                            {trustScore}%
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Trust Score
                          </div>
                        </div>
                      </div>
                      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mt-6 text-center">
                        Nội dung an toàn để sử dụng học thuật
                      </h2>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg dark:shadow-black/30 p-8">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">
                      Tóm tắt kiểm chứng
                    </h3>
                    <Animated className="space-y-4">
                      {[
                        "Nguồn gốc hợp lệ",
                        "Logic nhất quán",
                        "Khớp với thực tiễn",
                        "Dữ liệu cập nhật",
                        "Không có ảo giác AI",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-slate-700 dark:text-slate-300">
                            {i + 1}. {item}
                          </span>
                        </div>
                      ))}
                    </Animated>
                    <button
                      type="button"
                      onClick={handleDownloadCertificate}
                      disabled={isDownloadingPdf || !auditCode}
                      className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloadingPdf ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                      <span className="font-semibold">
                        {isDownloadingPdf
                          ? "Đang tạo PDF..."
                          : "Tải Thẻ Chứng Nhận (PDF)"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="w-full max-w-135">
                    <div
                      ref={certificateRef}
                      className="relative bg-linear-to-br from-[#0F172A] to-[#1E293B] rounded-2xl shadow-2xl p-12 border-4 border-emerald-500 overflow-hidden"
                    >
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-emerald-400" />
                        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-emerald-400" />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-emerald-400 rounded-full" />
                      </div>
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-400 rounded-full mb-8">
                          <Award className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold text-sm tracking-wider">
                            VERIFIED CONTENT
                          </span>
                        </div>
                        <div className="w-32 h-32 bg-linear-to-br from-emerald-400 to-yellow-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/50">
                          <Shield
                            className="w-20 h-20 text-white"
                            strokeWidth={2.5}
                          />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">
                          AI Verification Card
                        </h2>
                        <p className="text-emerald-400 text-lg mb-8 leading-relaxed">
                          Đã kiểm chứng bởi Khung MLN111
                          <br />
                          <span className="text-white/80">Nhóm SPST086</span>
                        </p>
                        <div className="w-full h-px bg-linear-to-r from-transparent via-emerald-500 to-transparent mb-8" />
                        <div className="flex items-center justify-between w-full text-sm">
                          <div className="text-left">
                            <div className="text-gray-400 mb-1">Audit ID</div>
                            <div className="text-white font-mono font-semibold">
                              #{auditCode?.slice(-6).toUpperCase() ?? "------"}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-gray-400 mb-1">Date</div>
                            <div className="text-white font-semibold">{today}</div>
                          </div>
                          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-1.5">
                            <QRCode
                              value={verifyUrl ?? `${window.location.origin}/verify/${auditCode ?? "pending"}`}
                              size={52}
                              fgColor="#0F172A"
                              bgColor="#ffffff"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_60px_rgba(16,185,129,0.3)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Toast
        message={pdfToast ?? ""}
        isVisible={!!pdfToast}
        onClose={() => setPdfToast(null)}
      />

      {currentScreen === "landing" && (
        <>
          <AuthModal
            isOpen={isLoginModalOpen}
            onClose={() => {
              setIsLoginModalOpen(false);
              setPendingNavigation(false);
            }}
            onAuthSuccess={handleLoginSuccess}
          />
          <Toast
            message="Xác thực thành công. Chào mừng bạn!"
            isVisible={showToast}
            onClose={() => setShowToast(false)}
          />
        </>
      )}
    </>
  );
}
