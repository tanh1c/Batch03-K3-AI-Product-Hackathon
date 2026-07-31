# Individual Reflection — Đào Thị Trang

## Thông tin cá nhân

| Mục | Nội dung |
|---|---|
| Họ và tên | Đào Thị Trang |
| Mã học viên | 2A202601809 |
| Nhóm | F2 — Lab D305 |
| Vai trò | Evidence/mining; C3 image/vector detector; C4 text-region detector |

## 1. Vai trò và phần tôi phụ trách

Tôi phụ trách evidence mining và detector cục bộ dùng để gợi ý nhanh các vùng text, ảnh raster và đồ họa vector trên trang PDF.

Ở phần evidence, phương pháp trong `evidence/mining-method.md` đếm theo `turn_id` hoàn chỉnh và chỉ xét câu hỏi trực tiếp cuối cùng của learner. Kết quả canonical trong `evidence/mining-output.json` ghi nhận 5/1.261 turn hỏi trực tiếp về visual; 4/5 reply không xác định được context. Claim của nhóm chỉ dừng ở hành vi quan sát được, không suy rằng CSV đã chứng minh nguyên nhân kỹ thuật là thiếu pixel hoặc OCR. Script `evidence/mine-chatlog.mjs` giúp người khác chạy lại phép đếm mà không đưa full chatlog vào repo nộp bài.

Ở phần C3/C4, các artifact chính gồm:

- `codebase/public/pdf-regions.mjs`: đọc PDF.js text content và operator list, áp transform/viewport, tạo candidate text/image/vector và lọc vùng nhiễu.
- `codebase/test/pdf-regions.test.mjs`: kiểm tra text line/block, image transform, vector grouping, background, decorative path, duplicate và work limit.
- `codebase/public/app.js`: lazy detection chỉ trên trang đã render và map vector về source `detected-image` theo contract hiện có.

Detector chỉ là heuristic hỗ trợ chọn nhanh. Snip và Circle vẫn là fallback bắt buộc khi candidate bị bỏ sót hoặc bounds chưa đúng.

## 2. AI đã hỗ trợ tôi như thế nào

Tôi dùng AI để hỗ trợ đọc PDF.js operator semantics, liệt kê transform và geometry edge case, đề xuất fixture nhỏ cho test và rà sự nhất quán giữa rule mining với output. AI hữu ích khi so sánh các trường hợp save/restore CTM, ảnh xoay, vector nối bằng bridge và text nhiều cột.

Tôi tự kiểm bằng cách chạy script mining, đọc tay toàn bộ năm candidate visual, đối chiếu mã turn ẩn danh và chạy test detector. Tôi không dùng AI để tạo thêm quote, thay đổi số evidence hoặc tuyên bố detector là semantic segmentation. Những gì không chứng minh được từ data hoặc PDF.js output được ghi thành giới hạn thay vì biến thành claim sản phẩm.

## 3. Bài học từ case fail của nhóm

PDF có thể biểu diễn background, logo và path trang trí bằng cùng loại operator mà detector dùng để tìm đồ họa có ý nghĩa. Text nhiều cột cũng có thể bị gộp thành một vùng không đúng ý learner. Vì vậy, cố phát hiện nhiều candidate hơn không đồng nghĩa trải nghiệm tốt hơn.

Bài học của tôi là detector heuristic cần bảo thủ: giới hạn số item xử lý, loại background/vùng quá lớn, loại đường trang trí quá mỏng, khử duplicate và giữ fallback thủ công. Khi không chắc, trả ít candidate hoặc không trả candidate còn an toàn hơn phủ toàn trang bằng vùng bấm sai. Learner vẫn có Snip/Circle để sửa input trước khi gửi AI.

## 4. Điều tôi sẽ cải thiện

Nếu có thêm thời gian, tôi sẽ xây fixture PDF đa dạng hơn cho bảng, sơ đồ nhiều cột, vector phức tạp và PDF scan; sau đó đo precision/recall candidate riêng thay vì chỉ kiểm contract kỹ thuật. Tôi cũng sẽ validation trực tiếp xem vùng gợi ý có dễ nhận biết và có giảm thời gian chọn context so với Snip hay không.
