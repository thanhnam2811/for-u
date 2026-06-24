# Magic Playground — Unified Tailwind Design System ✨

Hệ thống thiết kế đồng nhất (Unified Design System) được xây dựng trên nền tảng **Tailwind CSS**, áp dụng cho toàn bộ các trang và phân hệ ứng dụng thuộc playground **Góc Nhỏ Phép Thuật (for-u)** bao gồm: Hub chính, game Lines 97, hiệu ứng Trái tim 3D, và hiệu ứng Hào quang Hộ thể.

Hệ thống này hỗ trợ đa dạng hóa giao diện với hai chế độ **Sáng / Tối (Light / Dark Mode)** và thiết lập các Token thông qua lớp tiện ích của Tailwind CSS.

---

## 1. Cấu hình Tailwind CSS (`tailwind.config.js`)

Để đồng nhất toàn bộ dự án, cấu hình `tailwind.config.js` được thiết lập như sau:

```javascript
module.exports = {
  darkMode: 'class', // Quản lý Sáng/Tối qua class .dark ở thẻ html
  theme: {
    extend: {
      colors: {
        // Tông màu ma thuật chủ đạo
        brand: {
          pink: '#FF7597',
          purple: '#C193FF',
          dark: '#3F3B4F',
          muted: '#8773AF',
        },
        // Bảng màu cho Dark mode
        dark: {
          bg: '#0F0C1B',       // Tím tối huyền bí
          card: 'rgba(15, 12, 27, 0.45)',
          border: 'rgba(255, 255, 255, 0.1)',
        },
        // Bảng màu cho Light mode
        light: {
          bg: '#FFEBF0',
          card: 'rgba(255, 255, 255, 0.45)',
          border: 'rgba(255, 255, 255, 0.6)',
        }
      },
      fontFamily: {
        display: ['Comfortaa', 'sans-serif'], // Font tiêu đề tròn trịa
        sans: ['Quicksand', 'sans-serif'],     // Font chữ thường đọc dễ chịu
      },
      boxShadow: {
        'glass-light': '0 8px 32px 0 rgba(135, 115, 175, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'brand': '0 6px 20px rgba(255, 117, 151, 0.35)',
        'brand-hover': '0 10px 30px rgba(255, 117, 151, 0.45)',
      },
      backdropBlur: {
        'glass': '20px',
      }
    },
  },
  plugins: [],
}
```

---

## 2. Chủ đề Sáng / Tối (Light / Dark Mode)

Việc chuyển đổi giữa Light/Dark mode được thực hiện thông qua tiền tố `dark:` của Tailwind:

| Thành phần | Light Mode | Dark Mode | Lớp Tailwind CSS tương ứng |
|---|---|---|---|
| **Nền trang chính** | Hồng phấn nhẹ | Tím vũ trụ đen | `bg-gradient-to-br from-[#FFEBF0] to-[#E8F0FE] dark:from-[#0F0C1B] dark:to-[#1B1437]` |
| **Chữ chính** | Xám tím đậm | Trắng tinh khiết | `text-slate-700 dark:text-slate-100` |
| **Chữ phụ** | Tím oải hương | Tím nhạt phát sáng | `text-[#8773AF] dark:text-[#B1A6D2]` |
| **Nền thẻ Kính** | Trắng trong suốt | Đen mờ tối | `bg-white/45 dark:bg-slate-900/40` |
| **Đường viền Kính** | Trắng mờ dày | Xám đậm mỏng | `border-white/60 dark:border-slate-800/60` |
| **Đổ bóng Kính** | Bóng nhẹ | Bóng sâu tối | `shadow-glass-light dark:shadow-glass-dark` |

---

## 3. Kiểu chữ (Typography)

* **Tiêu đề lớn / Đề mục:** Sử dụng `font-display` (Comfortaa) kết hợp font weight đậm:
  * Lớp tiện ích: `font-display font-bold text-slate-800 dark:text-white`
  * Hiệu ứng Gradient chữ thương hiệu: `bg-gradient-to-r from-brand-pink to-brand-purple bg-clip-text text-transparent`
* **Nội dung / Nút bấm / Chỉ số:** Sử dụng `font-sans` (Quicksand) cho trải nghiệm đọc mượt mà nhất:
  * Lớp tiện ích: `font-sans font-medium text-slate-600 dark:text-slate-300`

---

## 4. Các Thành phần Giao diện Chuẩn (Tailwind Components)

### A. Thẻ kính mờ (Glassmorphic Cards)
Áp dụng cho các Card game, Card điểm số, Bảng xếp hạng, hoặc Hộp thoại modal:
* **Mã lớp:**
  `bg-white/45 dark:bg-slate-950/40 backdrop-blur-glass border border-white/60 dark:border-slate-800/60 shadow-glass-light dark:shadow-glass-dark rounded-3xl transition-all duration-300`
* **Hiệu ứng hover nổi nhẹ (tùy chọn):**
  `hover:translate-y-[-4px] hover:shadow-xl`

### B. Hệ thống Nút bấm (Buttons)
1. **Nút Hành động Chính (Brand Button - Gradient):**
   * *Mã lớp:* `font-display font-bold text-white bg-gradient-to-r from-brand-pink to-brand-purple rounded-2xl shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300`
2. **Nút Thao tác Phụ (Secondary Glass Button):**
   * *Mã lớp:* `bg-white/30 dark:bg-slate-800/30 border border-white/40 dark:border-slate-700/40 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 hover:shadow-md transition-all`
3. **Nút Google Sign-in:**
   * *Mã lớp:* `bg-white text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-50 shadow-sm active:bg-slate-100 font-sans font-semibold transition-all`

### C. Ô Nhập liệu (Inputs)
Áp dụng cho Form đăng ký, đăng nhập tài khoản:
* **Mã lớp:**
  `w-full font-sans text-sm px-4 py-2.5 rounded-xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/30 text-slate-800 dark:text-slate-100 outline-none focus:border-brand-pink focus:bg-white focus:dark:bg-slate-900 focus:ring-4 focus:ring-brand-pink/15 transition-all`

### D. Hộp thoại Popup Modals (Overlays)
* **Backdrop mờ che phủ:**
  `fixed inset-0 bg-slate-900/45 dark:bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-content-center transition-opacity duration-300`
* **Hộp thoại đàn hồi trung tâm:**
  `transform scale-95 opacity-0 transition-all duration-300 [visible-state]:scale-100 [visible-state]:opacity-100`

### E. Thông báo nổi (Toast)
* **Mã lớp:**
  `fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800/90 dark:bg-slate-950/90 text-white font-display text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md z-[100] pointer-events-none transition-all duration-300`

---

## 5. Tối ưu CSS Tiện ích trên Thiết bị Di động (Mobile First)

* **Responsive Grid:** Sử dụng breakpoint của Tailwind để tối ưu bố cục tự động thay đổi từ 1 cột trên Mobile lên 3 cột trên Desktop:
  * Lớp tiện ích: `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6`
* **Safe Area Notch:** Chèn khoảng trống thông minh tránh notch hoặc home bar của điện thoại:
  * Lớp tiện ích: `pb-[safe-area-inset-bottom]` hoặc `pb-safe` (nếu dùng plugin hỗ trợ safe-area).
* **Reset Button:** Loại bỏ style nút mặc định của Safari iOS:
  * Lớp tiện ích: `appearance-none select-none`
