# KHUÔN — Kho Mã, Quét QR & Lọc Dữ Liệu

Ứng dụng tiện ích **100% offline** cho **Android / Web** (React Native + Expo SDK 58), tập trung vào thao tác nhanh hằng ngày: lưu và copy nhanh đoạn mã/mẫu tin nhắn, quét & tạo mã QR (VietQR, Wi-Fi, vCard, URL), và lọc sạch văn bản thô từ PDF/OCR/Zalo.

---

## Triết lý thiết kế

* **Tối giản kiểu công cụ cơ khí (Dieter Rams · Swiss Grid · Teenage Engineering):** Bố cục lưới phẳng với đường kẻ `1px`, không gradient rườm rà, không bo tròn nặng hay hiệu ứng dư thừa.
* **Hai chất liệu hiển thị:**
  * **Giấy (`paper`)**: nền `#F4F3EF`, mặt thẻ `#FBFAF7`, chữ carbon `#141413`, điểm nhấn cam `#E84A1A`.
  * **Than chì OLED (`charcoal`)**: nền `#111110`, mặt thẻ `#191917`, chữ `#F2F0EA`, điểm nhấn cam `#FF5A26`.
* **Typography tiếng Việt rõ nét:** `Be Vietnam Pro` cho nội dung + `JetBrains Mono` (`tabular-nums`) cho thông số, mã code và số tài khoản.
* **Tactile Feedback:** Phản hồi rung Haptic trên thiết bị di động khi thao tác.

---

## 3 Kênh chức năng chính

### `01 // KHO MÃ` *(Màn hình chính mặc định)*
* Lưu trữ số tài khoản, đoạn mã, địa chỉ, câu trả lời mẫu theo phân loại (`Ngân hàng`, `Mã / Code`, `Mẫu trả lời`, `Địa chỉ`, `Công việc`, `Khác`).
* Tìm kiếm tiếng Việt **có dấu hoặc không dấu** tức thì.
* Ghim mục quan trọng lên đầu, đếm lượt copy, chế độ ẩn nội dung nhạy cảm (`•••`).
* Hỗ trợ **mẫu biến số động** dạng `{{tên}}`, `{{ngày}}`, `{{mã_đơn}}` (tự gợi ý ngày/giờ hiện tại) để điền nhanh và sao chép trong một chạm.
* Chuyển nhanh nội dung sang tab **Quét/Tạo QR (`02`)** hoặc **Lọc dữ liệu (`03`)**.

### `02 // QUÉT QR`
* **Khung camera mở rộng ngay trong tab** (không chuyển sang màn hình camera riêng), tự tạm nghỉ camera khi chuyển sang tab khác để tiết kiệm pin và giữ thao tác mượt.
* Hỗ trợ đèn pin, đổi camera trước/sau, **quét từ ảnh thư viện**, hoặc **dán chuỗi QR thủ công**.
* Giải mã có cấu trúc:
  * **VietQR chuyển khoản**: tự tra cứu 30+ mã BIN ngân hàng Việt Nam, tách sẵn ngân hàng, số tài khoản, số tiền và nội dung chuyển khoản để chạm copy hoặc lưu ngay vào Kho Mã.
  * **Wi-Fi QR**, **vCard danh bạ**, **URL**, và **văn bản thường**.
* Tích hợp **Tạo mã QR** (Văn bản/Link hoặc cấu hình Wi-Fi) hiển thị bằng SVG sắc nét và **Lịch sử quét lưu cục bộ**.

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

---

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

```text
khuon-app/
├── App.tsx                             # Root shell, splash/hydration, 3-tab state & animations
├── app.json                            # Expo config, permissions, icon & splash-screen plugin
├── eas.json                            # EAS Build profiles (preview/apk/production)
├── tsconfig.json                       # TypeScript strict config
├── vitest.config.mts                   # Cấu hình test engine với Vitest
├── assets/                             # Icon, adaptive icon Android & splash light/dark
└── src/
    ├── types/app.ts                    # Kiểu dữ liệu TabKey, NormalizerOptions, QR, Snippet
    ├── theme/tokens.ts                 # Bảng màu Paper / Charcoal, font, spacing, radii
    ├── engines/
    │   ├── textNormalizer.ts           # Chuẩn hóa tiếng Việt, lọc dữ liệu & trích xuất thực thể
    │   ├── textTools.ts                # Bỏ dấu, biến mẫu {{}}, sort/dedupe, line diff (LCS)
    │   ├── qrParser.ts                 # Giải mã VietQR (EMVCo TLV), Wi-Fi, vCard, URL
    │   ├── docReader.ts                # Đọc văn bản từ .docx (JSZip), .html, .srt
    │   └── __tests__/engines.test.ts   # Bộ unit test (14 tests)
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
```

---

## Cài đặt & Chạy thử

> Trên Windows, nếu PowerShell chặn chạy script `.ps1`, hãy dùng **Command Prompt (`cmd`)** cho các lệnh bên dưới.

```bat
cd /d C:\Users\Admin\Desktop\1fail\khuon-app
npm install
```

* **Chạy thử trên Web:**
  ```bat
  npx expo start --web
  ```
* **Chạy trên điện thoại Android (Expo Go) hoặc máy ảo Android Studio:**
  ```bat
  npx expo start
  ```
  *(Quét mã QR bằng Expo Go trên điện thoại, hoặc nhấn `a` khi máy ảo Android đang mở; hoặc chạy `npx expo start --android`)*.

---

## Tự đóng gói file `.apk` (EAS Cloud Build)

Dự án đã cấu hình sẵn `preview` và `apk` trong `eas.json` để xuất trực tiếp file `.apk`:

```bat
cd /d C:\Users\Admin\Desktop\1fail\khuon-app
set EAS_NO_VCS=1
npx eas-cli build --platform android --profile preview
```

*(Nếu chưa đăng nhập tài khoản Expo trên máy mới, chạy `npx eas-cli login` trước. Có thể xem lại danh sách bản build và link tải `.apk` bằng lệnh `npx eas-cli build:list --platform android --limit 1`).*

Nếu máy đã cài **Android Studio + Android SDK** (`ANDROID_HOME`) và muốn build offline trực tiếp trên máy:

```bat
npx expo prebuild --platform android
cd android && gradlew assembleRelease
```

---

## Kiểm thử & Kiểm tra mã nguồn

```bat
npm run typecheck
npm test
```
