# Visual Context Rescue — VLearn

Prototype giúp học viên hỏi AI về sơ đồ, hình ảnh và vùng nội dung nhìn thấy trong PDF mà không phải tự mô tả lại toàn bộ bằng chữ.

- **Nhóm:** F2 — Lab D305
- **Nhóm trưởng:** Vũ Tiến Dũng — `2A202602009`
- **Hướng đề bài:** A — VLearn
- **Loại:** Tối ưu tính năng có sẵn
- **AI Spec:** [`spec.md`](spec.md)
- **Rubric:** [`04-rubric.md`](04-rubric.md)

## Thành viên và phân công

| STT | Thành viên | Mã học viên | Phụ trách và phần code cần giải thích |
|---:|---|---|---|
| 1 | Chu Nguyễn Tuấn Anh | `2A202601755` | C0 selection contract, C1 Snip, C2 PDF context; review/tích hợp nhánh; validation |
| 2 | Đào Thị Trang | `2A202601809` | Evidence/mining; C3 image/vector detector và C4 text-region detector |
| 3 | Lê Minh Ngọc | `2A202601471` | Prompt/eval; AI provider và Visual Tutor contract |
| 4 | Vũ Tiến Dũng | `2A202602009` | Nhóm trưởng; spec; PDF reader và luồng frontend/demo |
| 5 | Nguyễn Đức Chung | `2A202601705` | C5 accessible selection overlay, C6 Circle bridge; demo/slides |

Mỗi thành viên phải giải thích được quyết định, giới hạn và cách kiểm thử phần có tên mình theo vibe-coding rule.

## Vấn đề và lát cắt

VLearn Tutor đã đọc được text được chọn nhưng chưa nhận đúng ngữ cảnh khi học viên muốn hỏi về sơ đồ, bảng hoặc hình ảnh trong PDF. Lát cắt working hiện tại cho phép học viên click một vùng hình trên slide demo, đặt câu hỏi và nhận câu trả lời multimodal có provenance hoặc hướng dẫn recovery thay vì để AI đoán.

## Trạng thái sản phẩm

### Working end-to-end — Direction B

- Đọc PDF, lazy render, text layer, điều hướng và zoom 60–150%.
- Chọn text để hỏi Tutor với context theo trang.
- Click vùng hình cấu hình sẵn trên slide demo, crop PNG và gửi Visual Tutor.
- AI trả đúng một trong bốn route: `VISUAL_GROUNDED`, `NEED_WIDER_REGION`, `NEED_BETTER_IMAGE`, `INSUFFICIENT`.
- Grounded answer có provenance slide; recovery có lý do và hành động tiếp theo.
- Bút, Circle, highlight và ghi chú theo trang.
- OpenAI, OpenRouter, Gemini trực tiếp và local 9router; không fallback chéo provider ở tầng ứng dụng.

### Direction C — working end-to-end trên PDF tải lên

- **C0–C2:** selection chuẩn hóa từ Snip/Circle, crop đúng canvas PDF và lấy text trong vùng.
- **C3–C5:** phát hiện local candidate text/image/vector và hiển thị bằng button accessible qua toggle `Gợi ý vùng`.
- **C6–C7:** Circle bridge và request metadata OCR-aware; vector dùng source `detected-image`.
- **C8:** chỉ khi học viên bấm Gửi mới chạy crop → `/api/analyze`; tạo/click selection không gọi AI. Recovery luôn quay lại Snip, không tự upload cả trang.
- Selection giữ đúng vị trí qua zoom, bị xóa khi đổi tài liệu và không được lưu cùng crop/text/câu hỏi vào `localStorage`.

## Kết quả đã đo

- Direction B Run 01 lịch sử: **18/20 = 90%**, unsupported grounded **0**, đạt bar.
- Direction C Run 01 với `openai/o4-mini`: **9/12 = 75%**, unsupported grounded **0**, **chưa đạt** bar 10/12; ba case recovery phân loại sai route.
- Direction B hậu-C7: **19/20 = 95%** nhưng **chưa đạt hard bar** vì case ảnh trắng `R02` bị trả `VISUAL_GROUNDED` với nội dung QEMU/GDB không có trong fixture.
- Automated suite hiện tại: **115/115 pass**; syntax và diff checks pass.
- Browser C8 với PDF thật 49 trang: candidate xuất hiện lazy ở trang 2/6/9; Snip, Circle, candidate, zoom 60/90/150%, recovery, đổi tài liệu, Direction B, privacy và mobile overflow đều pass; không có page error.
- Validation 5 người chỉ đo Direction B: **5/5** hoàn thành task; chưa có usability study mới cho Direction C.

Chi tiết nằm trong [`eval/README.md`](eval/README.md), các result/trace immutable trong [`eval/`](eval/) và [`validation/summary.md`](validation/summary.md).

## Chạy prototype

Yêu cầu Node.js 20 trở lên.

```bash
cd codebase
npm install
npm start
```

Mở `http://localhost:3000`. Cấu hình provider theo [`codebase/.env.example`](codebase/.env.example); không commit `.env` hoặc API key. Hướng dẫn đầy đủ tại [`codebase/README.md`](codebase/README.md).

Kiểm tra:

```bash
cd codebase
npm run check
npm test
```

## Kịch bản demo hiện tại

1. Upload PDF, bật `Gợi ý vùng` và chọn candidate text/image/vector trên một trang đã render.
2. Dùng Snip hoặc Circle chọn vùng khác; xác nhận chưa có request AI trước khi bấm Gửi.
3. Nhập câu hỏi và bấm Gửi để chạy crop + bounded text/OCR-aware metadata qua Visual Tutor.
4. Trình bày provenance của grounded route và recovery `Chọn lại bằng Snip`; thử zoom hoặc đổi tài liệu để thấy selection không bị dùng sai.
5. Mở slide demo 2 để chứng minh Direction B vẫn hoạt động, rồi trình bày trung thực hai gate AI hiện chưa đạt sau C7/C8.

## Artifact nộp bài

| Artifact | Nội dung |
|---|---|
| [`spec.md`](spec.md) | User/job, evidence, impact, thiết kế, risk, quality bar và changelog |
| [`codebase/`](codebase/) | Prototype và automated tests |
| [`eval/`](eval/) | Golden set 20 case, kết quả đủ từng case và trace redacted |
| [`validation/`](validation/) | Protocol, 5 phiếu, feedback log và summary |
| [`evidence/`](evidence/) | Phương pháp mining, output đếm được và script tái lập |
| [`reflection/`](reflection/) | Reflection cá nhân; các thành viên còn lại phải bổ sung trước nộp |

## Dữ liệu và quyền riêng tư

- Chỉ dùng dữ liệu trong `data/` hoặc dữ liệu giả tự sinh; không commit data pack vào repo nộp bài.
- Không cố suy ngược danh tính và không chia sẻ dữ liệu ra ngoài khóa học.
- Không tự động gửi toàn slide/PDF lên AI; chỉ gửi crop và context tối thiểu sau hành động submit rõ ràng.
- API key chỉ ở server. Không log hoặc persist raw crop, extracted/OCR text, raw question, API key hay upstream response body.
