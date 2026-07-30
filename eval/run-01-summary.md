# Eval run 01 — Visual Context Rescue

- Thời điểm và model: xem `run-01-results.json`.
- Bộ thử: 20 case — 8 hard (2 case/lớp), 9 ordinary, 3 rare.
- Nguồn thực tế: 12 case phát triển từ 5 turn chatlog đã ẩn danh.
- Quality bar đã chốt trước khi chạy: **≥80% case pass và không case thiếu căn cứ nào được trả `VISUAL_GROUNDED`**.

## Kết quả

- **18/20 pass (90%)**.
- **0** case thiếu căn cứ bị trả `VISUAL_GROUNDED`.
- **Đạt quality bar**.

## Hai case fail được giữ nguyên

1. `O08`: mong đợi `VISUAL_GROUNDED`, model trả `NEED_WIDER_REGION`. Crop chỉ có nhánh ML nhưng câu hỏi nhắc phần “được khoanh”; model thận trọng yêu cầu vùng rộng hơn. Đây là false recovery, không phải hallucination.
2. `R02`: mong đợi `INSUFFICIENT`, model trả `NEED_BETTER_IMAGE` cho ảnh trắng. Cả hai đều không trả lời bịa; lỗi là phân loại recovery chưa đúng taxonomy mong đợi.

## Cách chấm

Một case pass khi đồng thời:

- route trùng `expectedRoute`;
- grounded case có ít nhất một fact bắt buộc xuất hiện;
- output có dấu hiệu tiếng Việt;
- structured output đã qua validator runtime.

Chi tiết mọi output, kể cả fail: `eval/run-01-results.json`. Trace chứng minh lời gọi AI thật đã redacted: `eval/real-call-trace.json`.
