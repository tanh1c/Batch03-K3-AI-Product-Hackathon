# Individual Reflection — Lê Minh Ngọc

## Thông tin cá nhân

| Mục | Nội dung |
|---|---|
| Họ và tên | Lê Minh Ngọc |
| Mã học viên | 2A202601471 |
| Nhóm | F2 — Lab D305 |
| Vai trò | Prompt/eval; AI provider và Visual Tutor contract |

## 1. Vai trò và phần tôi phụ trách

Tôi phụ trách prompt/eval và các ranh giới của AI provider cùng Visual Tutor contract. Mục tiêu là buộc quyết định trung tâm trả về một trong bốn route có thể kiểm thử, thay vì một đoạn trả lời tự do khó xác định có đủ căn cứ hay không.

Các artifact tôi cần hiểu và giải thích được gồm:

- `codebase/src/ai-provider.mjs` và `codebase/test/ai-provider.test.mjs`: cấu hình OpenAI/OpenRouter/Gemini/9router, auth theo provider, request và text extraction mà không lộ endpoint hoặc key trong health metadata.
- `codebase/src/visual-analysis.mjs` và `codebase/test/visual-analysis.test.mjs`: prompt multimodal, structured schema, bốn route và post-validation cho grounded/recovery.
- `codebase/src/visual-route.mjs` cùng route tests: validate request ở HTTP boundary, gọi AI thật và chỉ trả result đã qua contract.
- `eval/golden-set.json`, `eval/run-01-results.json` và `eval/run-01-summary.md`: 20 case Direction B, quality bar và kết quả từng case.
- `eval/direction-c-golden-set.json` và `eval/direction-c-run-01-results.json`: 12 case Direction C và ba recovery mismatch được giữ nguyên.

Application không tự fallback chéo provider. Nếu provider đã chọn không hoạt động, hệ thống báo lỗi thay vì âm thầm chuyển sang model khác làm mất khả năng tái lập kết quả.

## 2. AI đã hỗ trợ tôi như thế nào

Tôi dùng AI để rà prompt, đề xuất JSON Schema, sinh các biến thể edge case và hỗ trợ so sánh request body của Responses, Gemini và compatible chat. Trong eval, AI giúp tổng hợp bảng và tìm chênh lệch giữa expected route với actual route.

Tôi tự kiểm bằng validator, provider tests, golden set và artifact kết quả đã lưu. Automated required-fact matching không đủ để kết luận grounded; các output grounded còn phải được đọc để tìm claim không xuất hiện trong fixture. Tôi giữ nguyên case fail và quality bar đã chốt, không sửa dữ liệu đánh giá để làm tỷ lệ đẹp hơn.

## 3. Bài học từ case fail của nhóm

Lượt Direction B hậu-C7 đạt **19/20 = 95%**, nhưng vẫn không đạt hard bar vì case `R02` dùng ảnh trắng lại được trả `VISUAL_GROUNDED` với nội dung QEMU/GDB không có trong fixture. Một tỷ lệ tổng cao không bù được unsupported grounded claim trong sản phẩm học tập.

Bài học của tôi là cần quality bar có hard constraint bên cạnh phần trăm. Validator chỉ chứng minh output đúng cấu trúc; nó không chứng minh nội dung đúng nguồn. Vì cost-of-error là learner có thể học sai, khi nguồn trắng, mờ hoặc thiếu nhãn thì recovery an toàn quan trọng hơn một câu trả lời nghe hợp lý.

## 4. Điều tôi sẽ cải thiện

Nếu có thêm thời gian, tôi sẽ mở rộng independent manual review cho toàn bộ grounded output, thêm adjudication record khi reviewer bất đồng và chạy lại full eval sau mỗi thay đổi prompt/model. Tôi cũng sẽ theo dõi riêng route confusion giữa `NEED_WIDER_REGION`, `NEED_BETTER_IMAGE` và `INSUFFICIENT` thay vì chỉ nhìn pass rate tổng.
