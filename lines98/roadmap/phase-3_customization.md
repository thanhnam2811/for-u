# Phase 3 Roadmap: Theme System, Daily Challenge & Analytics 🚀

Mục tiêu của giai đoạn 3 là triển khai bộ cấu trúc đổi Theme đa dạng, thiết lập thử thách ngày chạy chung mã Seed bàn cờ ngẫu nhiên, tổng hợp chỉ số hiệu năng và thống kê chi tiết sau khi GameOver.

---

## 📅 Danh Sách Nhiệm Vụ Chi Tiết

### 1. Dựng Theme Engine hợp đồng (`ui/modal.js` & Themes)
* Thiết lập lớp `Theme` với các cấu hình board, balls, particles, audio, ambient, hud, animation.
* Triển khai đăng ký 6 bộ theme mặc định:
  * *Classic CRT:* Giả lập màn hình quét sọc Windows 98 cổ điển.
  * *Crystal:* Tinh thể pha lê lấp lánh phản chiếu.
  * *Neon Cyber:* Đèn neon led dạ quang rực rỡ.
  * *Galaxy Space:* Bản đồ tinh vân cuộn song song.
  * *Zen Garden:* Tiếng suối reo nước chảy và lá rơi tĩnh lặng.

### 2. Chế độ Thử thách ngày (`ui/challenge.js`)
* Tạo cơ chế đồng bộ và đọc mã hạt giống (Seed) dựa trên ngày hiện tại (ví dụ: ngày 2026-07-31 sinh seed cố định).
* Đặt 3 mục tiêu cụ thể hàng ngày để xếp hạng chung (ví dụ: sống sót 60 nước, không ăn chéo, đạt 3000 điểm).
* Thiết lập màn hình hiển thị bảng tiến độ thử thách.

### 3. Thống kê kết quả & Bản đồ nhiệt (`core/replay.js` & `ui/hud.js`)
* Tổng hợp Session Analytics sau khi GameOver (turns sinh tồn, max combo, best chain, efficiency).
* Vẽ Heatmap Replay đánh dấu những ô cờ bóng nằm lâu nhất và khu vực chết nhiều nhất trên bàn cờ Canvas.

### 4. Thiết lập Trình Profiler Hiệu năng (`ui/profiler.js`)
* Vẽ HUD hiển thị hiệu năng Dev: đo FPS, logic xử lý, render cờ, hạt bay, bộ nhớ tiêu thụ, draw calls.
