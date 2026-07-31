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

**Direction B working end-to-end với bounds visual cấu hình sẵn.** Luồng gồm click region, PNG crop, multimodal AI call, structured routing, post-validation, provenance, recovery và redacted trace.

**Direction C working end-to-end trên PDF upload.** C0–C7 cung cấp selection, Snip/Circle, crop + bounded text, detector image/vector/text, overlay accessible và request OCR-aware. C8 nối các package vào form Tutor hiện có: candidate/Snip/Circle chỉ tạo selection local; crop và `/api/analyze` chỉ chạy sau khi học viên bấm Gửi. Detector là heuristic theo từng trang đã render, không phải segmentation toàn năng; Snip/Circle là fallback thủ công.

### Automation

**Conditional.** Khi visual đủ căn cứ, AI tự giải thích; khi thiếu nhãn, ảnh mờ hoặc ngoài nguồn, AI không đoán mà chọn recovery. Cost-of-error cao vì learner khó phát hiện một giải thích hình sai và có thể học sai kiến thức; user giữ quyền chọn lại vùng/hỏi lại.

### Luồng dữ liệu và ranh giới riêng tư

```text
Direction B đang chạy:
click vùng hình cấu hình sẵn → crop PNG → học viên nhập câu hỏi và bấm gửi
→ /api/analyze → route + answer/reason + recovery_action → provenance slide

Direction C đang chạy:
Snip/Circle hoặc candidate detector local → C0 selection chuẩn hóa
→ học viên nhập câu hỏi và bấm gửi → C2 crop + bounded text
→ C7 OCR-aware request → /api/analyze → provenance hoặc recovery Snip
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

Các case Direction B nằm trong `eval/golden-set.json` (`H01`–`H08`); Direction C nằm trong `eval/direction-c-golden-set.json` (`C01`–`C12`). PDF.js biểu diễn ảnh/vector qua operator và ma trận transform nên path nền/trang trí có thể bị nhận nhầm, text nhiều cột có thể bị gộp sai và PDF scan có thể không có text layer. Detector dùng CTM đầy đủ, save/restore, bốn góc qua viewport, work limits và bộ lọc background/region quá lớn. Khi bounded text rỗng, cùng model multimodal chỉ đọc crop đã chọn; hệ thống không OCR toàn PDF.

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
- `grounded`: automated check yêu cầu ít nhất một fact bắt buộc; người review phải đọc toàn bộ grounded output để loại claim trái fixture trước khi kết luận gate.
- `recovery_actionable`: recovery route có hành động cụ thể, được runtime validator bắt buộc.
- `language_vi`: output có dấu hiệu ngôn ngữ tiếng Việt.
- `contract_valid`: đúng bốn field và quy tắc grounded/recovery; nếu sai request bị fail trước khi ghi kết quả.

### Golden set và quality bar

- Direction B: `eval/golden-set.json`, 20 case gồm 8 hard, 9 ordinary và 3 rare. Bar lịch sử: **≥80% và zero unsupported grounded**.
- Direction C v1: `eval/direction-c-golden-set.json`, đúng 12 case gồm 4 mixed, 3 scanned, 3 recovery và 2 detector fallback. Bar đóng băng: **≥10/12, zero unsupported grounded, zero wrong-page crop và cả Snip/Circle fallback usable**.

Không hạ bar hoặc sửa v1 sau khi đo.

### Kết quả AI thật

| Lượt | Model | Kết quả | Unsupported grounded | So với bar |
|---|---|---:|---:|---|
| Direction B Run 01 lịch sử | `openai/o4-mini` qua OpenRouter | **18/20 = 90%** | 0 | Đạt |
| Direction C Run 01 | `openai/o4-mini` qua OpenRouter | **9/12 = 75%** | 0 | **Chưa đạt** |
| Direction B hậu-C7 | `openai/o4-mini` qua OpenRouter | **19/20 = 95%** | 1 | **Chưa đạt** |

Direction C giữ nguyên ba route mismatch: `C07` và `C10` trả `NEED_WIDER_REGION` thay vì `NEED_BETTER_IMAGE`; `C09` trả `NEED_WIDER_REGION` thay vì `INSUFFICIENT`. Bảy output grounded đã được rà theo nhãn fixture và không thấy claim ngoài nguồn. Direction B hậu-C7 thất bại hard constraint ở `R02`: ảnh trắng bị trả grounded với nội dung QEMU/GDB không có trong fixture.

### Xác minh C8/C9 hiện tại

- Automated suite: **115/115 test pass, 0 fail**; syntax check và `git diff --check` pass.
- PDF thật 49 trang: candidate lazy xuất hiện ở trang 2, 6 và 9; text/image/vector vẫn tách, vector map sang `detected-image`.
- Candidate click, Snip creation, Circle creation và recovery click tạo **0** request AI; mỗi nguồn chỉ gửi sau form submit và không đi qua `/api/tutor`.
- Circle crop chỉ dùng `.pdf-canvas`; outline chuẩn hóa giữ nguyên ở zoom 60%, 90% và 150%; đổi tài liệu xóa overlay/selection cũ.
- Direction B vẫn giữ request shape cũ; `localStorage` không chứa crop, selection, bounded text, raw question hoặc chat; mobile 390 px không overflow; browser page error bằng 0.
- Browser assertions chứng minh integration và wrong-page behavior cho kịch bản đã chạy, không thay thế usability study. Năm phiếu hiện có chỉ đánh giá Direction B; chưa có validation người dùng mới cho Direction C.

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
| 31/07/2026 | Hoàn tất C6–C8 end-to-end trên PDF upload | Nối Circle/detector/overlay với explicit-submit crop và Visual Tutor, không tự gửi cả trang |
| 31/07/2026 | Đóng băng Direction C v1 và chạy C9 | 9/12, zero unsupported grounded nhưng chưa đạt bar 10/12; giữ nguyên ba failure |
| 31/07/2026 | Chạy lại Direction B hậu-C7 | 19/20 nhưng R02 hallucinate từ ảnh trắng nên hard bar chưa đạt |
| 31/07/2026 | Bổ sung browser assertions và 115/115 automated tests | Cung cấp bằng chứng kỹ thuật; không coi là usability validation Direction C |
