'use client';

import {
  Check, ChevronDown, ChevronUp, ChevronLeft,
  Loader2, AlertTriangle, CheckCircle2,
  Brain, Database, Sparkles, Lock,
} from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import type {
  Step1Result, Step2Result, Step3Result,
  Step4Result, Step5Result,
} from '@/lib/gemini';
import Animated from './Animated';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AIAnalysis {
  step1: Step1Result;
  step2: Step2Result;
  step3: Step3Result;
  step4: Step4Result;
  step5: Step5Result;
}

interface AIAutomatedStepperProps {
  completedSteps: boolean[];
  expandedStep: number | null;
  aiAnalysis: AIAnalysis;
  stepPending: boolean[];
  step3UserChoice: 'accept' | 'override' | null;
  onToggleStep: (index: number) => void;
  onApproveStep: (index: number) => void;
  onSetStep3Choice: (choice: 'accept' | 'override') => void;
  onGoBack: (currentStep: number) => void;
  allStepsCompleted: boolean;
  onGoToResult: () => void;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function StepLoadingSkeleton() {
  return (
    <div className="pt-4 border-t border-gray-100 animate-in fade-in duration-300">
      <div className="flex flex-col items-center justify-center py-6 gap-4">
        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-600 text-sm">
            Gemini AI đang phân tích...
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Có thể mất 10–30 giây</p>
        </div>
        <div className="w-full space-y-2.5 animate-pulse">
          <div className="h-14 bg-slate-100 rounded-xl" />
          <div className="h-14 bg-slate-100 rounded-xl" />
          <div className="h-10 bg-slate-200 rounded-xl w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
}

// Animated accordion wrapper — CSS grid trick for smooth height animation
function StepAccordion({
  isOpen,
  isPending,
  children,
}: {
  isOpen: boolean;
  isPending: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">
        <div className="px-6 pb-6">
          {isPending ? <StepLoadingSkeleton /> : children}
        </div>
      </div>
    </div>
  );
}

// Step header button — handles lock, pending, completed states
function StepHeader({
  index,
  title,
  subtitle,
  isCompleted,
  isPending,
  isLocked,
  isExpanded,
  dotIcon,
  onToggle,
}: {
  index: number;
  title: string;
  subtitle?: React.ReactNode;
  isCompleted: boolean;
  isPending: boolean;
  isLocked: boolean;
  isExpanded: boolean;
  dotIcon: React.ReactNode;
  onToggle: () => void;
}) {
  const disabled = isLocked || isPending;

  const dotBg = isCompleted
    ? 'bg-emerald-500'
    : isPending
      ? 'bg-blue-500'
      : isExpanded
        ? 'bg-blue-500'
        : isLocked
          ? 'bg-gray-200'
          : 'bg-gray-300';

  return (
    <button
      onClick={disabled ? undefined : onToggle}
      className={`w-full text-left p-4 flex items-center justify-between transition-colors ${
        disabled ? 'cursor-not-allowed opacity-75' : 'hover:bg-slate-50/60'
      }`}
      aria-disabled={disabled}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${dotBg}`}
        >
          {isCompleted ? (
            <Check className="w-4 h-4 text-white" />
          ) : isPending ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : isLocked ? (
            <Lock className="w-3 h-3 text-gray-400" />
          ) : (
            dotIcon
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 text-sm leading-tight">
            {title}
          </h3>
          {isPending ? (
            <span className="text-xs text-blue-500 flex items-center gap-1 mt-0.5 animate-pulse">
              <Sparkles className="w-3 h-3" />
              Đang phân tích với Gemini...
            </span>
          ) : isLocked ? (
            <span className="text-xs text-gray-400 mt-0.5">
              Hoàn thành bước {index} để mở khóa
            </span>
          ) : subtitle ? (
            <span className="text-xs text-slate-500 mt-0.5">{subtitle}</span>
          ) : null}
        </div>
      </div>

      {isLocked ? (
        <Lock className="w-4 h-4 text-gray-300 flex-shrink-0 ml-2" />
      ) : isExpanded ? (
        <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2" />
      ) : (
        <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2" />
      )}
    </button>
  );
}

// Common action bar at bottom of a step
function StepActions({
  stepIndex,
  isCompleted,
  onBack,
  onApprove,
  approveLabel,
  approveDisabled,
}: {
  stepIndex: number;
  isCompleted: boolean;
  onBack: () => void;
  onApprove: () => void;
  approveLabel?: string;
  approveDisabled?: boolean;
}) {
  return (
    <div className="flex gap-3 mt-4 items-center">
      {stepIndex > 0 && (
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-white border-2 border-gray-200 text-slate-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold flex items-center gap-1.5 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Quay lại
        </button>
      )}

      {isCompleted ? (
        // Already approved — show status only, no re-trigger button
        <div className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Đã phê duyệt
        </div>
      ) : (
        <button
          onClick={onApprove}
          disabled={approveDisabled}
          className={`flex-1 px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition-all ${
            approveDisabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
          }`}
        >
          <Check className="w-4 h-4" />
          {approveLabel ?? 'Phê duyệt'}
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AIAutomatedStepper({
  completedSteps,
  expandedStep,
  aiAnalysis,
  stepPending,
  step3UserChoice,
  onToggleStep,
  onApproveStep,
  onSetStep3Choice,
  onGoBack,
  allStepsCompleted,
  onGoToResult,
}: AIAutomatedStepperProps) {
  const hallucinationData = [
    { name: 'Risk', value: aiAnalysis.step5.hallucinationRisk },
    { name: 'Safe', value: 100 - aiAnalysis.step5.hallucinationRisk },
  ];
  const hallucinationRisk = aiAnalysis.step5.hallucinationRisk;
  const hallucinationRiskTextColor =
    hallucinationRisk < 30
      ? 'text-emerald-600'
      : hallucinationRisk < 60
        ? 'text-yellow-600'
        : 'text-red-600';
  const hallucinationRiskFill =
    hallucinationRisk < 30
      ? '#10B981'
      : hallucinationRisk < 60
        ? '#F59E0B'
        : '#EF4444';

  // A step is unlocked if all previous steps are completed
  const isUnlocked = (i: number) => i === 0 || completedSteps[i - 1];

  const borderFor = (i: number) =>
    completedSteps[i]
      ? 'border-emerald-500'
      : stepPending[i]
        ? 'border-blue-400'
        : expandedStep === i
          ? 'border-blue-500 shadow-md'
          : isUnlocked(i)
            ? 'border-gray-300'
            : 'border-gray-200';

  return (
    <Animated className="col-span-3 space-y-3">

      {/* ── Step 1 ── */}
      <div className={`bg-white border-l-4 rounded-xl shadow-sm transition-all duration-200 ${borderFor(0)}`}>
        <StepHeader
          index={0}
          title="Bước 1: Tự động quét Nguồn gốc"
          subtitle={
            !stepPending[0] && aiAnalysis.step1.citationsFound > 0
              ? `Tìm thấy ${aiAnalysis.step1.citationsFound} trích dẫn`
              : undefined
          }
          isCompleted={completedSteps[0]}
          isPending={stepPending[0]}
          isLocked={!isUnlocked(0)}
          isExpanded={expandedStep === 0}
          dotIcon={<Brain className="w-4 h-4 text-white" />}
          onToggle={() => onToggleStep(0)}
        />
        <StepAccordion isOpen={expandedStep === 0} isPending={stepPending[0]}>
          <div className="pt-4 border-t border-gray-100 animate-in fade-in duration-200">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-blue-500" />
              Kết quả phân tích AI
            </h4>
            <Animated className="space-y-2.5 mb-4">
              {aiAnalysis.step1.sources.map((source, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border-2 transition-all ${
                    source.color === 'green'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="font-semibold text-slate-800 text-sm mb-1">
                    {source.name}
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span
                      className={`flex items-center gap-1 ${
                        source.status === 'active'
                          ? 'text-emerald-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      {source.status === 'active' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {source.status === 'active' ? 'URL Active' : 'Broken Link'}
                    </span>
                    <span className="text-slate-600">
                      Match: <strong>{source.matchScore}%</strong>
                    </span>
                  </div>
                </div>
              ))}
              {aiAnalysis.step1.sources.length === 0 && (
                <p className="text-sm text-slate-400 italic text-center py-2">
                  Không tìm thấy nguồn trích dẫn
                </p>
              )}
            </Animated>
            <StepActions
              stepIndex={0}
              isCompleted={completedSteps[0]}
              onBack={() => onGoBack(0)}
              onApprove={() => onApproveStep(0)}
              approveLabel="Phê duyệt kết quả AI"
            />
          </div>
        </StepAccordion>
      </div>

      {/* ── Step 2 ── */}
      <div className={`bg-white border-l-4 rounded-xl shadow-sm transition-all duration-200 ${borderFor(1)}`}>
        <StepHeader
          index={1}
          title="Bước 2: Phân tích Cấu trúc Logic"
          subtitle={
            !stepPending[1] && aiAnalysis.step2.logicScore > 0
              ? `Logic score: ${aiAnalysis.step2.logicScore}%`
              : undefined
          }
          isCompleted={completedSteps[1]}
          isPending={stepPending[1]}
          isLocked={!isUnlocked(1)}
          isExpanded={expandedStep === 1}
          dotIcon={<Brain className="w-4 h-4 text-white" />}
          onToggle={() => onToggleStep(1)}
        />
        <StepAccordion isOpen={expandedStep === 1} isPending={stepPending[1]}>
          <div className="pt-4 border-t border-gray-100 animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200 mb-3">
              <div className="text-center mb-3">
                <div className="text-4xl font-bold text-blue-600">
                  {aiAnalysis.step2.logicScore}%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Logical Health Score
                </div>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${aiAnalysis.step2.logicScore}%` }}
                />
              </div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-3">
              <p className="text-sm text-slate-600">{aiAnalysis.step2.summary}</p>
            </div>
            <StepActions
              stepIndex={1}
              isCompleted={completedSteps[1]}
              onBack={() => onGoBack(1)}
              onApprove={() => onApproveStep(1)}
              approveLabel="Xác nhận hợp lệ"
            />
          </div>
        </StepAccordion>
      </div>

      {/* ── Step 3 ── */}
      <div className={`bg-white border-l-4 rounded-xl shadow-sm transition-all duration-200 ${borderFor(2)}`}>
        <StepHeader
          index={2}
          title="Bước 3: Đối chiếu Thực tiễn Tự động"
          subtitle={
            !stepPending[2] && aiAnalysis.step3.evidence.length > 0
              ? `${aiAnalysis.step3.evidence.length} bằng chứng${aiAnalysis.step3.issueDetected ? ' — phát hiện vấn đề' : ''}`
              : undefined
          }
          isCompleted={completedSteps[2]}
          isPending={stepPending[2]}
          isLocked={!isUnlocked(2)}
          isExpanded={expandedStep === 2}
          dotIcon={<Database className="w-4 h-4 text-white" />}
          onToggle={() => onToggleStep(2)}
        />
        <StepAccordion isOpen={expandedStep === 2} isPending={stepPending[2]}>
          <div className="pt-4 border-t border-gray-100 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3.5 rounded-xl mb-3">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Đối chiếu dữ liệu với Google Scholar & Wikipedia
              </p>
            </div>
            <Animated className="space-y-3 mb-3">
              {aiAnalysis.step3.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border-2 ${
                    ev.color === 'green'
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-yellow-50 border-yellow-300'
                  }`}
                >
                  <p className="text-xs text-slate-500 mb-1">Dữ kiện:</p>
                  <p className="font-medium text-slate-800 text-sm italic mb-2">
                    &ldquo;{ev.text}&rdquo;
                  </p>
                  <p className="text-sm text-slate-600 mb-2">{ev.result}</p>
                  <div className="flex items-center gap-2">
                    {ev.status === 'verified' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className="text-sm font-semibold text-slate-700">
                      Match:{' '}
                      <span
                        className={
                          ev.color === 'green'
                            ? 'text-emerald-600'
                            : 'text-yellow-600'
                        }
                      >
                        {ev.matchRate}%
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </Animated>

            {aiAnalysis.step3.issueDetected && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-3">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="font-semibold text-orange-900 text-sm">
                    AI phát hiện lỗi dữ liệu. Bạn muốn xử lý thế nào?
                  </p>
                </div>
                <Animated className="space-y-2">
                  {(
                    [
                      {
                        value: 'accept',
                        label: 'Chấp nhận gợi ý sửa đổi của AI',
                        desc: 'Loại bỏ hoặc đánh dấu thông tin không xác thực',
                        active: 'bg-emerald-50 border-emerald-500',
                      },
                      {
                        value: 'override',
                        label: 'Giữ nguyên và tự chịu trách nhiệm',
                        desc: 'Tôi xác nhận thông tin chính xác dù AI không tìm thấy',
                        active: 'bg-red-50 border-red-500',
                      },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        step3UserChoice === opt.value
                          ? opt.active
                          : 'bg-white border-orange-200 hover:border-orange-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="step3-choice"
                        checked={step3UserChoice === opt.value}
                        onChange={() => onSetStep3Choice(opt.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {opt.label}
                        </p>
                        <p className="text-xs text-slate-500">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </Animated>
              </div>
            )}

            <StepActions
              stepIndex={2}
              isCompleted={completedSteps[2]}
              onBack={() => onGoBack(2)}
              onApprove={() => onApproveStep(2)}
              approveLabel="Hoàn thành đối chiếu thực tiễn"
              approveDisabled={aiAnalysis.step3.issueDetected && !step3UserChoice}
            />
          </div>
        </StepAccordion>
      </div>

      {/* ── Step 4 ── */}
      <div className={`bg-white border-l-4 rounded-xl shadow-sm transition-all duration-200 ${borderFor(3)}`}>
        <StepHeader
          index={3}
          title="Bước 4: Kiểm tra Tính cập nhật"
          subtitle={
            !stepPending[3] && aiAnalysis.step4.dataYear > 0
              ? `Dữ liệu năm ${aiAnalysis.step4.dataYear}`
              : undefined
          }
          isCompleted={completedSteps[3]}
          isPending={stepPending[3]}
          isLocked={!isUnlocked(3)}
          isExpanded={expandedStep === 3}
          dotIcon={<Brain className="w-4 h-4 text-white" />}
          onToggle={() => onToggleStep(3)}
        />
        <StepAccordion isOpen={expandedStep === 3} isPending={stepPending[3]}>
          <div className="pt-4 border-t border-gray-100 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-500 mb-1">Năm hiện tại</p>
                  <p className="text-3xl font-bold text-purple-600">2026</p>
                </div>
                <div className="text-3xl text-purple-200 font-light">→</div>
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-500 mb-1">Năm dữ liệu</p>
                  <p className="text-3xl font-bold text-pink-600">
                    {aiAnalysis.step4.dataYear}
                  </p>
                </div>
              </div>
              <p className="text-xs text-center text-slate-600">
                Cách đây:{' '}
                <strong>{2026 - aiAnalysis.step4.dataYear} năm</strong>
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">{aiAnalysis.step4.freshness}</p>
              </div>
            </div>
            <StepActions
              stepIndex={3}
              isCompleted={completedSteps[3]}
              onBack={() => onGoBack(3)}
              onApprove={() => onApproveStep(3)}
              approveLabel="Đồng ý"
            />
          </div>
        </StepAccordion>
      </div>

      {/* ── Step 5 ── */}
      <div className={`bg-white border-l-4 rounded-xl shadow-sm transition-all duration-200 ${borderFor(4)}`}>
        <StepHeader
          index={4}
          title="Bước 5: Đánh giá Ảo giác AI"
          subtitle={
            !stepPending[4] && aiAnalysis.step5.hallucinationRisk >= 0
              ? `Rủi ro ảo giác: ${aiAnalysis.step5.hallucinationRisk}%`
              : undefined
          }
          isCompleted={completedSteps[4]}
          isPending={stepPending[4]}
          isLocked={!isUnlocked(4)}
          isExpanded={expandedStep === 4}
          dotIcon={<Brain className="w-4 h-4 text-white" />}
          onToggle={() => onToggleStep(4)}
        />
        <StepAccordion isOpen={expandedStep === 4} isPending={stepPending[4]}>
          <div className="pt-4 border-t border-gray-100 animate-in fade-in duration-200">
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-[200px] h-[200px]">
                <PieChart width={200} height={200}>
                  <Pie
                    data={hallucinationData}
                    cx={100}
                    cy={100}
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={66}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={hallucinationRiskFill} />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <div className={`text-4xl font-bold leading-none ${hallucinationRiskTextColor}`}>
                    {hallucinationRisk}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Risk</div>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-semibold mt-1 ${
                  hallucinationRisk < 30
                    ? 'bg-emerald-100 text-emerald-800'
                    : hallucinationRisk < 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {hallucinationRisk < 30
                  ? 'Low Risk'
                  : hallucinationRisk < 60
                    ? 'Medium Risk'
                    : 'High Risk'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-4 mb-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 text-sm mb-1">
                    Kết quả tổng thể
                  </p>
                  <p className="text-sm text-emerald-800">
                    Văn bản đạt tiêu chuẩn chân lý thực tiễn, sẵn sàng xuất thẻ
                    chứng nhận.
                  </p>
                </div>
              </div>
            </div>

            <StepActions
              stepIndex={4}
              isCompleted={completedSteps[4]}
              onBack={() => onGoBack(4)}
              onApprove={() => onApproveStep(4)}
              approveLabel="Xác nhận kết quả tổng thể"
            />
          </div>
        </StepAccordion>
      </div>

      {/* ── Export CTA ── */}
      <button
        onClick={() => allStepsCompleted && onGoToResult()}
        disabled={!allStepsCompleted}
        className={`w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl mt-2 font-semibold transition-all duration-200 ${
          allStepsCompleted
            ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md hover:shadow-lg animate-pulse cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {!allStepsCompleted && <Lock className="w-5 h-5" />}
        <Sparkles className="w-5 h-5" />
        <span>XUẤT THẺ KIỂM CHỨNG</span>
      </button>
    </Animated>
  );
}
