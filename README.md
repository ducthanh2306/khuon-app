# KHUÔN — Text, Vault & QR Instrument

Ứng dụng tiện ích All-in-One cho **Android** (React Native / Expo), tập trung vào tốc độ, khả năng chạy **100% offline** và giao diện tối giản chuẩn công cụ cơ khí chính xác.

## Triết lý thiết kế (Anti-AI-Slop)
* **Dieter Rams (Braun):** *“Less, but better”* — loại bỏ trang trí dư thừa, bóng mờ nặng, gradient tím-xanh hay card bo tròn phồng.
* **Swiss Typographic Grid:** Sử dụng lưới cấu trúc phẳng với đường kẻ `1px` (`#D8D5CC` trên nền giấy ấm `#F4F3EF`, hoặc `#2C2B27` trên nền than chì OLED `#111110`), điểm nhấn duy nhất màu cam tín hiệu `#E84A1A`.
* **Typography Việt hóa chuẩn:** `Be Vietnam Pro` cho nội dung tiếng Việt sắc nét + `JetBrains Mono` (`tabular-nums`) cho thông số kỹ thuật, mã code và số tài khoản.
* **Tactile Feedback:** Phản hồi rung Haptic Android khi chuyển chế độ, copy và quét mã.

## 4 Kênh chức năng chính
1. **`01 // CHUẨN HOÁ`**: Sửa lỗi Unicode NFD, dấu thanh tách rời bởi khoảng trắng PDF/OCR (`Tiế ng Việ t` → `Tiếng Việt`), đặt dấu chuẩn mới (`hoà` → `hòa`, `thuý` → `thúy`), gộp dòng đứt từ PDF, làm sạch dấu câu (vẫn bảo vệ URL/email/file), xóa ký tự ẩn zero-width, đọc tệp `.docx` / `.txt` / `.md` / `.srt` / `.html`, so sánh trước/sau và tự trích xuất SĐT / Email / Link / Mã.
2. **`02 // KHO MÃ`**: Lưu các đoạn mã, số tài khoản, mẫu trả lời hay dùng; hỗ trợ tìm tiếng Việt không dấu, ghim lên đầu, ẩn thông tin nhạy cảm (`•••`), và **mẫu biến số động** (`{{tên}}`, `{{ngày}}`, `{{mã_đơn}}`) để điền & copy trong 3 giây.
3. **`03 // QUÉT QR`**: Camera quét trực tiếp (hỗ trợ đèn pin & quét từ ảnh thư viện), tự giải mã **VietQR chuyển khoản** (nhận diện 30+ ngân hàng VN qua mã BIN, số TK, số tiền, nội dung), **Wi-Fi QR**, **vCard**, **URL**; tích hợp trình **Tạo mã QR** SVG vector và **Lịch sử quét offline**.
4. **`04 // TIỆN ÍCH`**: Biến đổi chữ (HOA/thường/Title/Slug/Bỏ dấu/Sắp xếp/Xóa trùng/Tiền tố-Hậu tố), lọc hàng loạt SĐT/Email/URL/Mã, so sánh 2 văn bản (Diff), đếm thống kê chi tiết và sao lưu/khôi phục dữ liệu JSON.

## Cách chạy trên Android
```bash
cd khuon-app
npm install
npx expo start
```
* **Chạy ngay trên điện thoại Android:** Mở app **Expo Go** trên Android → Quét mã QR hiện trong terminal.
* **Đóng gói file `.apk` cài trực tiếp:**
  ```bash
  npx eas build -p android --profile preview
  ```
* **Chạy thử bản Web Preview:**
  ```bash
  npx expo start --web
  ```

## Kiểm thử
```bash
npm run typecheck
npm test
```
