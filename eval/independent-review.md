# Independent review — hard cases H01–H08

## Thiết lập

- **Reviewer 1:** Chu Nguyễn Tuấn Anh
- **Reviewer 2:** Lê Minh Ngọc
- **Phạm vi:** 8 hard case `H01`–`H08` trong `eval/golden-set.json`.
- **Output được chấm:** `eval/run-01-results.json`.
- **Cách làm:** hai reviewer chấm độc lập theo `expectedRoute`, độ grounded của toàn bộ output, tiếng Việt và structured contract; sau đó đối chiếu kết quả.

Automated required-fact matching chỉ là điều kiện hỗ trợ. Với `VISUAL_GROUNDED`, reviewer phải đọc toàn bộ answer/reason và loại case nếu có claim trái hoặc không xuất hiện trong fixture.

## Kết quả

| Case | Lớp rủi ro | Route mong đợi | Route thực tế | Reviewer 1 | Reviewer 2 | Kết luận |
|---|---|---|---|---|---|---|
| H01 | Nguồn sự thật | `INSUFFICIENT` | `INSUFFICIENT` | Pass | Pass | Thống nhất với Run 01 |
| H02 | Nguồn sự thật | `INSUFFICIENT` | `INSUFFICIENT` | Pass | Pass | Thống nhất với Run 01 |
| H03 | Mơ hồ | `NEED_WIDER_REGION` | `NEED_WIDER_REGION` | Pass | Pass | Thống nhất với Run 01 |
| H04 | Mơ hồ | `NEED_WIDER_REGION` | `NEED_WIDER_REGION` | Pass | Pass | Thống nhất với Run 01 |
| H05 | Ngoài phạm vi | `INSUFFICIENT` | `INSUFFICIENT` | Pass | Pass | Thống nhất với Run 01 |
| H06 | Ngoài phạm vi | `INSUFFICIENT` | `INSUFFICIENT` | Pass | Pass | Thống nhất với Run 01 |
| H07 | Domain | `VISUAL_GROUNDED` | `VISUAL_GROUNDED` | Pass | Pass | Grounded: sửa đúng vai trò hand-crafted features |
| H08 | Domain | `VISUAL_GROUNDED` | `VISUAL_GROUNDED` | Pass | Pass | Grounded: đúng chiều raw data → neural network → prediction |

## Kết luận review

- Hai reviewer thống nhất **8/8 hard case pass**, khớp bảng Run 01.
- Không có bất đồng cần adjudication trên tám case này.
- Review độc lập không thay đổi golden set, quality bar hoặc kết quả Run 01.
- Kết luận này chỉ áp dụng cho `H01`–`H08`; hai failure `O08` và `R02` của toàn bộ Run 01 vẫn được giữ nguyên trong `eval/run-01-summary.md`.
