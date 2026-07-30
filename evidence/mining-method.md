# Mining evidence — Visual Context Rescue

## Nguồn và đơn vị phân tích

- Nguồn: `data/vlearn-pack/chatlog/chat_history_anonymized_for_hackathon.csv`.
- Phạm vi theo data dictionary: 2.522 message, gồm 1.261 cặp student–tutor hoàn chỉnh, 585 hội thoại và 369 user đã ẩn danh, từ 22/07 đến 29/07/2026.
- Đơn vị đếm: một `turn_id`; mỗi turn phải có đúng một message `student`, một message `tutor` và `turn_status=completed`.
- Script tái lập: chạy `node evidence/mine-chatlog.mjs > evidence/mining-output.json` từ root repo.

## Quy tắc phân loại

Script chỉ xét **dòng câu hỏi trực tiếp cuối cùng** của student, không quét phần “đoạn được chọn” phía trên để tránh xem một đoạn văn có chữ “ảnh/bảng” là nhu cầu hỏi hình.

Một turn được tính là **yêu cầu về visual** khi câu hỏi trực tiếp đồng thời có:

1. Từ chỉ visual độc lập: `hình ảnh`, `ảnh`, `biểu đồ`, `sơ đồ`, `bảng`, `diagram`, `visual`, `graph` hoặc `chart`.
2. Ý định hỏi: `giải thích`, `phân tích`, `tóm tắt`, `mô tả`, `là ai`, `là gì`, `ý nghĩa` hoặc `so sánh`.

Một yêu cầu visual được tính là **Tutor không xác định được context** khi reply chứa một mẫu từ chối kiểm tra được như `không tìm thấy`, `không có nội dung/thông tin/tài liệu/hình ảnh`, `không thể thấy/xem/đọc/xác định`, `chưa có nội dung/tài liệu` hoặc `cung cấp thêm`.

Hai ứng viên đối chiếu dùng rule độc lập trên câu hỏi trực tiếp:

- Technical troubleshooting: chứa từ khóa code/lỗi/error/bug/API/cài đặt/install/GitHub/terminal/deploy/token/key/chạy file-mã-lệnh.
- Concept explanation: chứa tóm tắt/giải thích/khái niệm/ví dụ/so sánh/hiểu/là gì/như thế nào.

## Kết quả

| Ứng viên/pattern | Số turn | Số user | Chi phí quan sát được | Giới hạn diễn giải |
|---|---:|---:|---|---|
| Yêu cầu visual trực tiếp | 5/1.261 (0,40%) | 5/369 (1,36%) | 5 lượt cần giải thích nội dung nhìn thấy | Rule bảo thủ, có thể bỏ sót cách diễn đạt không dùng từ khóa |
| Visual nhưng Tutor không xác định được context | 4/5 (80% tập ứng viên visual) | 4 | Ít nhất 4 lượt hỏi chưa giải quyết ngay | Không chứng minh nguyên nhân kỹ thuật là thiếu pixel/OCR |
| Technical troubleshooting | 37/1.261 (2,93%) | 28/369 (7,59%) | 37 lượt cần hỗ trợ kỹ thuật | Là demand, không đồng nghĩa VLearn xử lý kém |
| Concept explanation | 666/1.261 (52,81%) | 270/369 (73,17%) | 666 lượt cần giải thích | Là job cốt lõi đã được Tutor phục vụ, không tự nó chứng minh pain mới |
| Tutor báo thiếu nguồn/context ở mọi chủ đề | 197/1.261 (15,62%) | — | 197 lượt cần bổ sung context hoặc thử lại | Proxy rộng, không riêng visual |
| Rating down | 37/1.261 (2,93%) | — | 37 tín hiệu bất mãn trực tiếp | Rating thưa, không suy ra nguyên nhân |

Số liệu canonical nằm trong `evidence/mining-output.json`; bảng trên chỉ là bản diễn giải ngắn.

## Năm ví dụ ngắn, giữ mã ẩn danh

| Nguồn | Quote student tối thiểu | Kết quả Tutor |
|---|---|---|
| `C0108/T0816` | “người trong ảnh là ai” | Báo tài liệu không có thông tin/hình ảnh xác định danh tính |
| `C0302/T0611` | “giải thích hình ảnh này” | Trả lời được mô hình Double Diamond; counterexample thành công |
| `C0346/T0840` | “phân tích hình ảnh được khoanh đỏ ở slide 59” | Không tìm thấy hình được khoanh |
| `C0429/T0393` | “giải thích phần bảng được khoanh” | Không xác định được bảng được khoanh |
| `C0547/T0135` | “tóm tắt … các biểu đồ” | Không tìm thấy giai đoạn/biểu đồ được nhắc tới |

## Kiểm tra tay và giới hạn claim

- Đã đọc tay toàn bộ 5 candidate sau khi chạy rule cuối; 5/5 đúng là yêu cầu hướng tới nội dung visual, trong đó 4 reply không xác định được context.
- Các bản rule rộng hơn bị loại vì false positive: quét cả selected text làm câu “giải thích đoạn bôi đen” bị tính nhầm; substring `graph` làm `LangGraph` bị tính nhầm.
- Dữ liệu **chứng minh hành vi**: có learner hỏi nội dung hình/bảng/biểu đồ và một số lượt Tutor không xác định được nội dung.
- Dữ liệu **không chứng minh nguyên nhân kỹ thuật**: CSV không có ảnh, OCR, tọa độ vùng chọn, retrieval trace hoặc vision payload. Vì vậy sản phẩm kiểm thử giả thuyết “gửi crop hình tối thiểu sẽ cứu lượt hỏi”, không tuyên bố đã chứng minh root cause.
- Không suy ngược danh tính; chỉ dùng mã `C/T`; không chép hội thoại dài vào artifact nộp.
