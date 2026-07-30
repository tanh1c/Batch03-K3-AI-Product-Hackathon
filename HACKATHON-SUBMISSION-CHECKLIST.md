# Checklist hoàn thiện bài nộp Hackathon

> Đối chiếu theo `README.md`, `02-guide.md`, `03-template-ai-spec.md` và `04-rubric.md`.
>
> Trạng thái hiện tại: **MVP kỹ thuật hướng B đã chạy end-to-end**, nhưng **bài nộp chưa hoàn thiện** vì thiếu phần lớn artifact dùng để chấm R1, R2, R3, R4, R6 và R7.

## 0. Phạm vi MVP hiện tại

### Đã hoàn thành

- [x] Học viên chọn một vùng hình trên slide mẫu.
- [x] Browser crop vùng đã chọn thành PNG và chỉ gửi phần cần thiết lên server.
- [x] Có lời gọi AI thật tại quyết định trung tâm qua `/api/analyze`.
- [x] AI trả đúng một trong bốn route: `VISUAL_GROUNDED`, `NEED_WIDER_REGION`, `NEED_BETTER_IMAGE`, `INSUFFICIENT`.
- [x] Server post-validate đủ bốn trường `route`, `answer`, `reason`, `recovery_action`.
- [x] Kết quả grounded hiển thị provenance theo slide; case thiếu ngữ cảnh có đường chọn vùng rộng hơn.
- [x] Credential nằm ở server; trace runtime không lưu câu hỏi hoặc ảnh gốc.
- [x] Có test tự động cho provider, visual contract, route, crop geometry và trace.
- [x] OpenRouter `openai/o4-mini` đã được smoke-test cho luồng text và visual.

### Giới hạn phải khai trung thực

- [x] Ghi trong `spec.md` rằng mức prototype là **Working cho luồng chọn vùng được định nghĩa sẵn trên slide demo**.
- [x] Ghi rõ phần thật: crop ảnh, AI call, routing, validation, provenance và recovery.
- [x] Ghi rõ phần giới hạn: chưa tự phát hiện mọi vùng ảnh trên PDF; automatic segmentation hướng C là non-goal/stretch.
- [x] Bổ sung yêu cầu output tiếng Việt vào visual instruction và test tương ứng trước demo.
- [x] Kiểm tra bốn đường đi đều có thể trình diễn: happy, low-confidence, failure và correction.

---

## 1. P0 — Hoàn thiện `spec.md` trước tiên

Tạo `spec.md` ở root theo đúng §1-§9 của `03-template-ai-spec.md`.

### §1. User & Job — R1

- [ ] Chỉ rõ một job executor cụ thể, không viết “học viên nói chung”.
- [ ] Viết Core JTBD không chứa tên VLearn hoặc AI.
- [ ] Viết pain theo format: **ai — đang làm gì — vướng đâu — hậu quả gì**.
- [ ] Chọn và hoàn thành ít nhất một chuẩn evidence:
  - [ ] **Đường B khuyến nghị:** mining có số đếm, mẫu số, quy tắc phân loại kiểm lại được và ít nhất 5 ví dụ nguyên văn ngắn.
  - [ ] Hoặc **Đường A:** khảo sát ít nhất 20 người ngoài nhóm, ít nhất 50% xác nhận và log đủ từng câu trả lời nguyên văn.
- [ ] Trỏ từ `spec.md` đến log evidence trong repo.

### §2. Impact & quyết định chọn — R1

- [ ] Lập bảng ít nhất 3 ứng viên.
- [ ] Mỗi ứng viên có số: số người gặp × tần suất × chi phí mỗi lần × khả năng build.
- [ ] Giữ lại ít nhất 2 ứng viên bị loại và lý do loại bằng số/evidence.
- [ ] Giải thích vì sao chọn Visual Context Rescue bằng số, không chỉ bằng cảm nhận.

### §3. Giải pháp tương tự

- [ ] Nghiên cứu ít nhất 2 sản phẩm gần bài toán, ví dụ NotebookLM và ChatGPT Study Mode.
- [ ] Với mỗi sản phẩm ghi đủ: flow, điểm đáng học, điểm đáng né, khác biệt của nhóm.
- [ ] Chỉ ghi điều đã thực sự quan sát; không tự dựng claim.

### §4. Thiết kế — R2

- [ ] Chốt lát cắt trong đúng **một câu**, gồm 1 user, 1 việc, 1 quyết định AI và 1 kết quả.
- [ ] Bảo đảm lát cắt khớp đúng bản build chọn-vùng-hình hiện tại.
- [ ] Khai ít nhất 3 non-goals, nên gồm:
  - [ ] Không tự động segment toàn bộ slide trong MVP.
  - [ ] Không OCR PDF scan trong MVP.
  - [ ] Không thay thế giảng viên/TA hoặc trả lời ngoài nội dung hình/tài liệu.
- [ ] Chọn automation **conditional** và giải thích theo cost-of-error: đủ căn cứ thì trả lời; thiếu căn cứ thì yêu cầu sửa input hoặc từ chối.
- [ ] Khai mức prototype và ranh giới thật/mock như mục 0.
- [ ] Ánh xạ ít nhất 4 HAX/PAIR vào vị trí cụ thể trong prototype, ví dụ:
  - [ ] G1 — phạm vi “hỏi về vùng hình đã chọn” tại vùng chọn/prompt.
  - [ ] G2 — provenance “Dựa trên vùng hình ở slide N” tại thẻ kết quả.
  - [ ] G10 — bốn recovery route khi AI không chắc.
  - [ ] G9 — nút chọn vùng rộng hơn/hỏi lại ngay trên output.
  - [ ] G11 — `reason` giải thích vì sao AI trả lời hoặc chưa trả lời.

### §5. Bốn lớp chỗ khó và kịch bản — R3

- [ ] Cụ thể hóa đủ 4 lớp cho Visual Tutor:
  - [ ] ① Nguồn sự thật/căn cứ hình ảnh.
  - [ ] ② Vùng chọn mơ hồ hoặc thiếu thông tin.
  - [ ] ③ Câu hỏi ngoài phạm vi/thẩm quyền.
  - [ ] ④ Rủi ro sai kiến thức chuyên môn.
- [ ] Viết ít nhất 8 kịch bản, tối thiểu 2 kịch bản cho mỗi lớp.
- [ ] Mỗi dòng có: tình huống cụ thể, lớp, hành vi mong muốn, thông báo hiển thị, hành động tiếp theo và nguyên tắc HAX/PAIR.
- [ ] Có ít nhất một case đáng sợ khi demo, ví dụ AI suy diễn nhãn bị cắt khỏi sơ đồ.

### §6. Bốn đường đi trải nghiệm — R3

- [ ] Happy path: ảnh đủ rõ và đủ ngữ cảnh → grounded answer + provenance.
- [ ] Low-confidence: thiếu nhãn/chú giải → `NEED_WIDER_REGION` + chọn vùng rộng hơn.
- [ ] Failure: ảnh mờ/quá nhỏ hoặc không có căn cứ → `NEED_BETTER_IMAGE`/`INSUFFICIENT`.
- [ ] Correction: user đổi vùng hoặc câu hỏi rồi gửi lại.
- [ ] Mô tả thêm cách xử lý yêu cầu ngoài phạm vi và case đặc thù domain.
- [ ] Xác minh từng đường đi có thể thao tác trong prototype, không chỉ tồn tại trên spec.

### §7. Kiểm thử — R4

- [ ] Định nghĩa từng chiều chất lượng bằng quy tắc để hai người chấm độc lập ra cùng kết quả.
- [ ] Trỏ đến `eval/golden-set.json` và toàn bộ kết quả trong `eval/`.
- [ ] Chốt quality bar bằng số **trước khi chạy lượt chính thức**.
- [ ] Ghi rõ quality bar không được hạ sau khi thấy kết quả.
- [ ] Cập nhật bảng kết quả từng lượt, kể cả khi không đạt bar.

Gợi ý quality bar để nhóm cân nhắc và chốt, không được ghi là kết quả đo sẵn:

> Đạt khi ít nhất 80% case pass toàn bộ tiêu chí, đồng thời 100% case thiếu căn cứ không được trả route `VISUAL_GROUNDED`.

### §8. Phân công & validation plan — R7/CP5

- [ ] Điền tên thật cho owner của: spec, evidence, prompt/eval, code, validation và demo.
- [ ] Liệt kê ít nhất 3 willing users dự kiến, trong đó đánh dấu ai đã khai từ CP1.
- [ ] Ghi 3 câu hỏi validation và người chịu trách nhiệm log.
- [ ] Nếu có multi-prototype, giữ phương án bị loại và lý do chọn; nếu không làm thì ghi rõ không làm.

### §9. Changelog — R6

- [ ] Ghi mỗi thay đổi với thời điểm, nội dung đổi và feedback/eval case làm căn cứ.
- [ ] Có ít nhất một thay đổi từ validation, hoặc quyết định giữ nguyên kèm lý do có căn cứ.

---

## 2. P0 — Tạo evidence/mining log — R1: 15 điểm

Tạo thư mục `evidence/`; không commit toàn bộ data pack vào repo nộp.

- [x] Tạo `evidence/mining-method.md` mô tả nguồn, mẫu số, tiêu chí tính một hit, tiêu chí loại và cách kiểm lại.
- [x] Tạo `evidence/mining-output.json` chứa số tổng hợp và mã hội thoại/turn đã ẩn danh.
- [x] Giữ ít nhất 5 quote/ví dụ nguyên văn **ngắn**, đủ để chứng minh pattern.
- [x] Không ghi tên thật, không suy ngược danh tính, không chép đoạn hội thoại dài.
- [ ] Hai thành viên kiểm tra chéo một mẫu nhỏ và ghi kết quả để chứng minh phương pháp tái lập được.
- [x] Dùng số evidence thật để điền pain và bảng impact; không tạo số giả.

---

## 3. P0 — Tạo golden set và chạy eval — R4: 15 điểm

Tạo thư mục `eval/`.

### Golden set

- [x] Tạo `eval/golden-set.json` có ít nhất 20 case.
- [x] Cơ cấu đủ 20 case:
  - [x] 8 case khó: 2 case cho mỗi lớp ①②③④.
  - [x] 9 case thường.
  - [x] 3 case hiếm.
- [x] Ít nhất 10 case lấy hoặc phát triển từ chatlog thật; chỉ lưu mã tham chiếu ẩn danh và trích đoạn tối thiểu.
- [x] Mỗi case có: ID, nguồn, lớp, input/câu hỏi, loại ảnh/vùng, route mong đợi và tiêu chí pass.
- [x] Không đưa full chatlog hoặc dữ liệu ngoài pack vào repo/API.

### Tiêu chí chấm kiểm chứng được

- [x] `route_correct`: route đúng với mức đủ căn cứ.
- [x] `grounded`: mọi ý của grounded answer nhìn thấy hoặc suy ra trực tiếp từ vùng hình/tài liệu.
- [x] `recovery_actionable`: recovery nói được user cần làm gì tiếp theo.
- [x] `language_vi`: output hướng đến người học bằng tiếng Việt.
- [x] `contract_valid`: đúng bốn field và đúng quy tắc answer/reason/recovery.
- [ ] Hai người chấm độc lập ít nhất 5 case khó; nếu lệch thì sửa định nghĩa trước lượt chính thức.

### Chạy và lưu kết quả

- [x] Chạy trọn bộ ít nhất một lượt sau khi quality bar đã chốt.
- [x] Tạo `eval/run-01-results.json` chứa đủ mọi case, input reference, output, pass/fail từng chiều và lý do.
- [x] Tính phần trăm pass tổng và đối chiếu quality bar: 18/20 = 90%, đạt bar.
- [x] Không xóa case fail và không đổi bar để làm số đẹp.
- [ ] Nếu sửa prompt/code sau run 01, chạy lại toàn bộ và lưu `eval/run-02-results.*` riêng.
- [x] Phân tích ít nhất một failure quan trọng để dùng trong slide và reflection.

### Bằng chứng AI thật — R5

- [x] Tạo một trace đã redacted tại `eval/real-call-trace.json`; cần commit cùng artifact.
- [x] Trace chỉ chứa metadata an toàn: thời gian, provider, model, run ID, question-set hash, image byte count và thống kê route.
- [x] Không chứa API key, ảnh base64, câu hỏi gốc hoặc upstream response body.

---

## 4. P0 — Validation với ít nhất 5 người — R6: 8 điểm

Tạo thư mục `validation/`.

- [x] Test với ít nhất 5 người ngoài nhóm; ưu tiên 3 willing users từ CP1 và thành viên nhóm khác.
- [x] Có ít nhất 2 willing users đã khai từ CP1 trong số người test nếu CP1 đã đăng ký họ.
- [x] Mỗi phiên giao một task thật rồi im lặng quan sát, không hướng dẫn thao tác.
- [ ] Hỏi đúng ba câu:
  - [ ] Điều gì khó hiểu hoặc khó chịu nhất?
  - [ ] Kết quả này bạn có tin không — vì sao?
  - [ ] Bạn có dùng thật không — vì sao/vì sao chưa?
- [x] Tạo `validation/feedback-log.md` với tên/vai, willing user hay không, task, quan sát, quote nguyên văn và mức nghiêm trọng.
- [x] Tổng hợp chủ đề lặp, thay đổi trước demo, quyết định giữ nguyên và backlog.
- [x] Đưa ít nhất một quyết định vào `spec.md` §9 Changelog.
- [x] Không tạo feedback giả hoặc viết lại quote cho đẹp.

---

## 5. P1 — Hoàn thiện cấu trúc repo — R7: 3 điểm

- [ ] Sửa root `README.md` thành README bài nộp hoặc thêm phần bài nộp ở đầu file.
- [ ] Liệt kê mã học viên + tên của mọi thành viên.
- [ ] Gắn tên owner cụ thể cho từng phần: spec, evidence, prompt/eval, code, validation, slide/demo.
- [ ] Hướng dẫn chạy `codebase/` và khai rõ phần thật/mock.
- [ ] Bảo đảm root có đủ:
  - [ ] `README.md`
  - [ ] `spec.md`
  - [ ] `demo-slides.pdf`
  - [x] `codebase/`
  - [ ] `eval/`
  - [ ] `validation/`
  - [ ] `reflection/`
- [ ] Soát repo không có `.env`, API key, raw trace, browser profile hoặc bản sao data pack bị cấm trong repo nộp.

---

## 6. P1 — Reflection cá nhân

Tạo thư mục `reflection/`, mỗi thành viên một file.

- [ ] Tên file có mã học viên hoặc tên không gây nhầm lẫn.
- [ ] Mỗi reflection nêu vai trò và phần mình thực sự làm.
- [ ] Nêu AI đã hỗ trợ thế nào; không nhận phần AI làm là tự làm tay.
- [ ] Nêu một bài học từ case fail thật của nhóm, ví dụ crop SVG quá nhỏ hoặc model trả thiếu field.
- [ ] Mỗi người tự giải thích được phần có tên mình trước CP5/CP6.

---

## 7. P1 — Slide 6 trang và dry run

Tạo đúng một file `demo-slides.pdf` gồm 6 trang; mỗi trang có ít nhất một số, quote có nguồn hoặc kết quả đo.

- [ ] Trang 1 — User & Job: JTBD + số pain.
- [ ] Trang 2 — Vì sao chọn: bảng impact 3 ứng viên + ứng viên bị loại.
- [ ] Trang 3 — Giải pháp và demo: lát cắt + conditional automation + 1 happy case + 1 hard/failure case.
- [ ] Trang 4 — Kết quả đo: phần trăm pass so với quality bar + failure lớn nhất.
- [ ] Trang 5 — User thật nói gì: ít nhất 2 quote validation + thay đổi đã làm.
- [ ] Trang 6 — Nếu có thêm một tuần: 2-3 ưu tiên trỏ về feedback/failure; automatic segmentation C chỉ đưa ở đây nếu evidence ủng hộ.
- [ ] Chuẩn bị backup screenshot/video ngắn khi demo live lỗi.
- [ ] Dry run đủ 5 phút trình bày + 5 phút Q&A và ghi thời lượng vào `validation/dry-run.md`.
- [ ] Mỗi thành viên nói ít nhất một phần.
- [ ] Chuẩn bị trả lời: vì sao conditional, failure nguy hiểm nhất, mỗi người đã làm gì.
- [ ] Chuẩn bị một case lạ để giả lập thẻ giám khảo chạy tại chỗ.

---

## 8. Thứ tự làm ngắn nhất để tối đa điểm

1. [ ] Chốt owner và willing users; điền README/spec §8.
2. [ ] Mining evidence chuẩn B; hoàn tất spec §1-§2.
3. [ ] Hoàn tất spec §3-§6 và ánh xạ HAX/PAIR.
4. [ ] Viết định nghĩa chất lượng, tạo 20 golden cases và **chốt numeric quality bar** trong spec.
5. [ ] Commit `spec.md` trước hạn cứng nếu thời gian checkpoint còn hiệu lực.
6. [ ] Chạy eval trọn bộ, lưu mọi pass/fail và commit redacted real-call trace.
7. [ ] Test với 5 người, ghi quote thật và cập nhật changelog.
8. [ ] Sửa duy nhất lỗi có impact cao từ eval/validation; không thêm segmentation C.
9. [ ] Tạo reflections, slide 6 trang, backup demo và dry run.
10. [ ] Soát an toàn dữ liệu, chạy test ứng dụng và kiểm tra cấu trúc repo cuối.

---

## 9. Bảng tự chấm trước khi nộp

| Khối | Điểm | Artifact bắt buộc | Trạng thái hiện tại |
|---|---:|---|---|
| R1 Evidence & impact | 15 | `spec.md` §1-§2 + `evidence/` | Chưa đủ |
| R2 Lát cắt & thiết kế | 15 | `spec.md` §4 | Có thiết kế nguồn, chưa có spec chấm điểm |
| R3 Chỗ khó & kịch bản | 11 | `spec.md` §5-§6 | Có contract kỹ thuật, chưa đủ ≥8 kịch bản/spec |
| R4 Kiểm thử | 15 | `spec.md` §7 + `eval/` | Có unit test, chưa có golden-set/eval rubric |
| R5 Prototype | 8 | `codebase/` + demo + real-call trace | MVP gần đủ; thiếu trace redacted trong repo và khai mức prototype |
| R6 Validation | 8 | `validation/` + changelog | Có 5 phiên ngoài nhóm, feedback log và quyết định changelog; còn thiếu 3 câu trả lời có lý do |
| R7 Quy trình/repo | 3 | cấu trúc chuẩn + README phân công | Chưa đủ |

## 10. Gate hoàn tất cuối cùng

Chỉ gọi là **bài nộp hoàn thiện** khi tất cả điều sau đúng:

- [ ] MVP chạy end-to-end không cần can thiệp tay giữa chừng.
- [ ] Có real AI trace an toàn trong repo.
- [ ] `spec.md` đủ §1-§9 và quality bar đã chốt.
- [ ] Evidence đạt chuẩn A hoặc B.
- [ ] Golden set đủ ≥20, ≥10 case từ chatlog và có ít nhất một lượt kết quả đầy đủ.
- [ ] Validation đủ ≥5 người và changelog có quyết định từ feedback.
- [ ] README có thành viên/phân công; reflection đủ từng người.
- [ ] `demo-slides.pdf` đúng 6 trang và dry run đã hoàn tất.
- [ ] Repo không chứa key, `.env`, raw image/question trace hoặc dữ liệu bị cấm commit.
