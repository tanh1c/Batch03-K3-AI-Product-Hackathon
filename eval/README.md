# Evaluation — Visual Context Rescue

Thư mục này lưu golden set, kết quả đầy đủ của lời gọi AI thật và bằng chứng kỹ thuật của prototype. Các failure được giữ nguyên; không hạ quality bar sau khi đo.

## Quality bar đã chốt

- **Direction B:** đạt khi **≥80% case pass** và **không case thiếu căn cứ nào được trả `VISUAL_GROUNDED`**.
- **Direction C v1:** đạt khi **≥10/12**, unsupported grounded bằng **0**, wrong-page crop bằng **0**, và cả fallback Snip/Circle usable.

Một case pass khi:

1. `actualRoute` trùng `expectedRoute`;
2. automated check tìm thấy ít nhất một fact bắt buộc trong grounded case;
3. output có dấu hiệu tiếng Việt;
4. output đúng bốn field và qua runtime validator;
5. người review đọc mọi grounded output để loại claim trái fixture trước khi kết luận gate.

## Golden set

[`golden-set.json`](golden-set.json) là bộ Direction B lịch sử gồm 20 case: 8 hard, 9 ordinary và 3 rare.

[`direction-c-golden-set.json`](direction-c-golden-set.json) là bộ Direction C v1 đã đóng băng gồm đúng 12 case: 4 mixed, 3 scanned, 3 recovery và 2 detector fallback. Bộ này bao phủ Snip, Circle, detected text, detected image, vector-as-detected-image, OCR-aware metadata và hai fallback thủ công. Năm PNG đều là fixture tổng hợp có SHA-256 trong set; không có crop từ PDF thật được commit.

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

## C9 — AI thật và browser gate

| Run | Kết quả | Unsupported grounded | Gate |
|---|---:|---:|---|
| Direction C Run 01 | **9/12 (75%)** | 0 | **Chưa đạt 10/12** |
| Direction B hậu-C7 | **19/20 (95%)** | 1 | **Chưa đạt hard constraint** |

Direction C failure được giữ nguyên: `C07` và `C10` chọn `NEED_WIDER_REGION` thay vì `NEED_BETTER_IMAGE`; `C09` chọn `NEED_WIDER_REGION` thay vì `INSUFFICIENT`. Bảy grounded output đã được rà theo fixture và không thấy claim ngoài nguồn.

Direction B hậu-C7 có failure nghiêm trọng `R02`: model trả `VISUAL_GROUNDED` và bịa bảng lệnh QEMU/GDB từ fixture trắng. Run 01 lịch sử 18/20 vẫn bất biến và vẫn là kết quả đã đo trước thay đổi C7.

Nguồn kiểm chứng mới:

- [`direction-c-run-01-results.json`](direction-c-run-01-results.json) và [`direction-c-run-01-real-call-trace.json`](direction-c-run-01-real-call-trace.json)
- [`direction-b-post-c7-run-01-results.json`](direction-b-post-c7-run-01-results.json) và [`direction-b-post-c7-run-01-real-call-trace.json`](direction-b-post-c7-run-01-real-call-trace.json)

Browser gate C8 trên PDF thật 49 trang: candidate lazy ở trang 2/6/9; Snip/Circle/candidate chỉ gửi sau explicit Send; Circle crop không chứa annotation canvas; outline giữ qua zoom 60/90/150%; recovery trở lại Snip; đổi tài liệu xóa selection; Direction B không nhận metadata C7; localStorage không giữ raw visual data; mobile 390 px không overflow; browser error bằng 0. Đây là evidence kỹ thuật, không phải usability study Direction C.

## Chạy lại

Automated suite không cần API key:

```bash
cd codebase
npm run check
npm test
```

Validate set offline, không cần key/network và không tạo output:

```bash
node eval/run-eval.mjs --validate --set eval/direction-c-golden-set.json
```

AI eval cần provider được cấu hình và bắt buộc dùng tên output mới:

```bash
node --env-file-if-exists=codebase/.env eval/run-eval.mjs --run \
  --set eval/direction-c-golden-set.json \
  --results eval/direction-c-run-02-results.json \
  --trace eval/direction-c-run-02-real-call-trace.json
```

Runner reserve cả hai file bằng `wx` trước khi gọi provider, từ chối overwrite và xóa reservation nếu run không hoàn tất. `passed`/`passRate` là automated score; runner đặt `providerGateMet: null` cho tới khi grounded outputs được review thủ công. Không commit `.env`, API key, raw crop, raw question, base64 image hoặc upstream response body; không chỉnh sửa Run 01 để làm đẹp tỷ lệ.
