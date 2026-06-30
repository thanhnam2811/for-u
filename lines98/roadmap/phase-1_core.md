# Phase 1 Roadmap: Modular Game Core 🧩

Mục tiêu của giai đoạn 1 là loại bỏ PixiJS cũ, dựng bộ khung thư mục mô-đun mới, triển khai Game State Machine, Seeded RNG, logic di chuyển ngắn nhất BFS và hệ thống Replay Event Sourcing.

---

## 📅 Danh Sách Nhiệm Vụ Chi Tiết

### 1. Dọn dẹp & Gỡ bỏ PixiJS
* Xóa tệp `src/lines98/js/pixi-game.js`.
* Gỡ gói `"pixi.js"` trong `package.json` và cấu hình lại build.

### 2. Thiết lập Seeded RNG (`core/rng.js`)
* Tạo class `SeededRNG` hỗ trợ Mulberry32.
* Tích hợp các hàm `.next()`, `.nextInt(min, max)`, `.saveState()`, `.loadState()`, `.clone()`.
* Đảm bảo mọi nước đi và thử thách ngày đều có kết quả ngẫu nhiên trùng khớp tuyệt đối dựa trên cùng hạt giống (Seed).

### 3. Tách biệt Gameplay State (`core/state.js`)
* Thiết kế mô hình `GameState` bất biến (Immutable State).
* Chứa ma trận bàn cờ 9x9, điểm số, màu cờ tiếp theo, cờ GameOver, lượt di chuyển hiện tại.
* Tích hợp cơ chế phục hồi và Rollback phục vụ tính năng **Undo** (kế thừa logic Undo 1 lần liên tiếp).

### 4. Xây dựng Event Sourcing Replay (`core/replay.js`)
* Thiết kế cấu trúc dòng sự kiện `GameEvent` lưu trữ sự kiện: `MOVE`, `SPAWN`, `CLEAR`, `SCORE`.
* Hỗ trợ lưu trữ lịch sử trận đấu dưới dạng Event Stream cực nhẹ (<3KB cho 500 lượt).
* Viết bộ giải nén dữ liệu từ mã chia sẻ để phục vụ xem lại (Playback) trận đấu.

### 5. Thuật toán di chuyển & Check ăn điểm (`core/logic.js` & `core/pathfinding.js`)
* Viết lại thuật toán tìm đường đi ngắn nhất **BFS** (Breadth-First Search) để duyệt lưới bàn cờ 9x9.
* Triển khai Rules Engine quét 4 hướng (ngang, dọc, chéo xuôi, chéo ngược) để kiểm tra các dãy cờ xếp đủ hàng 5 quả để kích hoạt ăn điểm.
* Xây dựng bộ đếm Combo ăn cờ liên tiếp (`Chain Reaction`, `Double/Triple Line`).
