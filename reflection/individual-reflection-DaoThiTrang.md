# Individual Reflection — Đào Thị Trang

- **Họ và tên:** Đào Thị Trang
- **Mã học viên:** 2A202601809
- **Nhóm:** F2 — Lab D305
- **Vai trò trong dự án:** Phụ trách Package C3 (Phát hiện Image/Vector Candidate) & Package C4 (Ghép Text Items thành Text Block) trong module `codebase/public/pdf-regions.mjs`.
- **Dự án:** Visual Context Rescue (Direction C)

---

## 1. Vai trò và phần công việc thực tế đã đảm nhận

**Phân tích số liệu Chatlog:**
- Trong 1.261 turn hỏi đáp ẩn danh của VLearn, nhóm đào ra 5 lượt học viên trực tiếp hỏi về nội dung trực quan (hình ảnh, biểu đồ, bảng biểu).
- Con số bằng chứng (Pain-point): Có đến 4/5 lượt (chiếm 80%) AI Tutor bị thất bại, từ chối trả lời vì không nhận diện được vùng ảnh/bảng được khoanh.
**Ví dụ tiêu biểu:**
- Turn C0108/T0816: Học viên hỏi "người trong ảnh là ai", Tutor từ chối vì không đọc được ảnh.
- Turn C0346/T0840: Học viên hỏi "phân tích hình ảnh được khoanh đỏ ở slide 59", Tutor báo không thấy hình.
**Ý nghĩa với sản phẩm:**
 Chứng minh nỗi đau người học hoàn toàn là có thật (bằng con số thực tế), giúp khẳng định tính cấp thiết và giá trị thực tế của dự án Visual Context Rescue khi thuyết trình trước Hội đồng.

Trong dự án **Visual Context Rescue (Direction C)**, em chịu trách nhiệm xây dựng module **Local Candidate Detector** (`pdf-regions.mjs`). Đây là thành phần giúp tự động phân tích trang PDF trên trình duyệt để gợi ý các vùng hình ảnh, đồ họa vector và khối văn bản giúp người học có thể chọn nhanh bằng một cú click.

Cụ thể, các công việc em đã trực tiếp triển khai:
- **Package C3 (Image & Vector Detector):** Đọc danh sách lệnh vẽ (`operator list`) từ PDF.js, trích xuất mã opcodes (như `paintImageXObject`) và ma trận biến đổi CTM để xác định chính xác vị trí/kích thước ảnh trên trang, sau đó chuẩn hóa về tọa độ `[0, 1]`.
- **Package C4 (Text Block Detector):** Đọc danh sách `text items` từ PDF.js, xây dựng thuật toán gom các từ nằm cùng dòng (dựa vào tọa độ Y) và nhóm các dòng sát nhau thành các đoạn văn (Text Block) hoàn chỉnh.
- **Bộ lọc 3 lớp (Filter Candidates):** Thiết lập cơ chế lọc vùng rác nhỏ (`area < 0.005`), loại bỏ hình nền phủ cả trang (`area >= 0.92`), và khử trùng lặp các vùng đè lên nhau bằng thuật toán **Intersection over Union (IoU >= 0.7)**.
- **Unit Testing:** Xây dựng file unit test `codebase/test/pdf-regions.test.mjs` kiểm thử trọn vẹn 4 kịch bản (Text Merging, Image Extraction, Filtering, Page Combined) đạt tỷ lệ Pass 100%.

---

## 2. Sự đóng góp và thấu hiểu từ Evidence Mining (Đào dữ liệu chatlog)

Bên cạnh phần kỹ thuật, em đã tìm hiểu và phân tích phần **Evidence Mining** từ tập dữ liệu thực tế của dự án (`data/vlearn-pack/chatlog/chat_history_anonymized_for_hackathon.csv`):
- **Phân tích dữ liệu thực tế:** Trong tổng số 1.261 turn hỏi đáp (từ 369 học viên), nhóm đã đào ra 5 lượt người học trực tiếp hỏi về nội dung trực quan (hình ảnh, biểu đồ, bảng biểu trên slide).
- **Thấu hiểu Pain-point:** Điểm đáng chú ý là có tới **4/5 lượt (chiếm 80%)** AI Tutor phải phát lời từ chối trả lời với lý do: *"không tìm thấy hình ảnh/bảng được khoanh"* hoặc *"không có thông tin hình ảnh xác định"*. Ví dụ tiêu biểu:
  - Turn `C0108/T0816`: Học viên hỏi *"người trong ảnh là ai"*, Tutor từ chối vì không đọc được ảnh.
  - Turn `C0346/T0840`: Học viên hỏi *"phân tích hình ảnh được khoanh đỏ ở slide 59"*, Tutor báo không thấy hình.
- **Ý nghĩa với sản phẩm:** Số liệu mining này là bằng chứng thực tế (Evidence) đắt giá chứng minh tính cấp thiết của giải pháp **Visual Context Rescue**. Nó khẳng định rằng người học thực sự gặp khó khăn khi muốn hỏi về hình ảnh trên slide, và giải pháp crop đúng vùng ảnh gửi cho Visual AI sẽ giải quyết trực tiếp nỗi đau này.

---

## 3. Sự hỗ trợ từ AI (Minh bạch phân công)

Trong quá trình làm bài Hackathon, em đã sử dụng trợ lý AI (Antigravity Assistant) làm bạn đồng hành Lập trình cặp (Pair Programming):
- **AI hỗ trợ:** Gợi ý khung cấu trúc hàm (boilerplate code), viết các mock fixture dữ liệu PDF.js cho unit test, và tối ưu công thức tính tỷ lệ giao thoa IoU.
- **Phần tự làm & Kiểm soát chất lượng:** Em trực tiếp đưa ra logic nghiệp vụ, lựa chọn các tham số ngưỡng heuristic phù hợp (`minArea`, `maxArea`, `iouThreshold`), trực tiếp chạy thử nghiệm, kiểm tra sự tuân thủ hợp đồng dữ liệu (Selection Contract C0) và đảm bảo code hoạt động hoàn toàn độc lập mà không bị dính phụ thuộc chéo.

---

## 4. Bài học kinh nghiệm từ Case Fail / Thách thức kỹ thuật

- **Thách thức gặp phải:** Trong lượt chạy thử nghiệm đầu tiên với các slide PDF chứa ảnh nền trang trí (background slide) hoặc các biểu tượng logo rất nhỏ, detector bị nhận diện nhầm thành hàng chục candidate rác, gây rối mắt cho người dùng.
- **Bài học rút ra:** Em nhận ra rằng một bộ gợi ý tốt không phải là cố gắng tìm ra 100% mọi đối tượng trên trang, mà phải có tư tư duy **Conservative Filtering (Lọc bảo thủ)**. Việc bổ sung bộ lọc diện tích kết hợp với thuật toán IoU đã giúp loại bỏ hoàn toàn nhiễu, chỉ giữ lại tối đa 10 vùng gợi ý chất lượng nhất. Nếu detector không tìm thấy candidate nào, hệ thống vẫn trả về mảng rỗng `[]` an toàn để người học sử dụng công cụ khoanh tay Snip/Circle thủ công.

---

## 5. Tự đánh giá và chuẩn bị phản biện (Q&A)

Em đã nắm được luồng dữ liệu từ PDF.js ➔ Detector ➔ Selection Contract ➔ Visual AI, cũng như số liệu Evidence Mining chứng minh nỗi đau người học. Em đã chuẩn bị sẵn sàng kịch bản giải thích và bộ câu hỏi phản biện kỹ thuật để bảo vệ phần việc của mình trước Hội đồng đánh giá (CP5/CP6).
