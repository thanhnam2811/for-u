# Phase 4 Roadmap: Online Leaderboard & Replay Sharing 🌐

Mục tiêu của giai đoạn 4 là tích hợp bảng xếp hạng trực tuyến online và cơ chế đồng bộ hóa đám mây (qua Firebase/Firestore hiện tại của dự án), xây dựng cơ chế chia sẻ mã Replay và thiết lập quy trình Golden Replay Test để chống gian lận.

---

## 📅 Danh Sách Nhiệm Vụ Chi Tiết

### 1. Bảng xếp hạng Firebase/Firestore (`storage/leaderboard.js` & `storage/save.js`)
* Kết nối bảng xếp hạng trực tuyến online với Firestore (sử dụng cấu hình SDK gọn nhẹ sẵn có của dự án).
* Đồng bộ điểm kỷ lục và trạng thái trò chơi (đồng nhất với logic đồng bộ cờ của Lines 97).

### 2. Chia sẻ và phát Replay trận đấu (`core/replay.js` & `ui/modal.js`)
* Thiết kế mã hóa chuỗi sự kiện `GameEvent` và hạt giống sinh số `Seed` thành một chuỗi văn bản base64 ngắn gọn.
* Tạo nút chia sẻ Replay để người chơi khác có thể copy mã và nạp trực tiếp vào game để phát lại (Playback) từ đầu trận đấu.

### 3. Golden Replay Test & Chống gian lận (Anti-Cheat & CI)
* Tận dụng tính deterministic của `SeededRNG` và `GameEvent` để xác thực điểm số gửi lên máy chủ: Chạy lại giả lập (headless simulation) chuỗi nước đi trên máy chủ trước khi lưu điểm, phát hiện nếu nước đi không tạo ra kết quả điểm tương ứng.
* Thiết lập kiểm thử Golden Replay tự động trong quy trình build/CI để phát hiện sớm bất kỳ sai lệch logic nào.
