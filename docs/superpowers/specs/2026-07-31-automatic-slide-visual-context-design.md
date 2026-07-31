# Automatic Slide Visual Context Design

## Goal

Cho phép câu hỏi Tutor thông thường hiểu pixel của một slide mà learner không cần chọn candidate, Snip hoặc Circle.

## Scope

- Nếu câu hỏi chứa `slide N` hoặc `trang N`, dùng slide N khi N tồn tại.
- Nếu không nhắc số slide, dùng slide đang mở.
- Mỗi request chỉ gửi một slide; không quét hoặc gửi cả PDF.
- Chỉ áp dụng cho PDF tải lên; Direction B và các selection flow hiện tại giữ nguyên.
- Selection tường minh vẫn có ưu tiên cao hơn whole-slide context.

## Learner control

Composer hiển thị `AI sẽ xem toàn bộ slide N` trước khi gửi. Nút `×` tắt whole-slide visual context cho câu hỏi hiện tại và trả về text-only. Crop/render và lời gọi AI chỉ xảy ra sau explicit submit.

## Data flow

```text
question input → resolve explicit slide N or current slide
→ visible removable whole-slide chip
→ explicit Send → await selected page render
→ encode PDF canvas + bounded page text
→ /api/analyze → four-route result + provenance “Dựa trên toàn bộ slide N”
```

Nếu câu hỏi nhắc một slide ngoài phạm vi tài liệu, hệ thống báo lỗi tại composer và không fallback âm thầm sang slide hiện tại.

## Safety and privacy

- API key vẫn chỉ ở server.
- Không persist whole-slide image, extracted text, raw question hoặc chat.
- Không tạo request khi chip xuất hiện hoặc bị bỏ.
- Document/zoom changes abort stale render/extraction ownership.
- Payload vẫn chịu giới hạn 10 MB.

## Verification

- Parser nhận `slide 5` và `trang 5`, không nhận số ngoài phạm vi.
- Không nhắc số dùng current page.
- Explicit selection giữ precedence.
- Chip hiển thị đúng slide và `×` chuyển về text-only.
- Whole-slide submit gọi `/api/analyze` đúng một lần; không gọi `/api/tutor`.
- Provenance ghi toàn bộ slide, không giả là Snip/candidate.
- Zero request before submit; stale document/zoom work bị bỏ.
- Existing Direction B/C tests tiếp tục pass.
