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
- Hỗ trợ OpenAI, OpenRouter, Google Gemini trực tiếp và local 9router; Tutor demo hoạt động khi provider đã chọn chưa được cấu hình.
- Ở slide mẫu có sơ đồ, chọn nhánh hoặc toàn bộ vùng hình để gửi câu hỏi tới Visual Tutor; câu trả lời hiển thị provenance theo slide và hướng dẫn chọn vùng rộng hơn khi chưa đủ ngữ cảnh.
- Với PDF tải lên, có thể bật `Gợi ý vùng` để phát hiện local candidate text/image/vector, hoặc tự chọn bằng Snip/Circle; chỉ lần bấm Gửi mới crop đúng trang và gọi Visual Tutor.
- Visual Tutor gửi ảnh crop PNG và bounded text tối thiểu tới server; vùng không có text layer dùng cùng model multimodal để đọc crop. Trace chỉ lưu metadata đã băm, không lưu câu hỏi gốc hoặc ảnh.

### Visual Tutor

Visual Tutor có hợp đồng bốn route: `VISUAL_GROUNDED`, `NEED_WIDER_REGION`, `NEED_BETTER_IMAGE`, `INSUFFICIENT`. Chỉ route grounded có `answer`; các route phục hồi phải có `reason` và `recovery_action` cụ thể. Mô hình được cấu hình cho Visual Tutor phải hỗ trợ ảnh và structured JSON output.

Direction B giữ luồng nút vùng cấu hình sẵn trên slide demo. Direction C phát hiện candidate theo từng trang PDF đã render bằng heuristic PDF.js; đây không phải segmentation/OCR toàn tài liệu và candidate sai hoặc thiếu luôn có fallback Snip/Circle.

Credentials chỉ được đọc ở server và không xuất hiện trong trace hoặc browser. VLearn không tự fallback sang provider khác; nếu dùng combo model, fallback bên trong 9router thuộc quyền kiểm soát của gateway.

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

## Chọn AI provider

Sao chép `.env.example` thành `.env`. Mặc định ứng dụng dùng local 9router:

```dotenv
AI_PROVIDER=9router
NINEROUTER_URL=http://localhost:20128
NINEROUTER_KEY=
NINEROUTER_MODEL=gc/gemini-2.5-flash
PORT=3000
```

`NINEROUTER_URL` là gateway root; ứng dụng tự gọi `/v1/chat/completions`. `NINEROUTER_KEY` có thể để trống khi local gateway tắt auth.

Để dùng OpenAI hoặc OpenRouter, đổi `AI_PROVIDER` và cấu hình đúng credential/model tương ứng:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.6-terra
```

```dotenv
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Để gọi Google Gemini trực tiếp:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Khởi động lại bằng `npm start`. Credentials chỉ tồn tại ở server. OpenAI dùng Responses API; OpenRouter và 9router dùng Chat Completions; Gemini dùng `generateContent`. Tất cả nhận cùng document-only instructions và giữ nguyên response contract của frontend.

## Cách Tutor dùng tài liệu

1. PDF được mở và trích xuất văn bản hoàn toàn ở trình duyệt.
2. Khi người học đặt câu hỏi, frontend xếp hạng các trang theo từ khóa và trang đang xem.
3. Tối đa bốn đoạn văn bản liên quan được gửi tới `/api/tutor`.
4. Nếu provider đã chọn được cấu hình, server gọi mô hình AI; nếu không, server trả phản hồi demo có nhãn rõ ràng.

## Phạm vi prototype

- PDF scan không được OCR toàn tài liệu; chỉ crop do người học chọn mới được model multimodal đọc khi vùng đó không có bounded text.
- Candidate detection là heuristic local, không bảo đảm tìm đúng mọi ảnh/vector/text region; Snip/Circle là fallback thủ công.
- Annotation được lưu trong trình duyệt hiện tại, chưa đồng bộ tài khoản hoặc cơ sở dữ liệu.
- File PDF không được giữ lại sau khi refresh; người dùng cần chọn lại file. Ghi chú của file vẫn còn nếu tải lại đúng file đó.
- Chưa có đăng nhập, phân quyền giáo viên hoặc quản trị học liệu.
- Giới hạn 15 câu là quota demo lưu cục bộ, không phải hệ thống tính phí.

## Kiểm tra

```powershell
npm run check
npm test
```

Endpoint kiểm tra server: `GET /api/health`. Visual endpoint: `POST /api/analyze`; endpoint trả `503` khi provider đã chọn chưa được cấu hình.
