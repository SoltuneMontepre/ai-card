import type {
  Step1Result,
  Step2Result,
  Step3Result,
  Step4Result,
  Step5Result,
} from "./gemini";

export type HallucinationBand = "low" | "medium" | "high";
export type VerdictTone = "success" | "warning" | "danger";

const CURRENT_YEAR = 2026;

export function getHallucinationBand(risk: number): HallucinationBand {
  if (risk < 30) return "low";
  if (risk < 60) return "medium";
  return "high";
}

export function trustScoreToBand(trustScore: number): HallucinationBand {
  if (trustScore >= 70) return "low";
  if (trustScore >= 40) return "medium";
  return "high";
}

export interface Step5OverallVerdict {
  tone: VerdictTone;
  title: string;
  message: string;
  boxClassName: string;
  iconClassName: string;
  titleClassName: string;
  messageClassName: string;
}

export function getStep5OverallVerdict(risk: number): Step5OverallVerdict {
  const band = getHallucinationBand(risk);

  if (band === "low") {
    return {
      tone: "success",
      title: "Kết quả tổng thể",
      message: "Văn bản đạt tiêu chuẩn chân lý thực tiễn, sẵn sàng xuất thẻ chứng nhận.",
      boxClassName:
        "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border-2 border-emerald-200 dark:border-emerald-800",
      iconClassName: "text-emerald-600 dark:text-emerald-400",
      titleClassName: "text-emerald-900 dark:text-emerald-200",
      messageClassName: "text-emerald-800 dark:text-emerald-300",
    };
  }

  if (band === "medium") {
    return {
      tone: "warning",
      title: "Kết quả tổng thể",
      message: "Có điểm cần rà soát thêm; nên xem lại cảnh báo các bước trước trước khi dùng học thuật hoặc xuất thẻ.",
      boxClassName:
        "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/40 border-2 border-amber-200 dark:border-amber-800",
      iconClassName: "text-amber-600 dark:text-amber-400",
      titleClassName: "text-amber-900 dark:text-amber-200",
      messageClassName: "text-amber-800 dark:text-amber-300",
    };
  }

  return {
    tone: "danger",
    title: "Kết quả tổng thể",
    message: "Rủi ro ảo giác cao — không coi văn bản là đạt chuẩn hay sẵn sàng xuất thẻ chứng nhận. Cần chỉnh sửa và kiểm chứng lại.",
    boxClassName: "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 border-2 border-red-200 dark:border-red-800",
    iconClassName: "text-red-600 dark:text-red-400",
    titleClassName: "text-red-900 dark:text-red-200",
    messageClassName: "text-red-800 dark:text-red-300",
  };
}

export function getExportCardHint(risk: number): string | null {
  if (getHallucinationBand(risk) !== "high") return null;
  return "Thẻ phản ánh điểm tin cậy thấp — không phải chứng nhận đạt chuẩn.";
}

export interface ResultScreenHeadline {
  headline: string;
  subline: string | null;
}

export function getResultScreenHeadline(trustScore: number): ResultScreenHeadline {
  const band = trustScoreToBand(trustScore);

  if (band === "low") {
    return {
      headline: "Nội dung an toàn để sử dụng học thuật",
      subline: null,
    };
  }

  if (band === "medium") {
    return {
      headline: "Nội dung cần rà soát thêm trước khi sử dụng",
      subline: "Một số điểm kiểm chứng chưa đủ tin cậy — nên xem lại các bước trước.",
    };
  }

  return {
    headline: "Cần chỉnh sửa trước khi dùng học thuật",
    subline: "Rủi ro ảo giác cao — thẻ chỉ phản ánh điểm tin cậy, không phải chứng nhận đạt chuẩn.",
  };
}

export function getStep5ChecklistLabel(risk: number): string {
  if (risk < 30) return "Không có ảo giác AI đáng kể";
  if (risk < 60) return "Rủi ro ảo giác trung bình — cần kiểm tra lại";
  return "Rủi ro ảo giác cao — cần xác minh cẩn thận";
}

function bandToTone(band: HallucinationBand): VerdictTone {
  if (band === "low") return "success";
  if (band === "medium") return "warning";
  return "danger";
}

export function getStep1ChecklistTone(step1: Step1Result): VerdictTone {
  const broken = step1.sources.filter((s) => s.status === "broken").length;
  const total = step1.sources.length;
  const score = step1.referenceOverview.reliabilityScore;

  if (broken === 0 && score >= 70) return "success";
  if (total > 0 && broken > total / 2) return "danger";
  if (score < 50) return "danger";
  return "warning";
}

export function getStep2ChecklistTone(step2: Step2Result): VerdictTone {
  if (step2.logicScore >= 70) return "success";
  if (step2.logicScore >= 50) return "warning";
  return "danger";
}

export function getStep3ChecklistTone(
  step3: Step3Result,
  step3UserChoice?: "accept" | "override" | null,
): VerdictTone {
  if (!step3.issueDetected) return "success";

  const warningCount = step3.evidence.filter((e) => e.status === "warning").length;
  if (step3UserChoice === "override" || step3UserChoice === "accept") {
    return "warning";
  }
  if (warningCount > 0) return "danger";
  return "warning";
}

export function getStep4ChecklistTone(step4: Step4Result): VerdictTone {
  if (!step4.hasDataYear || step4.dataYear <= 0) return "warning";

  const age = CURRENT_YEAR - step4.dataYear;
  if (age <= 5) return "success";
  if (age <= 10) return "warning";
  return "danger";
}

export function getStep5ChecklistTone(risk: number): VerdictTone {
  return bandToTone(getHallucinationBand(risk));
}

export interface VerificationChecklistItem {
  label: string;
  tone: VerdictTone;
}

export interface VerificationAnalysisInput {
  step1: Step1Result;
  step2: Step2Result;
  step3: Step3Result;
  step4: Step4Result;
  step5: Step5Result;
}

export function buildVerificationChecklist(
  analysis: VerificationAnalysisInput,
  step3UserChoice?: "accept" | "override" | null,
): VerificationChecklistItem[] {
  const risk = analysis.step5.hallucinationRisk;

  return [
    { label: "Nguồn gốc hợp lệ", tone: getStep1ChecklistTone(analysis.step1) },
    { label: "Logic nhất quán", tone: getStep2ChecklistTone(analysis.step2) },
    {
      label: "Khớp với thực tiễn",
      tone: getStep3ChecklistTone(analysis.step3, step3UserChoice),
    },
    { label: "Dữ liệu cập nhật", tone: getStep4ChecklistTone(analysis.step4) },
    {
      label: getStep5ChecklistLabel(risk),
      tone: getStep5ChecklistTone(risk),
    },
  ];
}
