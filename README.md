# KHUÔN — Kho Mã, Quét QR & Lọc Dữ Liệu
# KHUÔN — Kho Mã, Quét QR & OCR Đa Ngôn Ngữ

Ứng dụng tiện ích **100% offline** cho **Android / Web** (React Native + Expo SDK 58), tập trung vào thao tác nhanh hằng ngày: lưu và copy nhanh đoạn mã/mẫu tin nhắn, quét & tạo mã QR (VietQR, Wi-Fi, vCard, URL), và lọc sạch văn bản thô từ PDF/OCR/Zalo.
Ứng dụng tiện ích **offline-first** cho **Android & Web** (React Native + Expo SDK 58), tối ưu cho các thao tác nhanh hằng ngày: lưu mẫu tin nhắn kèm ảnh QR ngân hàng, quét & tạo VietQR, cắt vùng ảnh nhận diện chữ đa ngôn ngữ (OCR), và tùy biến giao diện đọc rõ nét.

---
> **Tech stack:** Expo SDK 58 · React Native 0.88 · TypeScript · Android ML Kit OCR · Tesseract.js (Web) · Vitest

## Triết lý thiết kế

* **Tối giản kiểu công cụ cơ khí (Dieter Rams · Swiss Grid · Teenage Engineering):** Bố cục lưới phẳng với đường kẻ `1px`, không gradient rườm rà, không bo tròn nặng hay hiệu ứng dư thừa.
* **Hai chất liệu hiển thị:**
  * **Giấy (`paper`)**: nền `#F4F3EF`, mặt thẻ `#FBFAF7`, chữ carbon `#141413`, điểm nhấn cam `#E84A1A`.
  * **Than chì OLED (`charcoal`)**: nền `#111110`, mặt thẻ `#191917`, chữ `#F2F0EA`, điểm nhấn cam `#FF5A26`.
* **Typography tiếng Việt rõ nét:** `Be Vietnam Pro` cho nội dung + `JetBrains Mono` (`tabular-nums`) cho thông số, mã code và số tài khoản.
* **Tactile Feedback:** Phản hồi rung Haptic trên thiết bị di động khi thao tác.

---

## 3 Kênh chức năng chính
## Tính năng chính

### `01 // KHO MÃ` *(Màn hình chính mặc định)*
* Lưu trữ số tài khoản, đoạn mã, địa chỉ, câu trả lời mẫu theo phân loại (`Ngân hàng`, `Mã / Code`, `Mẫu trả lời`, `Địa chỉ`, `Công việc`, `Khác`).
* Tìm kiếm tiếng Việt **có dấu hoặc không dấu** tức thì.
* Ghim mục quan trọng lên đầu, đếm lượt copy, chế độ ẩn nội dung nhạy cảm (`•••`).
* Hỗ trợ **mẫu biến số động** dạng `{{tên}}`, `{{ngày}}`, `{{mã_đơn}}` (tự gợi ý ngày/giờ hiện tại) để điền nhanh và sao chép trong một chạm.
* Chuyển nhanh nội dung sang tab **Quét/Tạo QR (`02`)** hoặc **Lọc dữ liệu (`03`)**.
### `01 // KHO MÃ`
- Lưu số tài khoản, mã code, mẫu trả lời, địa chỉ theo từng nhóm phân loại (`Ngân hàng`, `Mã / Code`, `Mẫu trả lời`, `Địa chỉ`, `Công việc`, `Khác`).
- **Đính kèm ảnh (QR ngân hàng / thẻ thông tin):** chọn từ thư viện hoặc chụp trực tiếp, hiển thị thumbnail ngay trên thẻ và chạm để mở xem toàn màn hình (lightbox).
- Tìm kiếm tiếng Việt **có dấu hoặc không dấu**, ghim mục quan trọng, ẩn dữ liệu nhạy cảm (`•••`), hỗ trợ **biến số động** dạng `{{tên}}`, `{{ngày}}`, `{{mã_đơn}}`.

### `02 // QUÉT QR`
* **Khung camera mở rộng ngay trong tab** (không chuyển sang màn hình camera riêng), tự tạm nghỉ camera khi chuyển sang tab khác để tiết kiệm pin và giữ thao tác mượt.
* Hỗ trợ đèn pin, đổi camera trước/sau, **quét từ ảnh thư viện**, hoặc **dán chuỗi QR thủ công**.
* Giải mã có cấu trúc:
  * **VietQR chuyển khoản**: tự tra cứu 30+ mã BIN ngân hàng Việt Nam, tách sẵn ngân hàng, số tài khoản, số tiền và nội dung chuyển khoản để chạm copy hoặc lưu ngay vào Kho Mã.
  * **Wi-Fi QR**, **vCard danh bạ**, **URL**, và **văn bản thường**.
* Tích hợp **Tạo mã QR** (Văn bản/Link hoặc cấu hình Wi-Fi) hiển thị bằng SVG sắc nét và **Lịch sử quét lưu cục bộ**.
- Quét QR trực tiếp trong tab, hỗ trợ **zoom in / zoom out** (chụm 2 ngón, nút `-` / `+` và mức nhanh `1.0×` · `1.5×` · `2.0×` · `3.0×`), đèn pin, quét từ ảnh thư viện hoặc dán chuỗi.
- **Tạo mã QR đa dạng:**
  - **VietQR chuyển khoản (EMVCo + CRC16):** chọn ngân hàng Việt Nam (tìm theo tên hoặc mã BIN), nhập số tài khoản, số tiền (không bắt buộc) và nội dung chuyển khoản; lưu thẳng ảnh QR vào Kho Mã.
  - **Văn bản / Link** và **Wi-Fi QR**.
- Giải mã có cấu trúc và lưu **Lịch sử quét** cục bộ.

### `03 // LỌC DỮ LIỆU`
* Bố cục trực tiếp từ trên xuống dưới:
  1. **`VĂN BẢN THÔ ĐẦU VÀO`**: bộ đếm ký tự/dòng và thanh công cụ gọn ở chân khung (`DÁN`, `FILE`, `MẪU`, `XÓA`, `BỘ LỌC`). Hỗ trợ nhập tệp `.txt`, `.docx`, `.html`, `.srt`.
  2. **`SAU XỬ LÝ`**: thống kê số ký tự, số dòng, số dòng đã gộp, số dấu đã sửa, ký tự ẩn đã xóa; chuyển nhanh giữa chế độ xem **`SẠCH`** và **`SO SÁNH`** (diff theo dòng).
  3. **Hành động nhanh**: `COPY KẾT QUẢ`, `+ KHO MÃ`, tạo `QR`, và chia sẻ (trên mobile).
  4. **`TRÍCH XUẤT TỰ ĐỘNG`**: tự tách chip `SĐT`, `MAIL`, `MÃ`, `URL` để chạm copy lẻ từng mục hoặc **`COPY TẤT CẢ`**.
* **Ngăn `BỘ LỌC` mở rộng** gồm 4 preset (`Tài liệu / PDF`, `Tin nhắn / Zalo`, `Thô → Danh sách`, `Sạch Code / Mã`) và 12 công tắc tùy chỉnh:
  * Sửa lệch dấu & ghép Unicode NFC (kể cả lỗi tách dấu/tách âm cuối từ PDF/OCR).
  * Gộp dòng bị ngắt giữa câu, nối từ gạch nối cuối dòng (`docu-` / `ment`).
  * Đặt dấu chuẩn mới (`hòa`, `thúy`), chuẩn dấu câu & khoảng trắng (bảo vệ URL, email, tên file), xóa ký tự ẩn (`ZWSP`, `NBSP`), chuẩn bullet (`• → -`), viết hoa đầu câu, đưa nháy cong về thẳng, đánh số `1. 2. 3.`.
  * **Lọc bỏ dòng trùng lặp**, **Sắp xếp dòng A → Z**, **Bỏ dấu tiếng Việt**.
### `03 // QUÉT CHỮ (OCR)`
- Chọn ảnh từ thư viện hoặc **chụp ảnh camera trực tiếp**.
- **Cắt phân vùng trên ảnh:** kéo khung trực tiếp vào đúng đoạn chữ cần đọc trước khi quét.
- **Hỗ trợ đa ngôn ngữ:** Tự động / Đa ngôn ngữ, Việt / Anh, Nhật (`日本語`), Hàn (`한국어`), Trung (`中文`) — dùng **Google ML Kit OCR** offline trên Android và **Tesseract.js** trên Web.
- **Chuẩn hóa & trích xuất thông tin:** tự làm gọn khoảng trắng thừa mà vẫn giữ nguyên nội dung chữ, đồng thời bóc tách sẵn **`SĐT`**, **`EMAIL`**, **`MÃ / STK`**, **`URL`** ngay bên dưới để chạm copy lẻ hoặc lưu vào Kho Mã.

---
### `04 // CÀI ĐẶT`
- Chuyển nhanh nền **Giấy (`paper`)** / **Than chì OLED (`charcoal`)**, tùy chỉnh **6 màu nhấn**, **3 mức tương phản mực**, **phông chữ** (`Be Vietnam Pro`, `JetBrains Mono`, `Hệ thống`) và **cỡ chữ**.
- Tùy chọn bật/tắt rung phản hồi (Haptics), ngôn ngữ OCR mặc định và chế độ tự chuẩn hóa kết quả OCR.
- **Sao lưu & khôi phục dữ liệu** (Kho Mã, lịch sử QR, cài đặt) bằng JSON qua clipboard.

## Tối ưu hiệu năng & Khởi động

* **Splash Screen & Khởi động không nháy khung:**
  * Cấu hình `expo-splash-screen` cho cả giao diện sáng (`#F4F3EF`) và tối (`#111110`) kèm bộ icon KHUÔN mới trong `assets/`.
  * Dùng `SplashScreen.preventAutoHideAsync()`, `SystemUI.setBackgroundColorAsync()`, `SafeAreaProvider` với `initialWindowMetrics`, và nạp đồng bộ font + `AsyncStorage` (`hydrateAppState`) trước khi ẩn splash và hiện giao diện bằng `Animated` chạy trên native driver.
* **Tối ưu tài nguyên đóng gói:**
  * Import trực tiếp đúng **7 trọng lượng font** sử dụng (giảm từ 34 file font xuống 7 file).
  * Tách bộ giải mã ảnh QR theo nền tảng (`qrImageDecoder.ts` cho Android/iOS, `qrImageDecoder.web.ts` cho Web) để bản Android không đóng gói thư viện `jsqr` của Web.
* **Tối ưu runtime:**
  * Virtualized `FlatList` cho danh sách **Kho Mã** và **Lịch sử QR**; `useDeferredValue` khi tìm kiếm hoặc lọc văn bản dài; `Int32Array` kết hợp cắt tiền tố/hậu tố giống nhau cho `computeLineDiff`; Run-Length Encoding cho đường vẽ SVG QR.

---

## Cấu trúc thư mục
## Cấu trúc dự án

```text
khuon-app/
├── App.tsx                             # Root shell, splash/hydration, 3-tab state & animations
├── app.json                            # Expo config, permissions, icon & splash-screen plugin
├── eas.json                            # EAS Build profiles (preview/apk/production)
├── tsconfig.json                       # TypeScript strict config
├── vitest.config.mts                   # Cấu hình test engine với Vitest
├── assets/                             # Icon, adaptive icon Android & splash light/dark
├── App.tsx                         # Shell chính, nạp dữ liệu & 4 tab
├── app.json                        # Cấu hình Expo SDK 58, quyền & native plugins
├── eas.json                        # Cấu hình EAS Build (development / preview / apk / production)
├── plugins/
│   └── withWindowsCmakeFix.js      # Config plugin tránh lỗi giới hạn 260 ký tự Ninja trên Windows
└── src/
    ├── types/app.ts                    # Kiểu dữ liệu TabKey, NormalizerOptions, QR, Snippet
    ├── theme/tokens.ts                 # Bảng màu Paper / Charcoal, font, spacing, radii
    ├── types/app.ts                # Định nghĩa kiểu dữ liệu (Snippet, QR, Settings, OCR)
    ├── theme/tokens.ts             # Bảng màu Giấy/Than chì, 6 preset màu, font & tỷ lệ chữ
    ├── engines/
    │   ├── textNormalizer.ts           # Chuẩn hóa tiếng Việt, lọc dữ liệu & trích xuất thực thể
    │   ├── textTools.ts                # Bỏ dấu, biến mẫu {{}}, sort/dedupe, line diff (LCS)
    │   ├── qrParser.ts                 # Giải mã VietQR (EMVCo TLV), Wi-Fi, vCard, URL
    │   ├── docReader.ts                # Đọc văn bản từ .docx (JSZip), .html, .srt
    │   └── __tests__/engines.test.ts   # Bộ unit test (14 tests)
    │   ├── qrParser.ts             # Parse & tạo VietQR (CRC16), Wi-Fi, vCard, URL
    │   ├── textNormalizer.ts       # Chuẩn hóa văn bản OCR & trích xuất SĐT / Email / Mã / URL
    │   ├── textTools.ts            # Bỏ dấu tiếng Việt, biến mẫu {{}}, line diff
    │   ├── docReader.ts            # Đọc tệp .docx / .html / .srt
    │   └── __tests__/              # Unit tests (Vitest)
    ├── services/
    │   ├── storage.ts                  # Lưu/nạp cục bộ qua AsyncStorage & hydrateAppState
    │   ├── haptics.ts                  # Phản hồi rung chạm nhẹ trên mobile
    │   ├── qrImageDecoder.ts           # Quét QR từ ảnh trên Android/iOS (expo-camera)
    │   └── qrImageDecoder.web.ts       # Quét QR từ ảnh trên Web (jsqr + Canvas)
    ├── components/
    │   ├── AppHeader.tsx               # Header thương hiệu, mã kênh & nút đổi GIẤY/THAN
    │   ├── ChannelBar.tsx              # Thanh tab đáy 01 / 02 / 03
    │   ├── HardwareToggle.tsx          # Công tắc gạt phẳng tối giản
    │   ├── SvgQrCode.tsx               # Render mã QR SVG tối ưu path
    │   └── TactileButton.tsx           # Nút bấm xúc giác với haptic
    └── screens/
        ├── VaultScreen.tsx             # 01 // KHO MÃ
        ├── QrScreen.tsx                # 02 // QUÉT QR
        └── FilterScreen.tsx            # 03 // LỌC DỮ LIỆU
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

> Trên Windows, nếu PowerShell chặn chạy script `.ps1`, hãy dùng **Command Prompt (`cmd`)** cho các lệnh bên dưới.

```bat
cd /d C:\Users\Admin\Desktop\1fail\khuon-app
```powershell
cd khuon-app
npm install
```

* **Chạy thử trên Web:**
  ```bat
  npx expo start --web
* **Chạy trên Web (kiểm tra nhanh UI & logic):**
  ```powershell
  npm run web
  ```
* **Chạy trên điện thoại Android (Expo Go) hoặc máy ảo Android Studio:**
  ```bat
  npx expo start
* **Chạy trên Android (máy ảo hoặc điện thoại bật USB Debugging):**
  > App dùng native module `rn-mlkit-ocr` cho OCR offline nên cần chạy **Development Build** (không dùng Expo Go).
  ```powershell
  npx expo run:android
  ```
  *(Quét mã QR bằng Expo Go trên điện thoại, hoặc nhấn `a` khi máy ảo Android đang mở; hoặc chạy `npx expo start --android`)*.

---

## Tự đóng gói file `.apk` (EAS Cloud Build)
## Build file `.apk`

Dự án đã cấu hình sẵn `preview` và `apk` trong `eas.json` để xuất trực tiếp file `.apk`:
### Build trực tiếp trên máy (Android Studio + SDK)

```bat
cd /d C:\Users\Admin\Desktop\1fail\khuon-app
set EAS_NO_VCS=1
npx eas-cli build --platform android --profile preview
```powershell
cd khuon-app\android
.\gradlew.bat :app:assembleRelease
```

*(Nếu chưa đăng nhập tài khoản Expo trên máy mới, chạy `npx eas-cli login` trước. Có thể xem lại danh sách bản build và link tải `.apk` bằng lệnh `npx eas-cli build:list --platform android --limit 1`).*
File APK cài độc lập sau khi build nằm tại: `android\app\build\outputs\apk\release\app-release.apk`.  
*(Muốn build riêng cho điện thoại Android ARM 64-bit cho nhẹ và nhanh hơn: thêm `-PreactNativeArchitectures=arm64-v8a` vào sau lệnh trên).*

Nếu máy đã cài **Android Studio + Android SDK** (`ANDROID_HOME`) và muốn build offline trực tiếp trên máy:
> Trên Windows, [withWindowsCmakeFix.js](plugins/withWindowsCmakeFix.js) tự cấu hình đường dẫn CMake ngắn (`D:/kcxx` hoặc `C:/kcxx`) và `-DCMAKE_OBJECT_PATH_MAX=225` để tránh lỗi Ninja `Filename longer than 260 characters`.

```bat
npx expo prebuild --platform android
cd android && gradlew assembleRelease
### Build trên Cloud (EAS Build)

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

---

## Kiểm thử & Kiểm tra mã nguồn
## Kiểm tra mã nguồn & Unit Test

```bat
```powershell
npm run typecheck
npm test
```
