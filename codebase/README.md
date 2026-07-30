# VLearn Reader Prototype

Prototype trình đọc PDF và trợ giảng AI theo ngữ cảnh, tái hiện luồng người học trong video tham chiếu. Ứng dụng không có chức năng tải tài liệu xuống.

## Chức năng đã triển khai

- Giao diện responsive gồm cây học liệu, trình đọc dạng cuộn và panel Tutor.
- Tải PDF mới bằng nút chọn file hoặc kéo thả, giới hạn 50 MB.
- Render PDF theo kiểu lazy-loading để tài liệu dài không phải vẽ toàn bộ cùng lúc.
- Điều hướng trang, phóng to/thu nhỏ từ 60% đến 150%.
- Bút vẽ và highlight vùng; dữ liệu được chuẩn hóa theo kích thước trang nên vẫn đúng vị trí khi zoom.
- Ghi chú riêng theo trang, đánh dấu nội dung gây bối rối, hoàn tác và xóa annotation.
- Menu ngữ cảnh khi bôi đen chữ trong slide mẫu hoặc nhấp chuột phải vào trang.
- Tutor tìm các trang liên quan, trả lời kèm nguồn và cho phép nhấn nguồn để quay lại trang.
- Chế độ sáng/tối và lưu ghi chú, annotation, theme bằng `localStorage`.
- Chế độ Tutor demo hoạt động khi chưa có API key; tự chuyển sang AI thật khi server có key.

## Chạy local

Yêu cầu Node.js 20 trở lên.

```powershell
cd codebase
npm install
npm start
```

Mở `http://localhost:3000`.

Trong lúc phát triển, có thể dùng:

```powershell
npm run dev
```

## Bật Tutor AI thật

Sao chép `.env.example` thành `.env`, sau đó cấu hình:

```dotenv
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.6-terra
PORT=3000
```

Khởi động lại bằng `npm start`. API key chỉ được đọc ở `server.mjs`, không được gửi xuống trình duyệt. Server gọi OpenAI Responses API và yêu cầu câu trả lời chỉ dựa trên ngữ cảnh PDF, kèm trích dẫn `[Trang N]`.

## Cách Tutor dùng tài liệu

1. PDF được mở và trích xuất văn bản hoàn toàn ở trình duyệt.
2. Khi người học đặt câu hỏi, frontend xếp hạng các trang theo từ khóa và trang đang xem.
3. Tối đa bốn đoạn văn bản liên quan được gửi tới `/api/tutor`.
4. Nếu có API key, server gọi mô hình AI; nếu không, server trả phản hồi demo có nhãn rõ ràng.

## Phạm vi prototype

- PDF dạng ảnh scan vẫn hiển thị được nhưng Tutor không đọc được chữ vì chưa tích hợp OCR.
- Annotation được lưu trong trình duyệt hiện tại, chưa đồng bộ tài khoản hoặc cơ sở dữ liệu.
- File PDF không được giữ lại sau khi refresh; người dùng cần chọn lại file. Ghi chú của file vẫn còn nếu tải lại đúng file đó.
- Chưa có đăng nhập, phân quyền giáo viên hoặc quản trị học liệu.
- Giới hạn 15 câu là quota demo lưu cục bộ, không phải hệ thống tính phí.

## Kiểm tra

```powershell
npm run check
```

Endpoint kiểm tra server: `GET /api/health`.
