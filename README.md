# KHUÔN — Kho Mã, Quét QR & OCR Đa Ngôn Ngữ

Ứng dụng tiện ích **offline-first** cho **Android & Web** (React Native + Expo SDK 58), tối ưu cho các thao tác nhanh hằng ngày: lưu mẫu tin nhắn kèm ảnh QR ngân hàng, quét & tạo VietQR, cắt vùng ảnh nhận diện chữ đa ngôn ngữ (OCR), và tùy biến giao diện đọc rõ nét.

> **Tech stack:** Expo SDK 58 · React Native 0.88 · TypeScript · Android ML Kit OCR · Tesseract.js (Web) · Vitest

---

## Tính năng chính

### `01 // KHO MÃ`
- Lưu số tài khoản, mã code, mẫu trả lời, địa chỉ theo từng nhóm phân loại (`Ngân hàng`, `Mã / Code`, `Mẫu trả lời`, `Địa chỉ`, `Công việc`, `Khác`).
- **Đính kèm ảnh (QR ngân hàng / thẻ thông tin):** chọn từ thư viện hoặc chụp trực tiếp, hiển thị thumbnail ngay trên thẻ và chạm để mở xem toàn màn hình (lightbox).
- Tìm kiếm tiếng Việt **có dấu hoặc không dấu**, ghim mục quan trọng, ẩn dữ liệu nhạy cảm (`•••`), hỗ trợ **biến số động** dạng `{{tên}}`, `{{ngày}}`, `{{mã_đơn}}`.

### `02 // QUÉT QR`
- Quét QR trực tiếp trong tab, hỗ trợ **zoom in / zoom out** (chụm 2 ngón, nút `-` / `+` và mức nhanh `1.0×` · `1.5×` · `2.0×` · `3.0×`), đèn pin, quét từ ảnh thư viện hoặc dán chuỗi.
- **Tạo mã QR đa dạng:**
  - **VietQR chuyển khoản (EMVCo + CRC16):** chọn ngân hàng Việt Nam (tìm theo tên hoặc mã BIN), nhập số tài khoản, số tiền (không bắt buộc) và nội dung chuyển khoản; lưu thẳng ảnh QR vào Kho Mã.
  - **Văn bản / Link** và **Wi-Fi QR**.
- Giải mã có cấu trúc và lưu **Lịch sử quét** cục bộ.

### `03 // QUÉT CHỮ (OCR)`
- Chọn ảnh từ thư viện hoặc **chụp ảnh camera trực tiếp**.
- **Cắt phân vùng trên ảnh:** kéo khung trực tiếp vào đúng đoạn chữ cần đọc trước khi quét.
- **Hỗ trợ đa ngôn ngữ:** Tự động / Đa ngôn ngữ, Việt / Anh, Nhật (`日本語`), Hàn (`한국어`), Trung (`中文`) — dùng **Google ML Kit OCR** offline trên Android và **Tesseract.js** trên Web.
- **Chuẩn hóa & trích xuất thông tin:** tự làm gọn khoảng trắng thừa mà vẫn giữ nguyên nội dung chữ, đồng thời bóc tách sẵn **`SĐT`**, **`EMAIL`**, **`MÃ / STK`**, **`URL`** ngay bên dưới để chạm copy lẻ hoặc lưu vào Kho Mã.

### `04 // CÀI ĐẶT`
- Chuyển nhanh nền **Giấy (`paper`)** / **Than chì OLED (`charcoal`)**, tùy chỉnh **6 màu nhấn**, **3 mức tương phản mực**, **phông chữ** (`Be Vietnam Pro`, `JetBrains Mono`, `Hệ thống`) và **cỡ chữ**.
- Tùy chọn bật/tắt rung phản hồi (Haptics), ngôn ngữ OCR mặc định và chế độ tự chuẩn hóa kết quả OCR.
- **Sao lưu & khôi phục dữ liệu** (Kho Mã, lịch sử QR, cài đặt) bằng JSON qua clipboard.

---

## Cấu trúc dự án

```text
khuon-app/
├── App.tsx                         # Shell chính, nạp dữ liệu & 4 tab
├── app.json                        # Cấu hình Expo SDK 58, quyền & native plugins
├── eas.json                        # Cấu hình EAS Build (development / preview / apk / production)
├── plugins/
│   └── withWindowsCmakeFix.js      # Config plugin tránh lỗi giới hạn 260 ký tự Ninja trên Windows
└── src/
    ├── types/app.ts                # Định nghĩa kiểu dữ liệu (Snippet, QR, Settings, OCR)
    ├── theme/tokens.ts             # Bảng màu Giấy/Than chì, 6 preset màu, font & tỷ lệ chữ
    ├── engines/
    │   ├── qrParser.ts             # Parse & tạo VietQR (CRC16), Wi-Fi, vCard, URL
    │   ├── textNormalizer.ts       # Chuẩn hóa văn bản OCR & trích xuất SĐT / Email / Mã / URL
    │   ├── textTools.ts            # Bỏ dấu tiếng Việt, biến mẫu {{}}, line diff
    │   ├── docReader.ts            # Đọc tệp .docx / .html / .srt
    │   └── __tests__/              # Unit tests (Vitest)
    ├── services/
    │   ├── ocrService.ts           # OCR offline Android/iOS (rn-mlkit-ocr)
    │   ├── ocrService.web.ts       # OCR trên Web (tesseract.js)
    │   ├── qrImageDecoder.ts       # Giải mã QR từ ảnh trên mobile (expo-camera)
    │   ├── qrImageDecoder.web.ts   # Giải mã QR từ ảnh trên Web (jsqr)
    │   ├── imageVault.ts           # Lưu/xóa ảnh Kho Mã (mobile & bản .web.ts)
    │   ├── storage.ts              # Lưu trữ cục bộ (AsyncStorage)
    │   └── haptics.ts              # Phản hồi rung chạm trên mobile
    ├── components/                 # Header, ChannelBar, ImageRegionCropper, SvgQrCode, ...
    └── screens/                    # VaultScreen, QrScreen, OcrScreen, SettingsScreen
```

---

## Cài đặt & Chạy thử

```powershell
cd khuon-app
npm install
```

* **Chạy trên Web (kiểm tra nhanh UI & logic):**
  ```powershell
  npm run web
  ```
* **Chạy trên Android (máy ảo hoặc điện thoại bật USB Debugging):**
  > App dùng native module `rn-mlkit-ocr` cho OCR offline nên cần chạy **Development Build** (không dùng Expo Go).
  ```powershell
  npx expo run:android
  ```

---

## Build file `.apk`

### Build trực tiếp trên máy (Android Studio + SDK)

```powershell
cd khuon-app\android
.\gradlew.bat :app:assembleRelease
```

File APK cài độc lập sau khi build nằm tại: `android\app\build\outputs\apk\release\app-release.apk`.  
*(Muốn build riêng cho điện thoại Android ARM 64-bit cho nhẹ và nhanh hơn: thêm `-PreactNativeArchitectures=arm64-v8a` vào sau lệnh trên).*

> Trên Windows, [withWindowsCmakeFix.js](plugins/withWindowsCmakeFix.js) tự cấu hình đường dẫn CMake ngắn (`D:/kcxx` hoặc `C:/kcxx`) và `-DCMAKE_OBJECT_PATH_MAX=225` để tránh lỗi Ninja `Filename longer than 260 characters`.

### Build trên Cloud (EAS Build)

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

---

## Kiểm tra mã nguồn & Unit Test

```powershell
npm run typecheck
npm test
```
