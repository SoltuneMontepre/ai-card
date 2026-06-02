import type { Source, VerificationStatus } from "./gemini";

const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  verified: "Đã tìm thấy nguồn",
  in_text: "Link trong văn bản",
  partial: "Khớp một phần",
  not_found: "Không tìm thấy link",
  unreachable: "Link không truy cập được",
  search_failed: "Không thể tìm kiếm (lỗi API)",
};

export function getVerificationLabel(source: {
  status?: string;
  verificationStatus?: VerificationStatus;
}): string {
  if (source.verificationStatus) {
    return VERIFICATION_LABELS[source.verificationStatus];
  }
  if (source.status === "active") return "Chưa xác minh web";
  return "Không truy vết được";
}

export function getSourceLink(source: {
  discoveredUrl?: string | null;
  urlInText?: string | null;
}): string | null {
  return source.discoveredUrl ?? source.urlInText ?? null;
}

export function getVerificationLabelFromRecord(
  s: Record<string, unknown>,
): string {
  return getVerificationLabel({
    status: typeof s.status === "string" ? s.status : undefined,
    verificationStatus:
      typeof s.verificationStatus === "string"
        ? (s.verificationStatus as VerificationStatus)
        : undefined,
  });
}

export function getSourceLinkFromRecord(
  s: Record<string, unknown>,
): string | null {
  return getSourceLink({
    discoveredUrl:
      typeof s.discoveredUrl === "string" ? s.discoveredUrl : null,
    urlInText: typeof s.urlInText === "string" ? s.urlInText : null,
  });
}
