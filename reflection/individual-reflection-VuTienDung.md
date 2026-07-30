# Individual Reflection — AI Product Hackathon

## Thông tin cá nhân

| Mục | Nội dung |
|---|---|
| Họ và tên | Vũ Tiến Dũng |
| Mã học viên | 2A202602009 |
| Nhóm | F2 — Lab D305 |
| Vai trò | Nhóm trưởng; nghiên cứu, chốt canvas, viết spec và review chéo |

## 1. Vai trò và đóng góp của tôi

Trong hackathon, tôi là **nhóm trưởng** và là owner chính của `spec.md`. Phần việc trọng tâm của tôi không phải trực tiếp làm thay toàn bộ evidence, prompt/eval, code hay validation, mà là giữ cho các phần do từng thành viên phụ trách cùng trả lời một bài toán sản phẩm thống nhất: **giúp học viên hỏi về một vùng hình trong tài liệu VLearn mà không phải tự mô tả lại ngữ cảnh bằng chữ**.

| Hoạt động | Tôi đã làm gì? | Kết quả / ảnh hưởng |
|---|---|---|
| Điều phối nhóm | Chia owner theo các luồng Spec, Evidence/mining, Prompt/eval, Code, Validation và Demo/slides; theo dõi đầu ra và review chéo giữa các phần. | Nhóm có thể làm song song nhưng vẫn hội tụ về cùng một lát cắt và cùng bộ thuật ngữ trong spec. |
| Nghiên cứu sản phẩm tương tự | Nghiên cứu cách NotebookLM giữ câu trả lời theo nguồn và cách ChatGPT nhận image input; tách điểm nên học và điểm không phù hợp với flow học trong VLearn. | Nhóm chốt hai nguyên tắc: giữ provenance theo slide/vùng hình và để người học hỏi ngay tại slide, không buộc họ chụp, cắt rồi tải ảnh thủ công sang công cụ khác. |
| Chốt canvas | Tổng hợp User, Job, pain, evidence, impact, solution slice, non-goals, automation, rủi ro, quality bar và kế hoạch validation thành một quyết định sản phẩm nhất quán. | Canvas không dừng ở ý tưởng “Tutor hiểu ảnh”, mà thu hẹp thành một học viên, một thao tác click vùng hình, một quyết định AI về mức đủ căn cứ và một kết quả là giải thích hoặc recovery. |
| Chọn bài toán | Đối chiếu ba ứng viên bằng số liệu mining và khả năng build trong 1,5 ngày; không chọn chỉ theo volume. | Nhóm chọn Visual Context Rescue dù chỉ có 5/1.261 turn, vì có 4 failure quan sát được và là gap hẹp có thể kiểm thử end-to-end; loại Technical troubleshooting vì quá rộng và Concept explanation vì trùng job hiện có của Tutor. |
| Viết AI Spec | Viết và chốt các phần User & Job, impact, nghiên cứu tương tự, thiết kế, non-goals, conditional automation, HAX/PAIR, taxonomy lỗi, bốn đường trải nghiệm, kiểm thử và changelog. | `spec.md` trở thành nguồn quyết định chung để code, prompt, golden set, validation và slide đối chiếu. |
| Chốt boundary an toàn | Yêu cầu AI chỉ giải thích khi vùng hình đủ căn cứ; khi thiếu nhãn, ảnh kém hoặc nội dung ngoài nguồn thì dùng `NEED_WIDER_REGION`, `NEED_BETTER_IMAGE` hoặc `INSUFFICIENT`. | Nhóm ưu tiên tránh học sai kiến thức hơn là cố trả lời mọi câu hỏi; người học luôn có thể chọn lại vùng hoặc sửa câu hỏi. |
| Review evidence | Review cách diễn giải kết quả mining và giới hạn claim: dữ liệu chứng minh hành vi hỏi visual và failure quan sát được, không chứng minh root cause kỹ thuật. | Spec không suy diễn rằng Tutor chắc chắn thiếu OCR/pixel vì chatlog không có vision payload, tọa độ hay retrieval trace. |
| Review prompt/eval | Đối chiếu taxonomy route, 20 case golden set, quality bar và kết quả run với thiết kế trong spec; giữ nguyên các case chưa đạt. | Nhóm báo cáo trung thực 18/20 = 90%, đạt bar ≥80% và không có case thiếu căn cứ bị grounded sai; không “sửa số” cho đẹp. |
| Review code và validation | Review mức prototype Working so với phần thật/phần mock, theo dõi failure crop, và đưa kết quả 5 phiên validation trở lại quyết định sản phẩm. | Spec ghi rõ bounds visual đang cấu hình thủ công; changelog bổ sung intrinsic size 960×540, output tiếng Việt, vùng bấm dễ nhận ra hơn và câu hỏi gợi ý ngắn. |

Đóng góp có ảnh hưởng rõ nhất của tôi là **chốt được lát cắt và giữ sự nhất quán giữa canvas, spec và các artifact của thành viên**. Nếu chỉ mô tả giải pháp là “AI hiểu hình trong PDF”, phạm vi sẽ quá rộng và khó chứng minh trong 1,5 ngày. Tôi đã cùng nhóm đưa ý tưởng về quyết định hẹp nhưng đo được: AI phải phân biệt khi nào có thể trả lời dựa trên vùng hình và khi nào cần recovery thay vì đoán.

## 2. Tôi đã sử dụng AI như thế nào?

| Phase | Tôi dùng AI để làm gì? | AI hữu ích ở đâu? | AI có thể sai hoặc hời hợt ở đâu? | Tôi tự kiểm và sửa gì? |
|---|---|---|---|---|
| Research | Hỗ trợ hệ thống hóa so sánh NotebookLM, ChatGPT image input và flow dự kiến trong VLearn. | Giúp nhanh chóng tách các tiêu chí như provenance, thao tác đưa ảnh vào, grounded answer và recovery. | Dễ biến mô tả tính năng của sản phẩm khác thành khẳng định rằng giải pháp đó giải quyết đúng pain của nhóm. | Chỉ giữ các điểm liên quan trực tiếp đến lát cắt; đối chiếu nguồn chính thức và không dùng nghiên cứu đối thủ thay cho evidence người dùng. |
| Canvas | Dùng AI như người phản biện để kiểm tra canvas đã có đủ actor, job, evidence, impact, quyết định AI, outcome, non-goals và cost-of-error hay chưa. | Giúp phát hiện mô tả còn solution-first hoặc thiếu boundary. | AI có xu hướng đề xuất thêm OCR, auto-segmentation và nhiều tính năng hấp dẫn nhưng vượt thời gian hackathon. | Chốt click-region với bounds cấu hình sẵn; đưa auto-segmentation thành stretch, không nhận là phần Working. |
| Viết spec | Nhờ AI hỗ trợ cấu trúc hóa nội dung, rà thuật ngữ và tìm chỗ chưa nhất quán giữa các mục. | Giúp chuyển thảo luận rời rạc thành một spec có thể giao tiếp giữa product, prompt, code và eval. | Câu chữ có thể nghe chắc chắn hơn bằng chứng, đặc biệt khi suy nguyên nhân kỹ thuật từ chatlog hoặc nói quá mức prototype. | Gắn mỗi claim với artifact, ghi rõ giới hạn của evidence, tách phần thật và mock, và tự chốt quyết định cuối. |
| Risk & recovery | Dùng AI gợi ý hard cases và phản biện hành vi khi nguồn thiếu, crop mơ hồ, yêu cầu ngoài phạm vi hoặc câu hỏi domain bị đảo chiều. | Giúp bao phủ bốn lớp lỗi và chuyển rủi ro thành route có thể kiểm thử. | AI có thể tạo nhiều case trông khác nhau nhưng thực chất lặp cùng một lỗi, hoặc đưa recovery chung chung. | Chốt tám hard case phủ đủ bốn lớp; yêu cầu recovery phải có hành động cụ thể và output phải qua structured validator. |
| Review chéo | Dùng AI hỗ trợ so khớp spec với mining method, golden set, eval summary, validation log và changelog. | Giúp tìm nhanh chênh lệch về số liệu, route, scope và tên gọi giữa các file. | AI không thay được việc xác minh output thực tế, hành vi prototype hay quote của người thử. | Đọc artifact gốc, giữ đúng owner, kiểm số 5/1.261, 18/20, 5 người validation và không tự bổ sung evidence còn thiếu. |

AI trong quá trình này là công cụ hỗ trợ tổng hợp và phản biện, không phải người ra quyết định thay tôi. Những quyết định như chọn Visual Context Rescue dù volume nhỏ, giới hạn MVP ở click-region, dùng conditional automation và giữ nguyên hai case eval fail đều được tôi chốt sau khi đối chiếu evidence, khả năng build và cost-of-error.

## 3. Điều tôi học được

### Evidence lớn chưa chắc tạo ra lát cắt tốt nhất

Ban đầu, ứng viên Concept explanation có volume rất lớn: 666/1.261 turn từ 270/369 user. Tuy nhiên, đây là job Tutor hiện tại đã phục vụ, nên số lớn không tự động chứng minh có một gap sản phẩm mới. Technical troubleshooting cũng lớn hơn visual nhưng quá rộng và khó xác định source of truth trong thời gian ngắn.

Visual Context Rescue chỉ xuất hiện ở 5/1.261 turn, nhưng 4/5 lượt cho thấy Tutor không xác định được context visual. Đây là evidence nhỏ nhưng cụ thể, có failure quan sát được và có thể chuyển thành một giả thuyết build-test rõ ràng. Tôi học được rằng quyết định sản phẩm cần nhìn đồng thời **mức độ đau, tính khác biệt của gap, khả năng đo và khả năng triển khai**, không chỉ xếp hạng theo tần suất.

### Mạch quyết định tôi đã chốt

```text
Học viên đang đọc PDF trong VLearn
→ gặp sơ đồ, hình hoặc bảng không hiểu
→ luồng chọn text không truyền được đúng vùng visual
→ người học phải mô tả lại, thử lại hoặc bỏ qua
→ người học click đúng vùng hình và đặt câu hỏi
→ AI kiểm tra vùng đó có đủ căn cứ hay không
→ đủ căn cứ: VISUAL_GROUNDED + giải thích tiếng Việt + provenance slide
→ chưa đủ căn cứ: recovery cụ thể, không đoán
→ đo bằng route, groundedness, khả năng recovery, ngôn ngữ và contract
```

Điểm quan trọng nhất trong mạch này là **quyết định AI không chỉ là tạo câu trả lời, mà còn là biết khi nào không nên trả lời**. Vì người học có thể khó nhận ra một giải thích hình sai, false grounded nguy hiểm hơn một lần yêu cầu chọn lại vùng. Do đó nhóm đặt hard constraint: không case thiếu căn cứ nào được trả `VISUAL_GROUNDED`.

### Bài học từ failure thật: crop SVG quá nhỏ

Failure đáng nhớ nhất với tôi xảy ra khi vùng crop từ SVG chỉ còn khoảng **122×110 pixel**. Model phản hồi rằng ảnh quá nhỏ thay vì xử lý được nội dung. Nhìn bề ngoài, đây có thể bị quy thành “model vision chưa tốt”, nhưng review lại cho thấy vấn đề nằm ở cả pipeline đầu vào: SVG không có intrinsic size phù hợp nên crop không giữ được độ phân giải cần thiết.

Nhóm sửa bằng cách bổ sung intrinsic size **960×540** cho SVG. Bài học của tôi là khi AI fail, không nên lập tức chỉnh prompt hoặc đổi model. Cần lần ngược toàn chuỗi: vùng người dùng chọn, kích thước render, ảnh crop gửi đi, contract đầu ra, routing và cách UI giải thích recovery. Một hệ thống AI chỉ tốt bằng ngữ cảnh thực tế mà sản phẩm truyền cho nó.

Run 01 còn hai case fail được giữ nguyên. `O08` là false recovery: model yêu cầu vùng rộng hơn dù crop đã đủ để grounded. `R02` không bịa nội dung nhưng chọn sai loại recovery cho ảnh trắng. Hai lỗi này cho thấy “không hallucinate” là điều kiện cần nhưng chưa đủ; taxonomy recovery cũng phải đúng và hữu ích cho bước tiếp theo của người dùng.

## 4. Tôi đã thay đổi quan điểm như thế nào?

Lúc đầu, tôi nghiêng về một trải nghiệm tham vọng hơn: hệ thống tự nhận diện hoặc tự segment mọi vùng visual trong PDF. Sau khi đối chiếu thời gian 1,5 ngày và quyết định trung tâm cần chứng minh, tôi thay đổi quan điểm. Nhóm chọn **click-region với bounds cấu hình sẵn**, vì đây là lát cắt nhỏ nhất vẫn kiểm tra được giả thuyết: khi Tutor nhận đúng crop hình, nó có thể trả lời có căn cứ hoặc recovery đúng hay không. Auto-segmentation không bị phủ nhận, nhưng chỉ nên làm sau khi phần giá trị cốt lõi đã được chứng minh.

Tôi cũng thay đổi từ tư duy “AI nên cố giúp trả lời” sang **conditional automation**. Với case đủ căn cứ, hệ thống tự giải thích. Với crop thiếu nhãn, ảnh kém hoặc câu hỏi ngoài nguồn, hệ thống phải thu hẹp và trao lại quyền sửa cho người học. Kết quả 18/20 củng cố hướng này: hai lỗi còn lại đều là recovery quá thận trọng hoặc sai taxonomy, trong khi không có case thiếu căn cứ nào bị trả lời bịa.

Cuối cùng, validation làm tôi nhìn rõ khoảng cách giữa logic đúng và trải nghiệm dễ dùng. Dù 5/5 người thử hoàn thành Task 1 và đánh giá output đúng hình, 2/5 khó nhận ra vùng có thể bấm, 2/5 không rõ nên hỏi gì, và 1 người chỉ hiểu recovery sau khi được giải thích. Vì vậy nhóm quyết định làm vùng tương tác rõ hơn và thêm câu hỏi gợi ý ngắn. Một prototype có AI đúng chưa đồng nghĩa người dùng hiểu cách khởi động và sửa lỗi.

## 5. Nếu làm lại

1. **Chốt contract giữa các owner sớm hơn.** Tôi sẽ thống nhất ngay từ đầu tên route, schema output, định nghĩa pass, fixture và provenance để spec, prompt, code và eval không phải đồng bộ lại về sau.
2. **Test pipeline ảnh trước khi tối ưu prompt.** Tôi sẽ tạo sớm một checklist về intrinsic size, kích thước crop tối thiểu, định dạng ảnh và log payload đã redacted. Case 122×110 cho thấy một kiểm tra kỹ thuật nhỏ có thể tiết kiệm nhiều vòng chẩn đoán model.
3. **Đưa validation vào ngay từ wireframe.** Tôi sẽ thử sớm khả năng nhận ra vùng bấm, cách đặt câu hỏi và khả năng hiểu recovery, thay vì chỉ đợi prototype end-to-end. Đây là ba điểm ma sát không thể phát hiện chỉ bằng golden set.
4. **Làm rõ trade-off của recovery bằng metric riêng.** Ngoài overall pass rate, tôi sẽ theo dõi false recovery, wrong recovery taxonomy và số lần người dùng phải thử lại. Điều này giúp cải thiện trải nghiệm mà không làm yếu hard constraint chống grounded sai.

Câu hỏi tôi sẽ dùng để challenge nhóm mạnh hơn là: **“Nếu tăng tỷ lệ trả lời làm tăng nguy cơ grounded sai, chúng ta chấp nhận bao nhiêu false recovery để vẫn bảo vệ người học, và UI phải làm gì để chi phí sửa sai đủ thấp?”**

## 6. Kết luận cá nhân

Qua hackathon, tôi hiểu rõ hơn vai trò của nhóm trưởng trong một bài AI Product không phải là tự làm tất cả, mà là **giữ cho evidence, canvas, spec, code, eval và validation cùng phục vụ một quyết định sản phẩm có thể giải thích được**. Đóng góp chính của tôi là nghiên cứu giải pháp tương tự, chốt lát cắt Visual Context Rescue, viết spec, đặt boundary an toàn và review chéo các artifact trước khi nhóm hội tụ.

Bài học lớn nhất của tôi là không đánh giá hệ thống AI chỉ qua một câu trả lời hay một tỷ lệ pass. Cần kiểm tra toàn bộ chuỗi từ evidence, chất lượng context đầu vào, hành vi khi thiếu căn cứ, khả năng người dùng sửa lỗi cho đến sự trung thực khi báo cáo failure. Với sản phẩm học tập, một recovery đúng và dễ sửa đôi khi có giá trị hơn một câu trả lời tự tin nhưng không đủ căn cứ.
