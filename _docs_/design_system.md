# Magic Playground — Design System & Style Guide ✨

Hệ thống thiết kế (Design System) của dự án **Magic Playground (Góc Nhỏ Phép Thuật)** và phân hệ game **Lines 97**. Tài liệu này hướng dẫn chi tiết các quy chuẩn về giao diện (UI), trải nghiệm người dùng (UX), màu sắc, kiểu chữ, các thành phần tái sử dụng (components) và hiệu ứng chuyển động (animations).

---

## 1. Triết lý Thiết kế (Design Philosophy)

Magic Playground hướng tới trải nghiệm **Ấm áp, Ngọt ngào, Hiện đại và Phép thuật (Playful, Romantic, Modern, & Magical)**.
* **Premium Glassmorphism:** Sử dụng hiệu ứng kính mờ (frosted glass) cao cấp kết hợp với độ đổ bóng sâu (soft shadows) để tạo chiều sâu giao diện.
* **Interactive Micro-animations:** Mọi tương tác của người dùng đều phải có phản hồi thị giác mượt mà (hover scale, lấp lánh, nổ hạt vật lý, đếm số tăng dần) tạo cảm giác giao diện "sống động".
* **Mobile-First Responsive:** Thiết kế tối ưu hóa hoàn hảo cho các thiết bị di động (Safari iOS, Android PWA) trước khi hiển thị trên Desktop.

---

## 2. Kiểu chữ (Typography)

Dự án sử dụng các phông chữ Google Fonts tròn trịa, hiện đại và hỗ trợ tiếng Việt 100% không lỗi dấu:

* **Header & Title Font:** `Comfortaa` (sans-serif)
  * *Đặc tính:* Bo tròn góc cực kỳ đáng yêu, tạo cảm giác thân thiện, vui vẻ.
  * *Sử dụng:* Tiêu đề chính (`h1`, `h2`), tên game, tên mục tiêu đề modal.
  * *Font weights:* `700` (Bold) cho tiêu đề chính, `500` (Medium) cho phụ đề.
* **Body & UI Font:** `Quicksand` (sans-serif)
  * *Đặc tính:* Nét chữ rõ ràng, hiện đại, dễ đọc ở kích thước nhỏ.
  * *Sử dụng:* Các chỉ số điểm, nút bấm, hướng dẫn, nội dung bảng biểu.
  * *Font weights:* `500` (Regular), `600` (Semi-bold), `700` (Bold).
* **System Icons:** `Material Icons Round`
  * *Sử dụng:* Đồng nhất toàn bộ biểu tượng trên nút bấm, đóng modal, chỉ báo trạng thái.

---

## 3. Bảng màu & Chủ đề (Color Palettes & Themes)

### A. Màu sắc Chủ đạo Toàn hệ thống (Global Theme Colors)
| Biến CSS | Giá trị màu | Ứng dụng |
|---|---|---|
| `--primary-pink` | `#FF7597` | Màu hồng chủ đạo, nút nhấn chính, highlight |
| `--primary-purple` | `#C193FF` | Màu tím gradient kết hợp, điểm cao kỷ lục |
| `--bg-gradient` | `linear-gradient(135deg, #FFEBF0, #E8F0FE)` | Nền gradient động lãng mạn cho toàn bộ Hub |
| `--text-dark` | `#3F3B4F` | Chữ chính (độ tương phản cao, dễ đọc) |
| `--text-muted` | `#8773AF` | Chữ phụ, chú thích, nhãn nhạt |

### B. Biến CSS Glassmorphism (Kính mờ)
```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.45);
  --glass-border: rgba(255, 255, 255, 0.6);
  --glass-shadow: 0 8px 32px 0 rgba(135, 115, 175, 0.08);
  --glass-blur: blur(20px);
}
```

### C. Bảng màu Bóng trong Game (Ball Palettes)
Lines 97 hỗ trợ 4 bộ màu bóng khác nhau cấu hình trong `constants.js`:
1. **Pastel Ngọt Ngào 🍬 (Mặc định):** Tông màu kẹo ngọt dịu nhẹ, lãng mạn.
2. **Classic Retro 🕹️:** Tông màu gốc cổ điển, độ bão hòa màu cao.
3. **Neon Glow 💡:** Tông màu phát quang tựa đèn neon rực rỡ trên nền tối.
4. **Trái Cây Tươi 🍓:** Tông màu hoa quả tươi mát, tràn đầy năng lượng.

Mỗi màu bóng trong bộ màu bắt buộc phải định nghĩa đủ 4 thông số:
* `main`: Màu thân bóng chính.
* `light`: Màu highlight bắt sáng (phía trên).
* `dark`: Màu bóng đổ (phía dưới).
* `glow`: Màu vầng hào quang lấp lánh bao quanh bóng khi được chọn.

---

## 4. Các Thành phần Giao diện Chuẩn (UI Components)

### A. Hộp nội dung mờ (Glassmorphic Cards)
Áp dụng cho thẻ điểm số, thẻ xem trước bóng (Preview), bảng xếp hạng và hộp game over:
```css
.card-style {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
  border-radius: 20px;
}
```

### B. Nút Điều khiển (Buttons)
1. **Nút Điều khiển Dưới Game (`.control-btn`):**
   * *Thiết kế:* Tròn trịa, kính mờ nhạt, icon nằm trên, chữ nhỏ nằm dưới.
   * *Hiệu ứng:* Hover scale lên `1.03`, nền sáng hơn.
2. **Nút Hành động Chính (`.restart-btn`):**
   * *Thiết kế:* Đầy màu với gradient hồng sang tím, độ đổ bóng sâu màu hồng `rgba(255, 117, 151, 0.35)`.
   * *Hiệu ứng:* Hover dịch chuyển lên (`translateY(-2px)`) và tăng cường độ bóng đổ.
3. **Nút Google Sign-in (`.google-btn`):**
   * *Thiết kế:* Nền trắng tinh khiết, chữ xám tối, logo Google chuẩn của Google Brand.

### C. Hộp thoại Popup (Modals & Overlays)
* Nền backdrop mờ tối màu: `rgba(63, 59, 79, 0.45)` kèm `backdrop-filter: blur(8px)`.
* Trạng thái hiển thị kích hoạt thuộc tính chuẩn:
  * Ẩn: `opacity: 0; pointer-events: none;`
  * Hiện: `opacity: 1; pointer-events: auto;` (Sửa lỗi không click được input).
* Chuyển động mở popup: Phóng to nhẹ từ trung tâm (`scale(0.85)` lên `scale(1)` kết hợp hiệu ứng đàn hồi `cubic-bezier`).

### D. Thông báo nhanh (Toast)
* Định vị cố định ở đáy màn hình: `bottom: 30px; left: 50%; transform: translateX(-50%)`.
* Thiết kế tối màu để nổi bật trên nền sáng: Nền `rgba(63, 59, 79, 0.9)`, chữ trắng, bo góc `14px`.

---

## 5. Tiêu chuẩn Chuyển động & Trải nghiệm (Animations & PWA UX)

### A. Hiệu ứng nổ bóng Vật lý (Physics Particle Explosions)
* Khi xóa bi thành công, quả bóng sẽ tan rã thành **4 - 8 hạt lấp lánh (particles)** có kích thước ngẫu nhiên từ 3px đến 7px.
* Hạt di chuyển chịu tác động của lực hút trọng lực (`gravity = 0.25`) và lực ma sát không khí (`friction = 0.98`), rơi tự do và mờ dần (`alpha -= 0.02`) tạo hiệu ứng nổ chân thực như pháo hoa nhỏ.

### B. Đường đi lấp lánh (Real-time Path Preview)
* Khi kéo bóng hoặc di chuyển chuột qua ô trống, một chuỗi chấm sáng cùng màu bóng sẽ chạy dọc theo tuyến đường đi ngắn nhất được tìm thấy bởi thuật toán BFS.
* Mỗi chấm sáng (`.path-cell`) có hiệu ứng trễ (`--path-delay`) tăng dần `35ms` nhân với thứ tự ô để tạo sóng chuyển động dẫn hướng.

### C. Hiệu ứng đếm số điểm (Score Counter Animation)
* Điểm số không nhảy số lập tức mà chạy tăng dần mượt mà sử dụng `requestAnimationFrame` giúp trải nghiệm nhận thưởng cuốn hút hơn.

### D. Tối ưu hóa PWA cho Di động
* **Touch Action:** Đặt `touch-action: none` trên bảng game để tắt hành vi cuộn mặc định của trình duyệt di động, giúp nhận diện thao tác Kéo-để-di-chuyển (Drag-to-move) cực kỳ nhạy.
* **Safari Appearance Reset:** Sử dụng `-webkit-appearance: none; appearance: none;` trên tất cả thẻ `<button>` để loại bỏ style mặc định dạng nút bấm hệ thống màu xám của iOS, bảo toàn tính thẩm mỹ của kính mờ.
* **Safe Area:** Tận dụng `padding-bottom: env(safe-area-inset-bottom)` tại game-container để các nút điều khiển không bị che khuất bởi thanh Home bar của iPhone màn hình tai thỏ/dynamic island.
