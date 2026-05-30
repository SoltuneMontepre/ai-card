"use client";

import { useRef } from "react";
import {
  FileText,
  CheckSquare,
  CreditCard,
  Sparkles,
  Upload,
  X,
  Microscope,
  AlignLeft,
  Lightbulb,
  Loader2,
} from "lucide-react";
import InteractiveHeader from "./InteractiveHeader";
import Animated from "./Animated";

interface PremiumLandingPageProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  selectedTab: "text" | "file";
  setSelectedTab: (tab: "text" | "file") => void;
  uploadedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isLoading: boolean;
  wordCount: number;
  loadSampleText: () => void;
  handleStartVerification: () => void;
  onLogoClick: () => void;
  onLoginClick: () => void;
}

export default function PremiumLandingPage({
  inputValue,
  setInputValue,
  selectedTab,
  setSelectedTab,
  uploadedFile,
  onFileSelect,
  onFileRemove,
  isLoading,
  wordCount,
  loadSampleText,
  handleStartVerification,
  onLogoClick,
  onLoginClick,
}: PremiumLandingPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasInput = selectedTab === "text" ? !!inputValue : !!uploadedFile;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] bg-size-[16px_16px] opacity-50" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-emerald-200/20 dark:bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        <InteractiveHeader
          onLogoClick={onLogoClick}
          onLoginClick={onLoginClick}
        />

        <section className="max-w-360 mx-auto px-8 py-20">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/50 dark:to-blue-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full mb-8 shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Thực tiễn là tiêu chuẩn của chân lý
              </span>
            </div>

            <h1 className="text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-tight">
              Đừng dùng AI mù quáng.{" "}
              <span className="bg-linear-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                Hãy kiểm chứng học thuật.
              </span>
            </h1>

            <p className="text-xl text-slate-600 dark:text-slate-400 mb-16 leading-relaxed max-w-3xl mx-auto">
              Công cụ hỗ trợ sinh viên đánh giá độ tin cậy của văn bản do AI tạo
              ra thông qua 5 bước đối chiếu thực tiễn nghiêm ngặt.
            </p>

            <div className="relative">
              <div className="absolute -inset-4 bg-linear-to-r from-emerald-500/20 to-blue-500/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <button
                    onClick={() => setSelectedTab("text")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all ${
                      selectedTab === "text"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <AlignLeft className="w-5 h-5" />
                    <span>Dán văn bản từ AI</span>
                  </button>
                  <button
                    onClick={() => setSelectedTab("file")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all ${
                      selectedTab === "file"
                        ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    <span>Tải tài liệu lên</span>
                  </button>
                </div>

                <Animated className="p-8">
                  {selectedTab === "text" ? (
                    <>
                      <div className="relative">
                        <textarea
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          className="w-full h-56 p-5 border-2 border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-700 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-800/50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          placeholder="Dán nội dung bạn vừa hỏi AI (ChatGPT, Gemini...) vào đây để bắt đầu làm việc..."
                        />
                        <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium shadow-sm">
                          {wordCount} / 3000 từ
                        </div>
                      </div>
                      <button
                        onClick={loadSampleText}
                        className="flex items-center gap-2 mt-4 text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-all hover:gap-3"
                      >
                        <Lightbulb className="w-4 h-4" />
                        <span>Sử dụng văn bản mẫu để trải nghiệm nhanh</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onFileSelect(file);
                          e.target.value = "";
                        }}
                      />

                      {!uploadedFile ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-emerald-500 transition-all cursor-pointer bg-slate-50/30 dark:bg-slate-800/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 group"
                        >
                          <div className="w-16 h-16 bg-emerald-100 group-hover:bg-emerald-200 rounded-full flex items-center justify-center mb-4 transition-all">
                            <Upload className="w-8 h-8 text-emerald-600" />
                          </div>
                          <p className="text-slate-700 dark:text-slate-200 font-semibold mb-1">
                            Nhấn để tải tài liệu lên
                          </p>
                          <p className="text-sm text-slate-500">
                            Hỗ trợ .docx, .pdf (tối đa 10MB)
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between h-56 p-6 border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-200 rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-emerald-700" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {uploadedFile.name}
                              </div>
                              <div className="text-sm text-slate-600">
                                {(uploadedFile.size / 1024).toFixed(0)} KB
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={onFileRemove}
                            className="w-8 h-8 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-600"
                          >
                            <X className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <button
                    onClick={handleStartVerification}
                    disabled={isLoading || !hasInput}
                    className={`w-full mt-8 flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all transform ${
                      isLoading || !hasInput
                        ? "bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed"
                        : "bg-linear-to-r from-emerald-600 to-emerald-500 text-white hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50 shadow-lg"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Hệ thống đang quét dữ liệu...</span>
                      </>
                    ) : (
                      <>
                        <Microscope className="w-6 h-6" />
                        <span>Bắt đầu kiểm chứng</span>
                      </>
                    )}
                  </button>
                </Animated>
              </div>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="max-w-360 mx-auto px-8 pb-20">
          <Animated className="max-w-6xl mx-auto grid grid-cols-3 gap-8">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl p-8 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20 transition-all group">
              <div className="w-14 h-14 bg-linear-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                1. Quét nội dung tức thì
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Phân tách lập luận và số liệu để fact-check.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl p-8 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-900/20 transition-all group">
              <div className="w-14 h-14 bg-linear-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <CheckSquare className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                2. Đối chiếu 5 bước
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Kiểm tra nguồn gốc, logic, thực tiễn, ảo giác AI.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl p-8 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20 transition-all group">
              <div className="w-14 h-14 bg-linear-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <CreditCard className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                3. Xuất thẻ chứng nhận
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Tạo Verification Card minh chứng liêm chính.
              </p>
            </div>
          </Animated>
        </section>

        <footer className="max-w-360 mx-auto px-8 pb-12">
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>
              Đồ án Thực hành sáng tạo môn MLN111 • Mã đề tài: SPST086 • Phiên
              bản v2.0
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
