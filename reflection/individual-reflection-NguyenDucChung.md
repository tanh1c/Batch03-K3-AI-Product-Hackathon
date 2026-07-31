# Individual Reflection — Nguyễn Đức Chung

## Thông tin cá nhân

| Mục | Nội dung |
|---|---|
| Họ và tên | Nguyễn Đức Chung |
| Mã học viên | 2A202601705 |
| Nhóm | F2 — Lab D305 |
| Vai trò | Owner C5 accessible selection overlay; kiểm thử learner-control UI; demo/slides |

## 1. Vai trò và phần tôi thực hiện

Phần code chính của tôi là **C5 accessible selection overlay**. Tôi xây dựng lớp giao diện hiển thị các candidate `image`, `text` và `vector` trên trang PDF bằng native button. Overlay nhận bounds chuẩn hóa, chuyển thành vị trí phần trăm và phát candidate được chọn cho luồng tích hợp phía ngoài.

Module hỗ trợ đầy đủ vòng đời `render`, `setEnabled`, `clear` và `destroy`. Candidate chỉ tương tác được khi overlay đã bật; mỗi button có `aria-label`, trạng thái disabled và keyboard focus. CSS được giới hạn trong namespace của overlay để candidate nhận pointer event nhưng lớp phủ không chặn thao tác đọc PDF.

Tôi cũng tạo fixture và 6 automated tests cho các hành vi chính: render bounds, bật/tắt overlay, callback khi chọn candidate, không làm biến đổi dữ liệu đầu vào, từ chối candidate sai hoặc ID trùng, cleanup và focus style. Với slide 4, tôi phụ trách kiểm tra và giải thích phần learner control: hệ thống hiển thị một trong bốn route, chỉ crop nội dung từ PDF canvas, không đưa nét Circle/annotation vào ảnh và cho phép quay lại Snip khi thiếu căn cứ.

## 2. AI đã hỗ trợ tôi như thế nào

Tôi dùng AI để rà contract của candidate, gợi ý các edge case và kiểm tra tính nhất quán giữa module, CSS và test. AI giúp tôi nhận ra các trường hợp dễ bỏ sót như bounds vượt khỏi trang, confidence ngoài khoảng hợp lệ, ID trùng, overlay đã destroy nhưng vẫn bị gọi lại và CSS global có thể làm ảnh hưởng PDF reader.

Tôi không dùng kết quả AI như bằng chứng rằng tính năng đã chạy đúng. Các đề xuất đều được đối chiếu với source code, fixture và automated test. Khi hoàn thiện slide, AI hỗ trợ rà typography và cách diễn đạt, nhưng tôi vẫn kiểm tra lại nội dung slide với README, spec và hành vi thật của prototype.

## 3. Bài học từ case fail

Case quan trọng nhất là ảnh crop có thể không phản ánh đúng điều người học định hỏi nếu pipeline vô tình lấy cả nét Circle hoặc annotation. Khi đó model có thể đọc thêm thông tin không thuộc tài liệu gốc và tạo cảm giác câu trả lời có căn cứ. Vì vậy Circle chỉ dùng để tạo bounds selection; ảnh gửi đi phải crop từ `.pdf-canvas`.

Tôi học được rằng user control không chỉ là thêm một nút. Người học phải nhìn thấy vùng được chọn trước khi gửi, hiểu vì sao hệ thống chưa trả lời và có hành động sửa cụ thể. Với PDF upload, recovery luôn quay lại Snip thay vì tự mở rộng sang toàn trang. Cách này làm tăng một thao tác nhưng bảo vệ quyền kiểm soát ngữ cảnh và giảm nguy cơ gửi quá nhiều dữ liệu.

## 4. Điều tôi sẽ cải thiện

Nếu có thêm thời gian, tôi sẽ bổ sung kiểm thử trình duyệt chuyên biệt cho keyboard navigation, screen reader label, overlay qua các mức zoom và trạng thái focus sau khi đổi trang hoặc đổi tài liệu. Tôi cũng sẽ validation trực tiếp Direction C với người dùng, vì automated test chứng minh contract kỹ thuật nhưng không chứng minh candidate có dễ nhận ra và recovery có dễ hiểu hay không.

Đóng góp lớn nhất của tôi trong hackathon là biến candidate detector thành một lớp tương tác có thể dùng và kiểm thử được, đồng thời giữ learner control rõ ràng khi AI đủ hoặc chưa đủ căn cứ.
