# Hướng dẫn làm Direction C cho cả nhóm

## 1. Trạng thái hiện tại

- Direction B là bản ổn định và không được làm hỏng.
- Thiết kế tổng thể Direction C nằm tại:
  `docs/superpowers/specs/2026-07-30-visual-context-rescue-direction-c-design.md`.
- Hiện mới có implementation plan chi tiết cho C0 tại:
  `docs/superpowers/plans/2026-07-30-direction-c-c0-selection-contract.md`.
- C0 đã được code và test ở máy của Tuấn Anh nhưng chưa commit.
- C1–C9 chưa có implementation plan riêng. Bảng dưới đây là hướng dẫn phân công và handoff, không thay thế plan test-first chi tiết của từng package.

**Không tách branch C1–C7 ngay.** Trước tiên phải có hai commit độc lập:

1. commit sửa PDF.js legacy build;
2. commit C0 selection contract.

Sau đó tất cả thành viên pull cùng commit nền mới nhất rồi mới tạo branch package.

## 2. Mục tiêu chung

Direction C cho phép người học chọn nội dung trên mọi PDF bằng bốn nguồn:

- kéo khung chữ nhật (Snip);
- khoanh tự do (Circle);
- bấm vùng hình được phát hiện;
- bấm vùng chữ được phát hiện.

Sau khi người học chủ động gửi câu hỏi, hệ thống chỉ crop vùng đã chọn, lấy phần text giao với vùng đó và gọi endpoint Visual AI hiện có. Không tự động gửi cả slide và không tạo endpoint AI thứ hai.

## 3. Contract chung bắt buộc

Mọi package phải trao đổi selection bằng đúng object này:

```js
{
  pageNumber: 2,
  source: "snip", // snip | circle | detected-image | detected-text
  bounds: { x: 0.12, y: 0.18, width: 0.46, height: 0.35 },
  label: "Vùng tự chọn",
  text: "",
  needsOcr: false,
}
```

Import factory và geometry từ:

```js
import {
  circlePointsToBounds,
  createSelection,
  intersectionRatio,
  rectToNormalizedBounds,
} from "../src/selection-geometry.mjs";
```

Quy tắc:

- Không tự tạo object selection bằng shape khác.
- `pageNumber` bắt đầu từ `1`.
- `bounds` luôn là tọa độ chuẩn hóa trong `[0, 1]`, không phải pixel CSS hay pixel canvas.
- `text` chỉ được C2 điền sau khi trích xuất context.
- `needsOcr` chỉ là `true` khi vùng chọn không có text-layer dùng được.
- `intersectionRatio(a, b)` là intersection-over-union (IoU).
- Không sửa contract C0 trên branch package; nếu contract có vấn đề, báo Tuấn Anh/Ngọc trước.

## 4. Phân chia package

| Package | Người phụ trách | Làm gì | Phụ thuộc | File được phép sửa |
|---|---|---|---|---|
| C0 | Chu Nguyễn Tuấn Anh | Contract và pure geometry (đã triển khai, chờ commit) | Không | `codebase/src/selection-geometry.mjs`, test tương ứng |
| C1 | Chu Nguyễn Tuấn Anh | Kéo khung Snip và phát selection | C0 | module Snip mới; wiring tối thiểu theo plan C1 |
| C2 | Chu Nguyễn Tuấn Anh | Crop canvas và lấy text trong vùng | C0 | `codebase/public/pdf-context.mjs`, test tương ứng |
| C3 | Đào Thị Trang | Phát hiện image/vector candidate | C0 | `codebase/public/pdf-regions.mjs`, detector tests/fixtures |
| C4 | Đào Thị Trang | Ghép text item thành text block | C0 | cùng module detector và tests của C3/C4 |
| C5 | Nguyễn Đức Chung | Overlay nút vùng gợi ý, focus/keyboard | C0; dùng fixture trước C3/C4 | `selection-overlay.mjs`, CSS và HTML hook tối thiểu |
| C6 | Lê Minh Ngọc | Đổi Circle hiện có thành selection gửi AI | C0, C2 | Circle integration theo plan C6 |
| C7 | Vũ Tiến Dũng | Đóng gói `needsOcr`, prompt và provenance | C0, C2 | visual request builder/tests và trace metadata |
| C8 | Chu Nguyễn Tuấn Anh | Ghép các module trong `app.js` | C1–C7 đã merge | `codebase/public/app.js` |
| C9 | Vũ Tiến Dũng | Eval Direction C và artifact demo | C8 | `eval/`, docs/artifacts liên quan |

C3 và C4 do cùng một người làm và cùng chạm `pdf-regions.mjs`, nên thực hiện tuần tự trên cùng branch detector hoặc tách hai commit liên tiếp; không mở hai branch sửa cùng file.

## 5. Thứ tự triển khai

```text
PDF.js fix ──> C0
               ├──> C1 ───────────────┐
               ├──> C2 ──> C6 ───────┤
               │       └──> C7 ───────┤
               ├──> C3/C4 ──> C5 ────┤
               └──> C5 dùng fixture ──┤
                                      └──> C8 ──> C9
```

Có thể làm song song sau khi C0 merge:

- Tuấn Anh: C1 rồi C2;
- Trang: C3 rồi C4;
- Chung: C5 bằng candidate fixture tĩnh;
- Dũng: C7 sau khi thống nhất output C2;
- Ngọc: chuẩn bị C6, nhưng chỉ nối thật sau khi C2 merge.

## 6. Output/handoff của từng package

### C1 — Snip

- Nhận pointer start/end và page rectangle.
- Dùng `rectToNormalizedBounds`.
- Trả selection có `source: "snip"`.
- Vùng quá nhỏ bị bỏ qua và không xóa selection hợp lệ trước đó.
- Không crop, không gọi AI và không tự giữ app state toàn cục.

### C2 — PDF context

Public handoff dự kiến:

```js
extractPdfContext(page, selection)
// -> { imageData, mediaType, text, needsOcr, pixelBounds }
```

- Chờ page render xong trước khi crop.
- Crop `.pdf-canvas`, không crop `.annotation-canvas`.
- Kết quả không phụ thuộc CSS zoom.
- Chỉ lấy text item giao với selection.
- Không gọi AI và không persist crop/text.

### C3/C4 — Detector

Output chung:

```js
[
  {
    id: "page-2-image-1",
    kind: "image", // image | text | vector
    bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
    label: "Vùng hình 1",
    confidence: 0.8,
  },
]
```

- Chỉ dùng PDF.js text items/operator list và heuristic cục bộ.
- Loại vùng quá nhỏ, gần bằng cả trang và near-duplicate theo IoU.
- Detector không gọi AI và không quyết định ý nghĩa nội dung.
- Không có candidate không phải là lỗi; Snip/Circle vẫn hoạt động.

### C5 — Overlay

- Render candidate thành button có thể focus và bấm bằng bàn phím.
- Dùng candidate fixture tĩnh trước khi detector merge.
- Khi detection mode tắt, overlay không chặn chọn text PDF.
- Phát callback với candidate; không import app state và không gọi AI.

### C6 — Circle

- Dùng normalized points của Circle hiện có.
- Dùng `circlePointsToBounds(points, padding)`.
- Trả selection có `source: "circle"`.
- Giữ nét vẽ để hiển thị, nhưng crop chỉ lấy bounding rectangle, không lấy annotation canvas.

### C7 — OCR/AI packaging

- Nếu C2 trả text rỗng, gửi `needsOcr: true` trong metadata/instruction.
- Vẫn dùng `/api/analyze` và contract bốn route hiện có.
- Không thêm Tesseract, endpoint OCR hoặc provider fallback.
- Trace chỉ ghi metadata; không ghi raw crop, OCR text hay câu hỏi thô.

### C8 — Integration

- `app.js` chỉ compose module, đổi mode/tool và giữ current selection.
- Không chuyển geometry, crop hoặc detector algorithm vào `app.js`.
- Direction B phải tiếp tục hoạt động.
- Detection không được tự gọi AI; chỉ submit rõ ràng của người học mới gọi.

### C9 — Eval

- 12 case Direction C riêng:
  - 4 mixed text/image;
  - 3 scanned/image-text;
  - 3 thiếu context hoặc không đọc được;
  - 2 detector miss/false-positive có manual fallback.
- Gate: ít nhất 10/12 pass, không crop sai trang, không grounded thiếu căn cứ.

## 7. Quy trình branch và pull request

Mỗi package dùng một branch/PR độc lập, ngoại trừ C3/C4 có thể dùng chung branch detector vì cùng owner và cùng file.

Ví dụ:

```bash
git switch main
git pull --ff-only
git switch -c direction-c/c2-pdf-context
```

Trước khi code:

1. đọc design tổng thể;
2. đọc plan riêng của package;
3. xác nhận dependency đã merge;
4. kiểm tra `git status` sạch;
5. viết test fail trước, sau đó mới viết production code.

Không đưa vào PR:

- file của package khác;
- `.env`, API key, crop hoặc PDF thật;
- refactor không liên quan;
- thay đổi Direction B ngoài wiring tối thiểu đã ghi trong plan.

## 8. Kiểm tra bắt buộc trước handoff

Trong thư mục gốc repository:

```bash
npm --prefix codebase run check
npm --prefix codebase test
git diff --check
git status --short
```

Ngoài automated tests, package UI phải được chạy trên trình duyệt với PDF thật và ghi rõ đã test gì. Không tuyên bố hoàn tất UI nếu chưa manual test.

Handoff trong PR cần ghi ngắn gọn:

```text
Package: C2
Produces: extractPdfContext(page, selection)
Consumes: C0 selection contract
Tests: focused test + full suite
Manual check: PDF/page/zoom cases đã thử
Known ceiling: giới hạn chủ động của heuristic hoặc UI
```

## 9. Quy tắc bảo mật và dữ liệu

- Chỉ dùng data trong `data/` hoặc data giả tự sinh — không data thật của người thật ngoài pack đã rà.
- Không chia sẻ ra ngoài khoá.
- Không commit data pack vào repo nộp bài.
- Không cố suy ngược danh tính từ dữ liệu đã ẩn danh.
- Không commit API key.
- Không gửi toàn slide/course lên AI tự động.
- Chỉ gửi crop và context tối thiểu sau hành động submit của người học.
- Không log hoặc persist raw image, extracted/OCR text hay upstream response body.

## 10. Plan còn cần viết

Trước khi từng package bắt đầu, cần tạo implementation plan test-first riêng cho:

- C1 Snip;
- C2 PDF crop/text;
- C3/C4 detector;
- C5 overlay;
- C6 Circle bridge;
- C7 OCR/AI packaging;
- C8 integration;
- C9 eval/artifacts.

Mỗi plan phải khóa exact interface, file ownership, test RED/GREEN, lệnh verification và handoff. Không dùng một plan lớn cho cả C1–C9 vì các thành viên cần triển khai và review độc lập.
