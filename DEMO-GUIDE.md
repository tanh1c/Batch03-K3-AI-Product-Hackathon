# Kịch bản demo Visual Context Rescue

## 1. Mục tiêu demo

Chứng minh học viên có thể hỏi VLearn Tutor về **text, hình ảnh, sơ đồ hoặc một vùng bất kỳ trong PDF** mà không phải tự mô tả lại toàn bộ bằng chữ.

File demo:

```text
C:\Users\LG\Downloads\01 - 4-day02-lecture-slides-v2.pdf
```

Thông điệp chính:

> Tutor hiện tại đọc tốt text, nhưng learner không thể truyền chính xác vùng hình mình đang nhìn. Visual Context Rescue bổ sung thao tác chọn vùng, crop đúng trang và chỉ gửi context tối thiểu sau khi learner chủ động bấm Gửi.

## 2. Chuẩn bị trước khi demo

Yêu cầu Node.js 20 trở lên.

```bash
cd codebase
npm install
npm start
```

Mở:

```text
http://localhost:3000
```

Kiểm tra nhanh trước khi trình bày:

```bash
cd codebase
npm run check
npm test
```

Trước buổi demo:

- Cấu hình OpenRouter và model `openai/o4-mini` trong `codebase/.env`.
- Không chiếu hoặc mở nội dung API key.
- Xác nhận `/api/health` báo `aiConfigured: true`.
- Upload thử PDF và xác nhận hiển thị đủ **49 trang**.
- Chuẩn bị mạng ổn định cho AI call.
- Đóng các tab hoặc cửa sổ có dữ liệu riêng tư.

## 3. Các tính năng có thể demo

### 3.1. Đọc PDF 49 trang

- Upload PDF tối đa 50 MB.
- Hiển thị đúng tổng số 49 trang.
- Render trang theo kiểu lazy để không cần dựng toàn bộ pixel ngay lập tức.
- Có text layer để bôi đen nội dung.
- Điều hướng trang trước/sau.
- Zoom từ 60% đến 150%.
- Chuyển giữa PDF tải lên và tài liệu demo.

Điểm cần nói:

> PDF được xử lý trong browser. Hệ thống không tự động upload toàn bộ PDF lên AI.

### 3.2. Tutor hỏi theo text

- Bôi đen một đoạn chữ trên PDF.
- Chọn `Hỏi AI`.
- Composer được điền câu hỏi theo đoạn text.
- Tutor tìm context text từ các trang liên quan và gọi `/api/tutor`.

Điểm cần nói:

> Đây là luồng Tutor text hiện có. Nó phù hợp với câu hỏi dựa trên chữ nhưng không truyền được pixel của hình ảnh.

### 3.3. Gợi ý vùng chữ, hình và đồ họa

Thao tác:

1. Mở `Công cụ khác`.
2. Bật `Gợi ý vùng` bằng chuột hoặc bàn phím.
3. Di chuyển đến các trang đã render, ví dụ trang 2, 6 hoặc 9.
4. Chọn một candidate text, image hoặc vector.

Hệ thống hiện có thể phát hiện cục bộ:

- Vùng chữ theo line/block.
- Ảnh raster trong PDF.
- Vùng đồ họa/vector theo operator và transform của PDF.js.
- Vector được gửi với source `detected-image`.
- Text được gửi với source `detected-text`.

Điểm cần nói:

> Detector là heuristic hỗ trợ chọn nhanh, không phải segmentation hoàn hảo. Nếu detector bỏ sót hoặc chọn sai, learner vẫn dùng Snip hoặc Circle.

### 3.4. Chọn vùng tự do bằng Snip

Thao tác:

1. Chọn công cụ `Snip`.
2. Kéo một hình chữ nhật quanh nội dung cần hỏi.
3. Thử kéo theo chiều bình thường hoặc ngược lại.
4. Nhập hoặc sửa câu hỏi trong Tutor.
5. Bấm `Gửi`.

Kết quả:

- Bounds được chuẩn hóa theo trang.
- Crop lấy từ canvas PDF, không lấy annotation canvas.
- Text chỉ được lấy trong vùng giao nhau.
- AI nhận crop và context tối thiểu của đúng trang.
- Câu trả lời có provenance của vùng đã chọn.

Điểm cần nói:

> Tạo Snip chỉ là thao tác local. Crop và AI call chỉ xảy ra sau khi learner bấm Gửi.

### 3.5. Chọn vùng bằng Circle

Thao tác:

1. Mở `Công cụ khác` và chọn Circle.
2. Khoanh quanh một vùng trên slide.
3. Trong popover, chọn hỏi Tutor.
4. Sửa câu hỏi nếu cần rồi bấm `Gửi`.

Kết quả:

- Nét Circle được chuyển thành bounds có padding.
- Crop chỉ lấy canvas PDF nên không gửi chính nét vẽ vào ảnh cho AI.
- Selection source là `circle`.

### 3.6. Bỏ vùng khỏi câu hỏi

Sau khi chọn Snip, Circle hoặc candidate:

- Composer hiển thị tên vùng và slide đang được dùng.
- Bấm nút `×` cạnh context để bỏ vùng.
- Outline bị xóa.
- Câu gợi ý mặc định trong input bị xóa.
- Composer trở lại context của trang hiện tại.
- Không có AI request khi bỏ vùng.

Đây là bước nên demo để chứng minh learner luôn kiểm soát context trước khi gửi.

### 3.7. OCR-aware cho PDF scan

- Nếu vùng được chọn có text layer, hệ thống gửi bounded text cùng crop.
- Nếu vùng không có text layer, request đánh dấu `needsOcr: true`.
- Cùng model multimodal đọc chữ trực tiếp từ crop đã chọn.
- Hệ thống không OCR toàn bộ PDF.

Điểm cần nói:

> OCR chỉ áp dụng cho vùng learner đã chủ động chọn, giúp giảm dữ liệu gửi đi và tránh đọc ngoài phạm vi.

### 3.8. Provenance và structured routing

AI chỉ được trả một trong bốn route:

- `VISUAL_GROUNDED`: đủ căn cứ để giải thích.
- `NEED_WIDER_REGION`: crop thiếu nhãn hoặc thiếu phần liên quan.
- `NEED_BETTER_IMAGE`: hình quá nhỏ hoặc mờ.
- `INSUFFICIENT`: nguồn không chứa thông tin được hỏi hoặc câu hỏi ngoài phạm vi.

Grounded response hiển thị provenance theo nguồn chọn và số slide. Recovery response có lý do và hành động tiếp theo.

### 3.9. Recovery an toàn

Nếu vùng chưa đủ:

- Tutor không tự động gửi toàn bộ trang.
- Nút `Chọn lại bằng Snip` đưa learner về đúng trang.
- Learner tự chọn vùng rộng hoặc rõ hơn rồi gửi lại.

Điểm cần nói:

> Cost-of-error cao vì giải thích sai hình có thể khiến learner học sai. Khi thiếu căn cứ, hệ thống recovery thay vì đoán.

### 3.10. Zoom và chống dùng sai vùng

Có thể demo:

1. Chọn một vùng.
2. Zoom qua 60%, 90% và 150%.
3. Quan sát outline vẫn giữ đúng vị trí tương đối.
4. Chuyển tài liệu.
5. Xác nhận selection và overlay cũ bị xóa.

Hệ thống dùng normalized bounds, work epoch và AbortController để tránh crop hoặc kết quả async từ tài liệu/trang cũ.

### 3.11. Annotation và công cụ học tập

Ngoài Visual Tutor, prototype còn có:

- Pen.
- Circle.
- Highlight text.
- Ghi chú theo trang.
- Eraser.
- Undo.
- Xóa chú thích của trang.
- Marker và danh sách ghi chú.
- Light/dark theme.

Chỉ demo nhanh; không để các công cụ này làm lu mờ central AI decision.

### 3.12. Quyền riêng tư

Có thể trình bày bằng lời hoặc DevTools:

- API key chỉ tồn tại phía server.
- Candidate detection chạy local.
- Candidate click, Snip và Circle không tự gọi AI.
- Chỉ explicit submit mới gọi `/api/analyze`.
- Không lưu crop, bounded text, raw question, chat hoặc selection vào `localStorage`.
- Không persist raw crop, OCR text hoặc upstream response body trong trace.
- Trace chỉ giữ metadata đã redacted.

## 4. Kịch bản demo đề xuất trong 5–7 phút

### Bước 1 — Nêu vấn đề, 30 giây

> VLearn Tutor hiện đọc text được chọn, nhưng khi learner không hiểu sơ đồ hoặc hình ảnh, họ phải tự mô tả bằng chữ. Nhóm bổ sung Visual Context Rescue để truyền đúng vùng visual ngay trong luồng học.

### Bước 2 — Upload và đọc PDF, 30 giây

1. Upload PDF 49 trang.
2. Chỉ tổng số trang và text layer.
3. Chuyển nhanh đến trang 6.

### Bước 3 — Gợi ý vùng, 60 giây

1. Bật `Gợi ý vùng`.
2. Chọn một vùng chữ để chứng minh text candidate.
3. Bỏ vùng bằng nút `×`.
4. Chọn một vùng image/vector khác.
5. Nhấn mạnh chưa có AI call cho tới lúc Gửi.

### Bước 4 — Snip happy path, 90 giây

1. Chọn Snip quanh một sơ đồ đủ nhãn.
2. Nhập câu hỏi cụ thể.
3. Bấm Gửi.
4. Chỉ route `VISUAL_GROUNDED` và provenance slide.

Câu hỏi gợi ý:

```text
Hãy giải thích sơ đồ trong vùng này và nêu quan hệ giữa các thành phần.
```

### Bước 5 — Recovery, 60 giây

1. Snip một vùng hẹp, bỏ mất tiêu đề hoặc nhãn.
2. Bấm Gửi.
3. Nếu model trả recovery, chỉ reason và `Chọn lại bằng Snip`.
4. Chọn vùng rộng hơn rồi gửi lại.

Không đảm bảo model luôn chọn đúng recovery trong live demo; nếu route không như mong đợi, trình bày trung thực đây là failure mode đã được đo.

### Bước 6 — Circle và explicit control, 45 giây

1. Khoanh một vùng.
2. Chọn hỏi Tutor.
3. Bỏ selection bằng nút `×` hoặc gửi câu hỏi.
4. Nêu rõ annotation không nằm trong crop gửi AI.

### Bước 7 — Privacy và kết quả đo, 45 giây

Nói ngắn gọn:

- Chỉ gửi crop sau explicit submit.
- Direction C Run 01: `9/12`, unsupported grounded `0`, chưa đạt bar `10/12`.
- Direction B lịch sử: `18/20`, unsupported grounded `0`.
- Direction B hậu-C7: `19/20` nhưng có một unsupported grounded trên ảnh trắng nên không đạt hard bar.
- Automated suite hiện tại: `117/117` pass.
- Validation 5 người hiện chỉ áp dụng cho Direction B; chưa có usability study mới cho Direction C.

## 5. Nếu chỉ có 3 phút

Chỉ demo bốn điểm:

1. Upload PDF 49 trang.
2. Bật `Gợi ý vùng` và chọn một vùng text/image/vector.
3. Dùng Snip, đặt câu hỏi và nhận grounded answer có provenance.
4. Bỏ vùng bằng `×` hoặc chạy recovery `Chọn lại bằng Snip`.

Sau đó nói privacy và kết quả eval trong một câu.

## 6. Những giới hạn phải nói trung thực

### Chưa có retrieval hình ảnh toàn tài liệu

Nếu learner hỏi bình thường mà không chọn vùng:

- `/api/tutor` chỉ retrieval text từ các trang liên quan.
- AI không tự nhìn toàn bộ pixel của 49 slide.
- AI không tự tìm một ảnh bất kỳ ở slide khác.

Muốn AI nhìn hình, learner phải chọn candidate, Snip hoặc Circle rồi submit.

### Detector không phải segmentation hoàn hảo

- Có thể bỏ sót hình.
- Có thể nhận nhầm nền hoặc path trang trí.
- Text nhiều cột có thể bị gộp sai.
- PDF scan có thể không có text layer.
- Snip và Circle là fallback bắt buộc.

### Quality gate Direction C chưa đạt

- Direction C đạt `9/12`, dưới bar `10/12`.
- Ba failure là route recovery phân loại sai.
- Không sửa golden set hoặc hạ bar sau khi đo.

### Grounding vẫn cần review

- Automated check chỉ xác nhận route, contract, tiếng Việt và required facts.
- Người review vẫn phải đọc grounded output để loại claim ngoài fixture.
- Browser assertions chứng minh integration, không thay thế usability study.

## 7. Câu hỏi demo nên dùng

Câu hỏi grounded:

```text
Giải thích nội dung trong vùng này theo các nhãn và mũi tên đang hiển thị.
```

```text
Vùng này mô tả quy trình gì? Hãy giải thích theo đúng thứ tự trong hình.
```

```text
Tóm tắt bảng trong vùng này và chỉ nêu thông tin nhìn thấy được.
```

Câu hỏi kiểm tra recovery:

```text
Giải thích toàn bộ sơ đồ này.
```

Dùng câu trên với crop cố tình quá hẹp để kiểm tra `NEED_WIDER_REGION`.

Câu hỏi kiểm tra không đủ căn cứ:

```text
Hãy nêu thông tin không xuất hiện trong vùng hình này.
```

Không dùng câu hỏi quá chung như `Hình này là gì?` nếu mục tiêu là demo chất lượng giải thích.

## 8. Checklist ngay trước khi lên trình bày

- [ ] App chạy tại `http://localhost:3000`.
- [ ] `/api/health` báo AI đã cấu hình.
- [ ] PDF upload thành công và hiện 49 trang.
- [ ] Trang dự định demo đã render.
- [ ] `Gợi ý vùng` có candidate trên trang dự định demo.
- [ ] Snip và Circle tạo selection nhưng chưa tự gọi AI.
- [ ] Nút `×` bỏ selection đúng.
- [ ] Một câu hỏi grounded đã thử thành công với provider hiện tại.
- [ ] Chuẩn bị một vùng recovery.
- [ ] Không mở `.env` trước người xem.
- [ ] Biết rõ các số đo `18/20`, `9/12`, `19/20` và ý nghĩa của chúng.
- [ ] Không tuyên bố Direction C đã đạt quality bar hoặc đã có validation người dùng mới.

## 9. Câu kết thúc đề xuất

> Prototype chứng minh learner có thể đưa đúng vùng visual vào Tutor mà không phải tự dựng lại ngữ cảnh bằng chữ. Hệ thống giữ learner trong vòng kiểm soát: chọn vùng local, chỉ gửi khi bấm Gửi, gắn provenance và recovery khi thiếu căn cứ. Bước tiếp theo là retrieval đa phương thức trên toàn tài liệu và validation người dùng riêng cho Direction C.
