# BeyondU AI

Prototype web tiếng Việt cho hành trình khám phá nghề, đánh giá kỹ năng và học theo lộ trình cá nhân.

## Chạy ứng dụng

Yêu cầu Node.js 22 trở lên. Chạy:

```bash
npm run dev
```

Mở <http://localhost:4173>.

## Luồng demo

1. Landing page giới thiệu sản phẩm và gói Free/Plus.
2. Khảo sát 4 bước thu thập giai đoạn, ngành/lĩnh vực, mục tiêu, nghề quan tâm và mức kỹ năng.
3. BeyondU thử lấy gợi ý nghề và lộ trình từ Gemini. Nếu API chưa cấu hình hoặc đang quá tải, demo tạo nội dung dự phòng từ cùng hồ sơ khảo sát để người dùng vẫn đi tiếp được.
4. Hồ sơ, tiến độ học, hội thoại, gói demo, phân tích CV và kết quả phỏng vấn được lưu trong localStorage của trình duyệt hiện tại.

## Cấu hình Gemini (không bắt buộc để xem demo)

Sao chép `.env.example` thành `.env`, đặt khóa vào `GEMINI_API_KEY` và tùy chọn đổi `GEMINI_MODEL`. Khóa chỉ được dùng trong máy chủ; không đưa xuống trình duyệt. Không cần đăng nhập cho demo.

## Các phần tương tác

- Tổng quan, nghề phù hợp, kỹ năng và lộ trình được tạo từ khảo sát.
- Hoàn thành bài học cập nhật kỹ năng, mức sẵn sàng, tiến độ tuần, XP và thông báo.
- Bài học phía sau hai bước đầu mở qua gói Plus demo; thao tác nâng cấp không thu tiền.
- Cố vấn AI dùng hồ sơ hiện tại, có câu trả lời dự phòng khi Gemini bận.
- Phân tích CV mô phỏng và buổi phỏng vấn 5 câu có nhận xét.
- Thị trường nghề có số liệu minh họa, chưa kết nối nguồn tuyển dụng trực tiếp.
- Cài đặt hỗ trợ giao diện tối và xóa dữ liệu demo trên thiết bị.

Prototype hiện dùng JavaScript, CSS và máy chủ Node.js gọn nhẹ. Dữ liệu chưa đồng bộ giữa thiết bị; chưa có cơ sở dữ liệu, thanh toán, phân tích CV thật hoặc dữ liệu thị trường trực tiếp.
