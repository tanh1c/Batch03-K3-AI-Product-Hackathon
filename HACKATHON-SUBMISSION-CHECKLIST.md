# Checklist hoàn thiện bài nộp Hackathon

> Đối chiếu theo `04-rubric.md`. Dấu `[x]` chỉ được dùng khi có artifact trong repo để phúc khảo; lịch sử nộp checkpoint đúng hạn phải đối chiếu trên hệ thống nộp bài của từng thành viên.

## 1. Trạng thái artifact chính

- [x] `README.md` — tên nhóm, mã học viên, phân công, cách chạy và artifact index.
- [x] `spec.md` — đủ §1–§9, quality bar và changelog.
- [x] `demo-slides.pdf` — đúng 6 trang, byte-identical với bản export `visual-context-rescue-pitch.pdf`.
- [x] `codebase/` — prototype Working, AI thật và automated tests.
- [x] `evidence/` — phương pháp mining, script, output canonical, năm ví dụ và sample cross-check.
- [x] `eval/` — golden set, full results, trace redacted, failure analysis và independent review.
- [x] `validation/` — protocol, 5 phiếu, feedback log, summary và dry run.
- [x] `reflection/` — đủ reflection của 5 thành viên.

## 2. R1 — Bằng chứng và impact — 15 điểm

- [x] Evidence chuẩn B có mẫu số, rule kiểm lại được và script tái lập: `evidence/mining-method.md`, `evidence/mine-chatlog.mjs`, `evidence/mining-output.json`.
- [x] Có ít nhất 5 ví dụ nguyên văn ngắn với mã ẩn danh.
- [x] Đào Thị Trang và Vũ Tiến Dũng kiểm tra chéo 20 `turn_id`; không có bất đồng.
- [x] Pain nêu rõ ai — việc — vướng mắc — hậu quả trong `spec.md` §1.
- [x] Bảng impact có 3 ứng viên và số định lượng trong `spec.md` §2.
- [x] Giữ ứng viên bị loại và lý do chọn bằng evidence/số.
- [x] Claim mining được giới hạn đúng: chứng minh hành vi, không suy nguyên nhân kỹ thuật từ CSV.

## 3. R2 — Lát cắt và thiết kế — 15 điểm

- [x] Lát cắt đúng một câu: 1 user, 1 việc, 1 quyết định AI và 1 kết quả.
- [x] Có ít nhất 3 non-goal và bản build không vi phạm.
- [x] Chọn conditional automation theo cost-of-error.
- [x] Có 7 HAX/PAIR mappings.
- [x] Mỗi mapping trỏ tới file/function hoặc UI seam cụ thể trong `spec.md` §4b.
- [x] Mức prototype Working và ranh giới thật/mock được khai đúng.

## 4. R3 — Chỗ khó và kịch bản — 11 điểm

- [x] `spec.md` §5 có đủ 4 lớp taxonomy: nguồn sự thật, mơ hồ, ngoài phạm vi/thẩm quyền và domain.
- [x] Có 8 kịch bản, tối thiểu 2 kịch bản mỗi lớp.
- [x] Mỗi kịch bản có hành vi mong muốn và nguyên tắc liên quan.
- [x] `spec.md` §6 có happy path, low-confidence, failure và correction.
- [x] Prototype có provenance và recovery tương ứng, không chỉ mô tả trong spec.

## 5. R4 — Kiểm thử — 15 điểm

- [x] `eval/golden-set.json` có 20 case: 8 hard, 9 ordinary và 3 rare.
- [x] Có 12 case phát triển từ chatlog thật, vượt ngưỡng 10.
- [x] Mỗi chiều chất lượng có quy tắc kiểm chứng trong `spec.md` §7 và `eval/README.md`.
- [x] Chu Nguyễn Tuấn Anh và Lê Minh Ngọc chấm độc lập H01–H08; kết quả tại `eval/independent-review.md`.
- [x] Quality bar Direction B và Direction C được ghi bằng số, không hạ sau khi đo.
- [x] Run 01 lưu đủ mọi case và output, kể cả failure.
- [x] Direction B Run 01: 18/20, unsupported grounded 0, đạt bar.
- [x] Direction C Run 01: 9/12, chưa đạt bar 10/12; giữ nguyên 3 route mismatch.
- [x] Direction B hậu-C7: 19/20 nhưng chưa đạt hard bar vì R02 unsupported grounded.
- [x] Có phân tích nguyên nhân và không xóa case fail.

## 6. R5 — Prototype chạy được — 8 điểm

- [x] Flow chính chạy end-to-end theo lát cắt và không cần sửa dữ liệu giữa chừng.
- [x] Có AI call thật tại `/api/analyze`.
- [x] Có trace redacted tại `eval/real-call-trace.json`.
- [x] Trace không chứa API key, base64 ảnh, raw question hoặc raw upstream response.
- [x] Mức Working khớp hành vi thực tế.
- [x] Automated suite gần nhất: 140/140 pass.
- [x] Browser verification đã chạy với PDF 49 trang, Snip/Circle/candidate, whole-slide, zoom, stale-work và privacy.

## 7. R6 — Validation với user — 8 điểm

- [x] Có 5 người ngoài nhóm và 5 phiếu riêng trong `validation/`.
- [x] Feedback log có tên/vai, task, hành vi, quote nguyên văn và severity.
- [x] Các phiếu đánh dấu willing user; 5/5 hoàn thành task Direction B.
- [x] `validation/summary.md` giữ rõ giới hạn: chưa có usability study mới cho Direction C.
- [x] Có quyết định sản phẩm từ feedback trong `spec.md` §9.
- [x] Không tuyên bố backlog câu hỏi gợi ý đã được triển khai nếu UI chưa có.

## 8. R7 — Quy trình và repo — 3 điểm

- [x] Root có đủ cấu trúc chuẩn và `demo-slides.pdf`.
- [x] README có tên/mã học viên và owner cho spec, evidence, prompt/eval, code, validation và demo.
- [x] Reflection đủ 5 thành viên, mỗi file có vai trò, AI hỗ trợ và bài học từ failure thật.
- [x] Không commit `.env`, API key, data pack, raw crop/question hoặc browser profile.

## 9. CP1–CP6 — artifact có thể show

| Mốc | Artifact hiện có | Trạng thái artifact |
|---|---|---|
| CP1 · Canvas | `spec.md` §1, §2, §4, §8; `README.md` | Đủ nội dung; điểm đúng hạn phụ thuộc lịch sử nộp cá nhân |
| CP2 · Bấm được | `codebase/`, lịch sử commit prototype | Có flow và commit |
| CP3 · AI thật + lượt đo đầu | `eval/golden-set.json`, `run-01-results.json`, `real-call-trace.json` | Đủ |
| CP4 · Spec gần cuối | `spec.md`, evidence, impact, HAX/PAIR, quality bar | Đủ artifact; hạn commit đối chiếu git history |
| CP5 · Validation + dry run | `validation/feedback-log.md`, `validation/summary.md`, `validation/dry-run.md`, `demo-slides.pdf` | Đủ |
| CP6 · Demo | PDF 6 trang, 5 phút trình bày + 5 phút Q&A, case failure và case lạ | Đã chuẩn bị/dry run; kết quả demo chính thức không suy từ repo |

## 10. Reflection và phân vai demo

- [x] Chu Nguyễn Tuấn Anh — C0/C1/C2, integration và validation.
- [x] Đào Thị Trang — evidence/mining và C3/C4 detector.
- [x] Lê Minh Ngọc — prompt/eval, provider và Visual Tutor contract.
- [x] Vũ Tiến Dũng — nhóm trưởng, spec và C7 OCR/AI packaging.
- [x] Nguyễn Đức Chung — C5 accessible overlay, learner control và slides.
- [x] Mỗi thành viên có ít nhất một phần nói trong `validation/dry-run.md`.

## 11. Gate cuối trước khi nộp

- [x] Bài nộp có đầy đủ artifact R1–R7.
- [x] Kết quả chưa đạt quality bar được ghi trung thực.
- [x] Slide có 6 trang; dry run đủ 5 phút + 5 phút Q&A.
- [x] Có happy path, recovery/failure, phần trăm so với bar và case lạ cho giám khảo.
- [ ] Mỗi thành viên tự mở reflection và giải thích được phần có tên mình mà không đọc thuộc lòng.
- [ ] Mỗi thành viên xác nhận đã dùng đúng link repo và nộp checkpoint theo yêu cầu cá nhân.
- [ ] Chạy kiểm tra secrets/data cấm lần cuối ngay trước khi nộp.

Ba ô cuối là thao tác con người tại thời điểm nộp; không được tự động đánh dấu chỉ vì đã có file trong repo.
