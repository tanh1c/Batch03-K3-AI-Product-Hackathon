# Evaluation — Visual Context Rescue

Thư mục này lưu golden set, kết quả đầy đủ của lời gọi AI thật và bằng chứng kỹ thuật của prototype. Các failure được giữ nguyên; không hạ quality bar sau khi đo.

## Quality bar đã chốt

> Đạt khi **≥80% case pass**, đồng thời **không case thiếu căn cứ nào được trả `VISUAL_GROUNDED`**.

Một case pass khi:

1. `actualRoute` trùng `expectedRoute`;
2. grounded case chứa ít nhất một fact bắt buộc nhìn thấy trong fixture và không thêm claim trái hình;
3. output có dấu hiệu tiếng Việt;
4. output đúng bốn field và qua runtime validator.

## Golden set

[`golden-set.json`](golden-set.json) có **20 case**:

- 8 hard case: 2 case cho mỗi lớp `source_truth`, `ambiguity`, `scope_authority`, `domain`;
- 9 ordinary case;
- 3 rare case;
- 12 case phát triển từ 5 turn chatlog thật đã ẩn danh, chỉ giữ mã C/T và context tối thiểu.

## Run 01 — AI thật

| Thuộc tính | Kết quả |
|---|---|
| Provider | OpenRouter |
| Model | `openai/o4-mini` |
| Tổng case | 20 |
| Pass | **18** |
| Fail | **2** |
| Pass rate | **90%** |
| Unsupported grounded | **0** |
| So với quality bar | **Đạt** |

Hai failure được giữ nguyên:

- `O08`: mong đợi `VISUAL_GROUNDED`, model trả `NEED_WIDER_REGION`; false recovery, không hallucinate.
- `R02`: mong đợi `INSUFFICIENT`, model trả `NEED_BETTER_IMAGE`; sai taxonomy recovery, không trả lời bịa.

Nguồn kiểm chứng:

- Kết quả đủ từng case: [`run-01-results.json`](run-01-results.json)
- Phân tích ngắn: [`run-01-summary.md`](run-01-summary.md)
- Trace lời gọi thật đã redacted: [`real-call-trace.json`](real-call-trace.json)
- Script chạy lại: [`run-eval.mjs`](run-eval.mjs)

## Kiểm chứng prototype tại commit `ba2a1e3`

| Gate | Kết quả | Phạm vi chứng minh |
|---|---:|---|
| Automated tests | **79/79 pass** | Provider, visual contract, selection geometry, Snip, PDF context, detector, overlay và wiring regressions |
| Static syntax check | Pass | `server.mjs` và `public/app.js` |
| PDF thật | **49/49 trang render** | `01 - 4-day02-lecture-slides-v2.pdf` |
| PDF page 1 canvas | `1001 × 563` | Canvas bitmap hiển thị, không phải khung trắng |
| PDF page 1 text layer | **88 span** | Text layer có thể chọn và làm context Tutor |
| Zoom smoke | `90% → 100%` | Canvas render lại thành công |
| Read/Pen/Circle regression | Pass | Annotation cũ không bị Snip làm hỏng |
| Snip API isolation | **0 request** | Tạo Snip không gọi `/api/tutor` hoặc `/api/analyze` |
| Browser errors | **0** | Golden path được drive bằng Edge headless |

Browser smoke output được ghi nhận trong phiên review merge C3/C4/C5. Screenshot cục bộ không được commit vì chỉ là ảnh tạm; các assertion có thể tái lập bằng automated suite và kịch bản dưới đây.

## Kết quả detector trên PDF thật

Đây là kiểm chứng package C3/C4, chưa phải flow UI C8:

- Trang 1: không candidate sau khi loại footer/background trang trí.
- Trang 2: một vector candidate hữu ích.
- Trang 6: candidate text, image và vector.
- Trang 9: một vector candidate lớn trong ngưỡng hợp lệ.
- Page-sized background, vector quá lớn và nét trang trí mỏng bị lọc.

Không được diễn giải các kết quả trên thành “auto-detect/click-to-AI đã chạy trên UI”; detector và C5 overlay chưa được C8 nối vào `app.js`.

## Chạy lại

Automated suite không cần API key:

```bash
cd codebase
npm run check
npm test
```

AI eval cần provider được cấu hình và sẽ tạo lời gọi thật:

```bash
node eval/run-eval.mjs
```

Không commit `.env`, API key, raw crop, raw question hoặc upstream response body. Khi chạy lại phải tạo một run mới; không ghi đè hoặc chỉnh sửa Run 01 để làm đẹp tỷ lệ.
