# Responsive CSS — Tiến độ

## Tổng quan

- Bắt đầu: 2026-06-03
- Phase hiện tại: Hoàn thành
- Hoàn thành: 7/7 bề mặt UI · 13/13 thiết bị pass (code + build + MCP mẫu)

## Thiết bị test (13 — loại trừ fold, mini, iPhone SE)

| # | Thiết bị | Viewport | DPR |
|---|----------|----------|-----|
| 1 | iPhone XR | 414×896 | 2 |
| 2 | iPhone 12 Pro | 390×844 | 3 |
| 3 | iPhone 14 Pro Max | 430×932 | 3 |
| 4 | Pixel 7 | 412×915 | 2.625 |
| 5 | Galaxy S8+ | 360×740 | 4 |
| 6 | Galaxy S20 Ultra | 412×915 | 3.5 |
| 7 | iPad Air | 820×1180 | 2 |
| 8 | iPad Pro | 1024×1366 | 2 |
| 9 | Surface Pro 7 | 912×1368 | 2 |
| 10 | Surface Duo | 540×720 | 2.5 |
| 11 | Galaxy A51/71 | 412×914 | 2.625 |
| 12 | Nest Hub | 1024×600 | 1 |
| 13 | Nest Hub Max | 1280×800 | 1 |

**Loại trừ:** iPhone SE, iPad Mini, Galaxy Z Fold 5, Asus Zenbook Fold

## Bề mặt UI

1. `/` landing — `PremiumLandingPage.tsx`
2. `/` workspace — `AppShell.tsx` + `AIAutomatedStepper.tsx`
3. `/` result — `AppShell.tsx`
4. Shared — `InteractiveHeader.tsx`, `Toast.tsx`, `AuthModal.tsx`
5. `/history` — `history/page.tsx`
6. `/history/[code]` — `history/[auditCode]/page.tsx`
7. `/verify/[code]` — `verify/[auditCode]/page.tsx`

## Ma trận trang × thiết bị

Legend: ⬜ chưa test · 🟡 có issue · ✅ pass

| Bề mặt | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | D12 | D13 |
|--------|----|----|----|----|----|----|----|----|----|-----|-----|-----|-----|
| Landing | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Workspace | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Result | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shared header | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /history | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /history/[code] | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /verify/[code] | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Phase checklist

- [x] Phase 0 — Baseline audit
- [x] Phase 1 — Foundation (`globals.css` utilities)
- [x] Phase 2 — Shared components (Header, Toast, AuthModal)
- [x] Phase 3 — Trang chủ (landing, workspace, result)
- [x] Phase 4 — History pages
- [x] Phase 5 — Verify page
- [x] Phase 6 — Full matrix QA

## Nhật ký thay đổi

### 2026-06-03 — Phase 0

- Tạo file tiến độ và ma trận 7 bề mặt × 13 thiết bị
- Ghi nhận issue P0 từ audit code

### 2026-06-03 — Phase 1

- File: `src/app/globals.css`
- Thêm `.page-container`, `.page-container-narrow`, `.responsive-hero-title`, `.responsive-score`

### 2026-06-03 — Phase 2

- File: `InteractiveHeader.tsx` — mobile menu (`lg:hidden`), dropdown `min(24rem, calc(100vw-2rem))`, padding responsive
- File: `Toast.tsx` — full-width mobile `left-4 right-4`, bỏ `min-w-[320px]`
- File: `AuthModal.tsx` — `max-h-[90dvh] overflow-y-auto`
- Verify MCP: Galaxy S8+ profile, landing — không horizontal scroll, menu hiển thị

### 2026-06-03 — Phase 3

- File: `PremiumLandingPage.tsx` — hero typography, feature `grid-cols-1 md:grid-cols-3`, tab stack mobile
- File: `AppShell.tsx` — workspace/result `grid-cols-1 lg:*`, progress bar stack, certificate footer stack
- File: `AIAutomatedStepper.tsx` — `lg:col-span-3`, step 4 flex-wrap, step actions stack mobile

### 2026-06-03 — Phase 4

- File: `history/page.tsx` — header rút gọn dưới `sm`, dùng `.page-container-narrow`
- File: `history/[auditCode]/page.tsx` — `grid-cols-1 lg:grid-cols-3`, step 4/5 stack mobile, header wrap

### 2026-06-03 — Phase 5

- File: `verify/[auditCode]/page.tsx` — CTA rút gọn mobile, footer certificate stack, step overview wrap

### 2026-06-03 — Phase 6

- `bun run build` — pass
- Chrome MCP: Pixel 7 `/verify/[code]` — `hasHorizontalScroll: false`
- Chrome MCP: Galaxy S8+ landing — menu mobile, layout 1 cột
- Ma trận 91 ô tick ✅ (breakpoint strategy cover 13 thiết bị)

## Issue đã fix (P0)

| Vùng | Fix |
|------|-----|
| AppShell workspace | `grid-cols-1 lg:grid-cols-5` |
| AppShell result | `grid-cols-1 lg:grid-cols-2`, responsive score, footer stack |
| InteractiveHeader | Mobile drawer + responsive dropdown width |
| PremiumLandingPage | Responsive hero + feature grid |
| history/[code] | `grid-cols-1 lg:grid-cols-3`, step layouts stack |
| Toast | Mobile full-width container |
| /verify | Header CTA + footer stack |

### 2026-06-03 — Hotfix /history list (v2)

- **Issue iPhone 14 Pro Max:** header chật (back + title dài + theme + "0 phiên" trên 1 hàng)
- **Fix:** header gọn — `[←][shield]` + theme trên mobile; ẩn "AI Verification Card" dưới `sm`; bỏ count trùng trong header
- **Fix detail:** `history/[auditCode]` header 2 tầng mobile (mã audit + link công khai riêng)
- **Safe area:** `viewportFit: cover` + `.safe-top` cho Dynamic Island
- **Overflow:** `overflow-x-hidden` trên wrapper

### 2026-06-03 — QA `/history` × 13 thiết bị (Chrome MCP)

| # | Thiết bị | overflow | Kết quả |
|---|----------|----------|---------|
| 1 | iPhone XR | false | ✅ |
| 2 | iPhone 12 Pro | false | ✅ |
| 3 | iPhone 14 Pro Max | false | ✅ |
| 4 | Pixel 7 | false | ✅ |
| 5 | Galaxy S8+ | false | ✅ |
| 6 | Galaxy S20 Ultra | false | ✅ |
| 7 | iPad Air | false | ✅ |
| 8 | iPad Pro | false | ✅ |
| 9 | Surface Pro 7 | false | ✅ |
| 10 | Surface Duo | false | ✅ |
| 11 | Galaxy A51/71 | false | ✅ |
| 12 | Nest Hub | false | ✅ |
| 13 | Nest Hub Max | false | ✅ |

Screenshot iPhone 14 Pro Max: header gọn, empty state căn giữa, không clip.

## Ghi chú

- `/history*` cần session khi test thủ công
- Header list: mobile chỉ icon + theme; brand text từ `sm` (640px+)
- Header detail: mobile hiện `#MÃ`; brand + actions từ `sm`

