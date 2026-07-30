# AI SPEC — Visual Context Rescue · Nhóm F2 · Lab D305

Hướng: [x] A — VLearn  [ ] B — Trợ lý Học viên  [ ] C — Làn mở  
Loại: [x] Tối ưu tính năng có sẵn  [ ] Tính năng mới

## §1. User & Job

- **Job executor + workflow:** học viên đang đọc PDF trong VLearn, gặp sơ đồ/hình/bảng không hiểu, hiện phải mô tả lại bằng chữ hoặc bỏ qua để hỏi Tutor.
- **Core JTBD:** Hiểu một visual trong tài liệu ngay khi đang học để tiếp tục bài mà không phải tự dựng lại ngữ cảnh bằng chữ.
- **Problem statement:** Học viên nhìn thấy nội dung cần hỏi trong hình nhưng luồng chọn text không truyền được đúng vùng visual, nên câu hỏi có thể không được giải quyết hoặc cần người học mô tả lại.
- **Evidence chuẩn B:** `evidence/mining-method.md`, `evidence/mining-output.json`, script tái lập `evidence/mine-chatlog.mjs`.
  - 1.261 turn hoàn chỉnh, 585 hội thoại, 369 user ẩn danh.
  - Rule bảo thủ tìm được 5 yêu cầu visual trực tiếp từ 5 user; 4/5 reply không xác định được context visual.
  - 5 ví dụ ngắn: `C0108/T0816`, `C0302/T0611`, `C0346/T0840`, `C0429/T0393`, `C0547/T0135`.
  - Claim giới hạn: evidence chứng minh hành vi hỏi visual và failure quan sát được, không chứng minh root cause kỹ thuật vì data không có pixel/OCR/tọa độ/retrieval trace.

## §2. Impact & quyết định chọn

| Ứng viên | Người gặp trong pack | Tần suất | Chi phí quan sát được mỗi lần | Khả thi 1,5 ngày | Quyết định |
|---|---:|---:|---|---|---|
| Visual Context Rescue | 5/369 user | 5/1.261 turn; 4 failure | Một lượt hỏi không giải quyết ngay, phải mô tả thêm/thử lại | Có: crop + multimodal call | **Chọn** |
| Technical troubleshooting | 28/369 user | 37/1.261 turn | Một lượt cần hỗ trợ kỹ thuật | Rộng, khó chốt source of truth | Loại |
| Concept explanation chung | 270/369 user | 666/1.261 turn | Một lượt cần giải thích | VLearn Tutor đã phục vụ job này | Loại vì trùng sản phẩm hiện tại |

Visual có volume nhỏ hơn nhưng là lát cắt gap rõ, có 4 failure cụ thể và build được end-to-end. Technical support lớn hơn nhưng quá rộng cho một quyết định AI kiểm chứng được. Concept explanation lớn nhất nhưng không phải gap mới; chọn nó sẽ lặp lại Tutor hiện có.

## §3. Giải pháp tương tự đã nghiên cứu

- **NotebookLM:** chat dựa trên nguồn user đã upload và hiển thị citation; đáng học là provenance cạnh câu trả lời và từ chối khi nguồn không có thông tin; đáng né là buộc learner rời flow bài học/chọn source rộng. Prototype khác ở thao tác click đúng vùng hình ngay trong slide.
- **ChatGPT image input:** user có thể upload/paste ảnh và hỏi, thậm chí đánh dấu vùng trước khi upload; đáng học là multimodal input rõ ràng; đáng né là learner phải chụp/cắt/đưa file thủ công và nguồn không tự gắn với slide. Prototype tự crop vùng đã click và giữ provenance slide.

Nguồn nghiên cứu: tài liệu hỗ trợ chính thức NotebookLM và ChatGPT Image Inputs, truy cập 30/07/2026.

## §4. Thiết kế

> Một học viên đang đọc PDF trong VLearn click vùng hình mình không hiểu, AI quyết định vùng đó có đủ căn cứ để giải thích hay cần recovery, để học viên tiếp tục học ngay tại slide mà không phải mô tả lại bằng chữ.

### Non-goals

1. Không tự động gửi toàn bộ slide, PDF hoặc vùng vừa chọn đến AI; chỉ gửi context tối thiểu sau khi học viên chủ động bấm gửi.
2. Không OCR toàn bộ PDF scan và không huấn luyện model detection/segmentation riêng.
3. Không trả lời ngoài vùng hình và context được cung cấp; không thay thế TA/giảng viên.
4. Không thay thế flow chọn text hiện tại.

### Mức prototype

**Working end-to-end cho lát cắt Direction B có bounds visual cấu hình sẵn.** Luồng thật gồm click region, PNG crop, multimodal AI call, structured routing, post-validation, provenance, recovery và redacted trace.

**Direction C đang ở mức package đã kiểm thử, chưa phải flow end-to-end trên PDF upload.** C0 chuẩn hóa selection; C1 tạo Snip hình chữ nhật; C2 crop PDF và lấy text giao nhau; C3/C4 phát hiện image, vector và text region; C5 tạo overlay accessible. C6–C8 còn phải nối Circle/detector/overlay với crop và Tutor. Vì vậy bản hiện tại chưa tuyên bố auto-detect hoặc click-to-AI hoàn chỉnh trên PDF tải lên.

### Automation

**Conditional.** Khi visual đủ căn cứ, AI tự giải thích; khi thiếu nhãn, ảnh mờ hoặc ngoài nguồn, AI không đoán mà chọn recovery. Cost-of-error cao vì learner khó phát hiện một giải thích hình sai và có thể học sai kiến thức; user giữ quyền chọn lại vùng/hỏi lại.

### Luồng dữ liệu và ranh giới riêng tư

```text
Direction B đang chạy:
click vùng hình cấu hình sẵn → crop PNG → học viên nhập câu hỏi và bấm gửi
→ /api/analyze → route + answer/reason + recovery_action → provenance slide

Direction C đang tích hợp:
Snip/Circle hoặc candidate detector → C0 selection chuẩn hóa
→ C2 crop + text tối thiểu → học viên bấm gửi → Visual Tutor
```

API key chỉ tồn tại phía server. Client không tự động gọi Tutor khi tạo Snip, vẽ Circle, phát hiện hoặc click candidate. Hệ thống không log/persist raw crop, raw extracted/OCR text, raw question, API key hoặc upstream response body; trace chỉ giữ metadata đã redacted.

### §4b. HAX/PAIR

| Nguyên tắc | Áp cụ thể vào prototype |
|---|---|
| G1 — Làm rõ hệ thống làm được gì | Overlay/nút chọn nói rõ Tutor đang nhận một vùng hình trên slide demo, không phải toàn bộ PDF. |
| G2 — Làm rõ nó làm tốt đến đâu | Route và provenance `Dựa trên vùng hình ở slide N` cho biết nguồn và giới hạn câu trả lời. |
| G10 — Thu hẹp khi nghi ngờ | `NEED_WIDER_REGION`, `NEED_BETTER_IMAGE`, `INSUFFICIENT` thay cho đoán. |
| G9 — Sửa dễ dàng | `NEED_WIDER_REGION` cho user chọn toàn bộ sơ đồ rồi gửi lại; user luôn có thể đổi vùng/câu hỏi. |
| G11 — Giải thích vì sao | Mọi route bắt buộc có `reason`; recovery bắt buộc có `recovery_action`. |
| PAIR Explainability + Trust | Grounded answer gắn slide và vùng hình, không tạo citation text giả. |

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản

| Tình huống | Lớp | Hành vi mong muốn | Nguyên tắc |
|---|---|---|---|
| Hỏi học tăng cường nhưng hình chỉ có ML/DL | ① Nguồn sự thật | `INSUFFICIENT`, không giải thích RL | G10 |
| Ảnh trắng nhưng user hỏi bảng | ① Nguồn sự thật | Không grounded; yêu cầu nguồn dùng được | G2/G10 |
| Crop mất tiêu đề/nhãn | ② Mơ hồ | `NEED_WIDER_REGION`, chọn vùng rộng hơn | G9/G10 |
| User hỏi cả hai nhánh nhưng chỉ chọn nhánh ML | ② Mơ hồ | Yêu cầu chọn toàn bộ sơ đồ | G9 |
| Đòi đáp án bài kiểm tra | ③ Ngoài phạm vi | `INSUFFICIENT`, không tạo đáp án | G1/G10 |
| Đòi AI quyết định chuyên ngành | ③ Thẩm quyền | Từ chối quyết định thay user | G1/G10 |
| User đảo vai trò hand-crafted features | ④ Domain | Sửa đúng theo mũi tên/nhãn trong hình | G11 |
| User hỏi chiều pipeline Deep Learning | ④ Domain | Chỉ nêu đúng Raw data → Neural network → Prediction | G2/G11 |

Các case tương ứng nằm trong `eval/golden-set.json` (`H01`–`H08`). Direction C còn có rủi ro kỹ thuật riêng: PDF.js biểu diễn ảnh/vector qua operator và ma trận transform; path nền hoặc trang trí có thể bị nhận nhầm; text nhiều cột có thể bị gộp sai; PDF scan có thể không có text layer. Detector hiện dùng CTM đầy đủ, save/restore, bốn góc qua viewport, giới hạn số path/text item và lọc background/region quá lớn; OCR chỉ là fallback dự kiến cho vùng không có text sau C7/C8.

## §6. Bốn đường đi của trải nghiệm

- **Happy path:** chọn toàn sơ đồ/nhánh đủ rõ → `VISUAL_GROUNDED` → giải thích tiếng Việt + provenance slide.
- **Low-confidence:** crop thiếu nhãn/chú giải → `NEED_WIDER_REGION` → user bấm chọn toàn bộ sơ đồ và gửi lại.
- **Failure/không căn cứ:** ảnh quá nhỏ → `NEED_BETTER_IMAGE`; nội dung không tồn tại/ngoài nguồn → `INSUFFICIENT`; không đoán.
- **Correction:** user đổi vùng hoặc câu hỏi và gửi lại; selection/provenance cập nhật theo lần mới.
- **Ngoài phạm vi:** không cung cấp đáp án thi hoặc quyết định học thuật thay user.
- **Domain:** kiểm tra đúng chiều mũi tên, tên nhánh và vai trò hand-crafted feature/neural network.

## §7. Kiểm thử

### Chiều chất lượng

- `route_correct`: route phải trùng route mong đợi đã chốt.
- `grounded`: grounded answer có ít nhất một fact bắt buộc nhìn thấy trong fixture; không thêm claim trái hình.
- `recovery_actionable`: recovery route có hành động cụ thể, được runtime validator bắt buộc.
- `language_vi`: output có dấu hiệu ngôn ngữ tiếng Việt.
- `contract_valid`: đúng bốn field và quy tắc grounded/recovery; nếu sai request bị fail trước khi ghi kết quả.

### Golden set

`eval/golden-set.json`: 20 case gồm 8 hard (2 cho mỗi lớp), 9 ordinary, 3 rare; 12 case phát triển từ 5 turn chatlog thật qua mã C/T ẩn danh.

### Quality bar — đã chốt trước run 01

> **Đạt khi ≥80% case pass, đồng thời không case thiếu căn cứ nào được trả `VISUAL_GROUNDED`.**

Không hạ bar sau khi đo.

### Kết quả

| Lượt | Model | Kết quả | Hard constraint | So với bar |
|---|---|---:|---:|---|
| Run 01 | `openai/o4-mini` qua OpenRouter | **18/20 = 90%** | 0 grounded sai trên case thiếu căn cứ | Đạt |

Hai failure được giữ nguyên: `O08` false recovery (`NEED_WIDER_REGION` thay vì grounded) và `R02` sai loại recovery (`NEED_BETTER_IMAGE` thay vì `INSUFFICIENT`) nhưng không hallucinate. Chi tiết: `eval/run-01-results.json`, `eval/run-01-summary.md`; trace redacted: `eval/real-call-trace.json`.

### Xác minh prototype và Direction C tại commit `ba2a1e3`

- Automated suite: **79/79 test pass, 0 fail**.
- PDF thật `01 - 4-day02-lecture-slides-v2.pdf`: render đủ **49 trang**; canvas và text layer trang đầu hoạt động.
- Snip: kéo thuận/ngược và vùng tối thiểu được kiểm thử; outline giữ theo tọa độ chuẩn hóa khi zoom; đổi tài liệu xóa selection.
- Regression Read/Pen/Circle: pass; tạo Snip không phát sinh request `/api/tutor` hoặc `/api/analyze`.
- Detector package nhận diện được candidate hữu ích trên PDF thật, gồm vector ở trang 2 và 9, cùng text/image/vector ở trang 6; page-sized background và nét trang trí mỏng bị lọc.
- Giới hạn: các candidate detector và C5 overlay chưa được C8 nối vào giao diện PDF upload; các kết quả này chứng minh module, không chứng minh luồng auto-detect end-to-end.

## §8. Phân công & kế hoạch

- Nhóm: **F2 — Lab D305**.
- Nhóm trưởng: **Vũ Tiến Dũng — 2A202602009**.

| STT | Thành viên | Mã học viên |
|---:|---|---|
| 1 | Chu Nguyễn Tuấn Anh | 2A202601755 |
| 2 | Đào Thị Trang | 2A202601809 |
| 3 | Lê Minh Ngọc | 2A202601471 |
| 4 | Vũ Tiến Dũng | 2A202602009 |
| 5 | Nguyễn Đức Chung | 2A202601705 |

| Thành viên | Phần phụ trách và code có thể giải thích |
|---|---|
| Chu Nguyễn Tuấn Anh | C0 selection contract, C1 Snip, C2 PDF context; review và tích hợp nhánh; validation |
| Đào Thị Trang | Evidence/mining; C3 image/vector detector và C4 text-region detector |
| Lê Minh Ngọc | Prompt/eval; AI provider và Visual Tutor contract |
| Vũ Tiến Dũng | Nhóm trưởng; spec; PDF reader và luồng frontend/demo |
| Nguyễn Đức Chung | C5 accessible selection overlay, C6 Circle bridge; demo/slides |

- Willing users đã khai từ CP1 và tham gia validation: **Nguyễn Thị Hải Yến (V01), Nguyễn Hoàng Biên (V02), Trần Xuân Lộc (V03)** — đều là người thử ngoài nhóm.
- Validation: 5 người ngoài nhóm thực hiện task không được hướng dẫn; hỏi 3 câu trong `validation/protocol.md`; owner ghi quote nguyên văn.
- Multi-prototype: không làm để giữ scope; automatic segmentation C chỉ là stretch sau eval và validation.

## §9. Changelog

| Thời điểm | Đổi gì | Vì sao |
|---|---|---|
| 30/07/2026 | Chọn B click-region, không làm auto segmentation C | Lát cắt nhỏ nhất chứng minh central visual decision |
| 30/07/2026 | Thêm intrinsic size 960×540 cho SVG | Live failure: crop 122×110 làm model báo ảnh quá nhỏ |
| 30/07/2026 | Bắt buộc output tiếng Việt | Live recovery từng trả tiếng Anh |
| 30/07/2026 | Giữ hai failure run 01, không sửa số | Rubric yêu cầu bảng trung thực; cả hai fail là sai routing recovery, không hallucination |
| 30/07/2026 | Quyết định làm vùng hình dễ nhận ra hơn và thêm câu hỏi gợi ý ngắn | V01–V05: 2/5 khó nhận ra vùng bấm và 2/5 không rõ nên hỏi gì |
| 31/07/2026 | Ghi nhận C0–C5 là package đã kiểm thử, chưa tuyên bố Direction C end-to-end | C6–C8 chưa hoàn tất integration; tránh mô tả vượt quá bản build |
| 31/07/2026 | Bổ sung smoke test PDF thật và 79/79 automated tests | Cung cấp bằng chứng tái lập cho prototype ngoài AI golden set |
