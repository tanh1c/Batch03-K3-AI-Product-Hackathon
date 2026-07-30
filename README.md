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

### Direction C — package đã kiểm thử

- **C0:** normalized selection contract.
- **C1:** Snip hình chữ nhật trên PDF, giữ đúng vị trí khi zoom.
- **C2:** crop canvas PDF, lấy text giao vùng và đánh dấu khi cần OCR.
- **C3/C4:** phát hiện candidate image, vector và text region từ PDF.js.
- **C5:** overlay candidate bằng button accessible.

### Chưa hoàn thành end-to-end

- C6 Circle-to-selection đang chờ tích hợp.
- C7 OCR/multimodal request packaging chưa hoàn tất.
- C8 chưa nối detector → overlay → C2 → Tutor trên PDF tải lên.
- Vì vậy Snip/Circle và candidate detector trên PDF thật chưa tự gửi AI; tạo selection không phát sinh request Tutor.

## Kết quả đã đo

- Golden eval AI: **18/20 = 90%**, vượt quality bar **≥80%**.
- Hard constraint: **0** case thiếu căn cứ bị trả `VISUAL_GROUNDED`.
- Automated suite tại commit `ba2a1e3`: **79/79 pass**.
- PDF thật `01 - 4-day02-lecture-slides-v2.pdf`: render đủ **49 trang**, canvas và text layer hoạt động.
- Browser regression: upload, zoom, Snip, Read, Pen và Circle pass; không có page error hoặc request AI khi chỉ tạo Snip.
- Validation: **5/5** người ngoài nhóm hoàn thành task; chi tiết tại [`validation/summary.md`](validation/summary.md).

Chi tiết AI eval nằm trong [`eval/README.md`](eval/README.md), [`eval/run-01-results.json`](eval/run-01-results.json) và [`eval/run-01-summary.md`](eval/run-01-summary.md).

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

1. Upload một PDF và chứng minh reader, text layer, zoom, annotation hoạt động.
2. Chọn text rồi hỏi Tutor theo ngữ cảnh tài liệu.
3. Dùng Snip trên PDF để chứng minh normalized selection; giải thích rõ bước gửi Snip đến AI thuộc C8 và chưa hoàn tất.
4. Mở slide demo 2, click nhánh Machine Learning/Deep Learning và gửi câu hỏi Visual Tutor.
5. Trình bày grounded route và một recovery route, sau đó đối chiếu Run 01 đạt 90%.

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
