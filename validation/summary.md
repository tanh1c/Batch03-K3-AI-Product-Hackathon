# Validation summary — Visual Context Rescue

## Thiết lập

- **Ngày thu thập:** 30/07/2026
- **Người thu thập:** Chu Nguyễn Tuấn Anh
- **Người thử:** 5 người thuộc team khác, đều đồng ý dùng câu trả lời trong artifact.
- **Willing users CP1:** 5/5 phiếu đánh dấu Có.
- **Prototype được thử:** Direction B — chọn vùng sơ đồ Machine Learning/Deep Learning trên slide demo và xử lý một vùng thiếu context.
- **Cách thử:** người điều phối giao task rồi quan sát, không chỉ cách bấm; chi tiết tại [`protocol.md`](protocol.md).

Validation này chỉ đánh giá Direction B. C6–C8 hiện đã có flow end-to-end và browser assertions, nhưng chưa có vòng usability study mới với người dùng cho auto-detect, Circle hoặc Snip-to-AI của Direction C.

## Người tham gia và kết quả

| ID | Người thử | Task giải thích ML/DL | Recovery | Độ tin cậy | Severity |
|---|---|---|---|---|---|
| V01 | Nguyễn Thị Hải Yến | Có, không trợ giúp | Có trong một lần; hiểu ngay | Tin nhưng muốn kiểm tra lại slide | Low |
| V02 | Nguyễn Hoàng Biên | Có, không trợ giúp | Có trong một lần; hiểu ngay | Tin và có thể tiếp tục học | Không có vấn đề |
| V03 | Trần Xuân Lộc | Có, không trợ giúp | Có trong một lần; chỉ hiểu khi được giải thích | Tin nhưng muốn kiểm tra lại slide | Medium |
| V04 | Hồ Thúy Hằng | Có, cần trợ giúp | Có trong một lần; hiểu sau khi đọc lại | Tin nhưng muốn kiểm tra lại slide | Medium |
| V05 | Lê Chí Anh Tuấn | Có, không trợ giúp | Có sau nhiều lần; hiểu ngay | Tin và có thể tiếp tục học | Low |

Nguồn: [`collection-form-1.md`](collection-form-1.md) đến [`collection-form-5.md`](collection-form-5.md) và [`feedback-log.md`](feedback-log.md).

## Kết quả định lượng

| Chỉ số | Kết quả |
|---|---:|
| Hoàn thành task giải thích sơ đồ | **5/5 (100%)** |
| Hoàn thành task không cần trợ giúp | **4/5 (80%)** |
| Hoàn thành recovery | **5/5 (100%)** |
| Recovery thành công trong một lần | **4/5 (80%)** |
| Hiểu recovery ngay hoặc sau khi đọc lại | **4/5 (80%)** |
| Output được đánh giá hoàn toàn/phần lớn đúng hình | **5/5 (100%)** |
| Tin để tiếp tục học hoặc tin nhưng muốn kiểm tra slide | **5/5 (100%)** |
| Chắc chắn sẽ dùng nếu VLearn có tính năng | **5/5 (100%)** |
| Critical failure | **0/5 (0%)** |

Mẫu chỉ có 5 người nên các tỷ lệ trên là bằng chứng validation định tính cho prototype, không đại diện cho toàn bộ học viên VLearn.

## Vấn đề quan sát được

- **2/5** phiếu ghi nhận khó nhận ra vùng hình có thể bấm (`V02`, `V04`).
- **2/5** phiếu ghi nhận không rõ nên hỏi câu gì (`V01`, `V05`).
- **1/5** người chỉ hiểu recovery khi được giải thích (`V03`).
- **1/5** người cần trợ giúp để hoàn thành task đầu (`V04`).
- **1/5** người thấy câu trả lời dài hoặc khó đọc (`V04`).
- Không có người nào báo chi tiết sai nghiêm trọng hoặc Critical.

## Quote nguyên văn

> “Hiện chưa có” — V01

> “không cần thay đổi” — V02

> “tôi không thấy phải thay đổi gì” — V03

> “Không cần thay đổi” — V04

> “Tôi thấy tính năng làm khá tốt, không cần thay đổi gì hết.” — V05

Các quote được giữ nguyên chữ hoa/thường và cách diễn đạt từ phiếu; không viết lại cho đẹp. Những câu trả lời tích cực không phủ nhận các khó khăn hành vi đã được chọn trong phần trắc nghiệm.

## Quyết định sản phẩm

**Quyết định:** làm vùng hình dễ nhận biết hơn và thêm câu hỏi gợi ý ngắn ngay sau khi chọn vùng.

**Căn cứ:** `V02` và `V04` khó nhận ra vùng có thể bấm; `V01` và `V05` không rõ nên hỏi gì. Đây là hai pattern lặp lại nhiều nhất trong mẫu.

**Trạng thái:** quyết định đã ghi vào `spec.md` §9. Phần UI phải được triển khai và kiểm thử trước khi tuyên bố đã xử lý feedback; nếu chưa kịp trước demo, trình bày đây là backlog có căn cứ thay vì nói đã hoàn thành.

## Kết luận

Direction B chứng minh được job chính với 5/5 người hoàn thành và không có Critical failure. Điểm yếu lớn nhất không nằm ở khả năng AI trả lời mà ở discoverability của vùng bấm và việc giúp người học bắt đầu câu hỏi. Direction C đã được tích hợp và kiểm tra kỹ thuật bằng browser assertions, nhưng validation này vẫn chưa chứng minh auto-detect, Circle hoặc Snip-to-AI usable với người dùng thật.
