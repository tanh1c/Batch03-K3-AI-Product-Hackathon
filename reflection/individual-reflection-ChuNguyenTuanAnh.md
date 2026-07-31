# Individual Reflection — Chu Nguyễn Tuấn Anh

## Thông tin cá nhân

| Mục | Nội dung |
|---|---|
| Họ và tên | Chu Nguyễn Tuấn Anh |
| Mã học viên | 2A202601755 |
| Nhóm | F2 — Lab D305 |
| Vai trò | C0 selection contract, C1 Snip, C2 PDF context; review/tích hợp; validation |

## 1. Vai trò và phần tôi phụ trách

Tôi phụ trách các lớp nền để learner có thể chọn đúng một vùng trên PDF và gửi đúng context tối thiểu cho Visual Tutor. C0 chuẩn hóa mọi nguồn chọn về cùng contract gồm trang, bounds và source. C1 biến thao tác kéo Snip theo cả hai chiều thành vùng chọn hợp lệ. C2 crop từ canvas PDF và chỉ lấy text layer giao với vùng đó.

Các artifact tôi cần hiểu và giải thích được gồm:

- `codebase/src/selection-geometry.mjs` và `codebase/test/selection-geometry.test.mjs`: chuẩn hóa, clamp và kiểm tra bounds.
- `codebase/src/snip.mjs` và `codebase/test/snip.test.mjs`: xử lý drag thường, drag ngược, vùng quá nhỏ và vùng ngoài trang.
- `codebase/public/pdf-context.mjs` và `codebase/test/pdf-context.test.mjs`: đợi trang render, crop đúng source pixel, lấy bounded text và từ chối work đã stale.
- `codebase/public/app.js`: nối selection vào luồng explicit submit và xóa selection khi đổi tài liệu hoặc zoom làm work cũ không còn hợp lệ.
- `validation/feedback-log.md` và `validation/summary.md`: tổng hợp hành vi và quote nguyên văn từ năm người thử ngoài nhóm.

Ranh giới quan trọng của phần này là tạo Snip hoặc chọn candidate chỉ thay đổi state cục bộ. Crop và `/api/analyze` chỉ chạy sau khi learner bấm Gửi; raw crop, bounded text, câu hỏi và selection không được lưu vào `localStorage`.

## 2. AI đã hỗ trợ tôi như thế nào

Tôi dùng AI để rà data contract giữa C0, C1 và C2, liệt kê edge case, soạn test ban đầu và truy vết các lỗi liên quan đến pointer, PDF render và stale async work. AI giúp tôi kiểm tra nhanh các trường hợp drag ngược, bounds vượt trang, canvas chưa render, text layer rỗng và document bị đổi trong lúc crop.

Tôi không coi code hoặc kết luận do AI sinh ra là bằng chứng hoàn thành. Tôi đối chiếu với contract trong source, chạy test mục tiêu trước khi tích hợp, chạy full suite sau khi merge và dùng browser assertions với PDF 49 trang để kiểm tra đúng page, đúng crop và zero request trước explicit submit. Với validation, AI chỉ hỗ trợ cấu trúc biểu mẫu; quote và kết quả phải giữ theo dữ liệu người thử đã cung cấp.

## 3. Bài học từ case fail của nhóm

Direction C Run 01 đạt **9/12**, thấp hơn quality bar **10/12**, dù không có unsupported grounded claim. Ba case `C07`, `C09` và `C10` đều sai route recovery: model nghiêng về `NEED_WIDER_REGION` trong khi golden set yêu cầu `NEED_BETTER_IMAGE` hoặc `INSUFFICIENT`.

Bài học của tôi là pipeline kỹ thuật đúng trang, đúng vùng và đúng contract vẫn chưa bảo đảm quyết định AI đạt quality bar. Cần tách rõ hai loại bằng chứng: integration test chứng minh context không bị gửi sai, còn golden eval chứng minh model phân loại đủ căn cứ hay recovery đúng. Nhóm giữ nguyên ba failure thay vì sửa golden set hoặc hạ bar sau khi thấy kết quả.

## 4. Điều tôi sẽ cải thiện

Nếu có thêm thời gian, tôi sẽ validation riêng Direction C với người dùng, đặc biệt là khả năng nhận biết selection, bỏ context và hiểu recovery. Tôi cũng sẽ tăng browser checks cho thao tác Snip bằng bàn phím hoặc thiết bị cảm ứng và tiếp tục giữ nguyên nguyên tắc: khi context không chắc chắn, để learner chọn lại thay vì tự mở rộng dữ liệu gửi đi.
