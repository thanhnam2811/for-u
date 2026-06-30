# Technical Design Document (TDD): Lines 98 Remastered 🎮✨

> **Slogan:** *"Lines 98 như bạn nhớ, nhưng với game feel mà bạn luôn tưởng tượng nó nên có."*

Tài liệu này xác lập chi tiết đặc tả kỹ thuật kiến trúc, mô-đun và lộ trình phát triển game **Lines 98 Remastered**. Toàn bộ mã nguồn sử dụng **JavaScript ES Modules (Vanilla JS)**, chạy trên nền **HTML5 Canvas 2D + Custom Tweens**.

---

## 🎯 1. Design Principles (Nguyên tắc thiết kế)
1. **Preserve original rules at all costs:** Luật chơi là bất biến. Không thêm thẻ kỹ năng, không vật phẩm bổ trợ (boosters), không gacha, không cây tài năng (talent tree), không cơ chế roguelike.
2. **Improve readability before spectacle:** Khả năng quan sát bàn cờ và tính toán chiến thuật của người chơi luôn được ưu tiên hơn các hiệu ứng thị giác hào nhoáng.
3. **Every visual effect must communicate gameplay:** Mọi hiệu ứng đồ họa (glow = có cơ hội, shake = có nguy hiểm, heartbeat = sắp thua) phải truyền tải trực tiếp trạng thái cờ.
4. **Replay determinism is a first-class feature:** Tính nhất quán của hệ thống Replay là tính năng cốt lõi được xây dựng từ tầng kiến trúc ban đầu.
5. **Mobile-first performance budget:** Tối ưu hóa bộ nhớ và tốc độ xử lý khung hình hướng tới các thiết bị di động cấu hình thấp.

---

## 📊 2. Performance Budget (Ngân sách hiệu năng)
Để đảm bảo lock cứng **60 FPS** (chu kỳ khung hình `< 16.6ms`), thời gian xử lý khung hình tối đa được giới hạn ở **8.0ms** (chừa lại 50% thời gian rảnh rỗi cho thiết bị tỏa nhiệt thấp và tiết kiệm pin):

| Hợp phần (Component) | Budget tối đa | Vai trò xử lý |
| :--- | :--- | :--- |
| **Logic Core** | `< 0.2ms` | State Machine, BFS tìm đường đi, kiểm tra hàng cờ ăn điểm |
| **Render Engine** | `< 1.5ms` | Vẽ bàn cờ, bóng cờ từ đệm cache |
| **Particle System** | `< 2.0ms` | Mô phỏng chuyển động vật lý của các mảnh vỡ tinh thể |
| **UI / HUD Update** | `< 1.0ms` | Cập nhật điểm số, trạng thái tim đập, vignette |
| **Misc / Engine Loop** | `< 1.0ms` | Scheduler, cập nhật Tween và Profiler |
| **Tổng thời gian (Total)** | **`< 8.0ms`** | Đảm bảo mượt mà 60 FPS trên thiết bị di động |

---

## 📐 3. Cấu Trúc Mã Nguồn Mô-đun (Directory Map)

```text
src/lines98/js/
 ├── core/
 │    ├── state.js          ← Game State manager (định nghĩa GameState)
 │    ├── logic.js          ← Rules Engine kiểm tra ăn điểm, tính combo & phân tích nước đi
 │    ├── replay.js         ← Quản lý Event Sourcing (GameEvent Stream) và ghi nhận Heatmap
 │    ├── rng.js            ← Seeded RNG module (hỗ trợ lưu/khôi phục trạng thái sinh số)
 │    └── scheduler.js      ← Bộ quản lý thời gian game (thay thế setTimeout/setInterval)
 │
 ├── render/
 │    ├── viewport.js       ← Canvas2D Renderer chính (Screen Transform, draw call)
 │    └── spritecache.js    ← Tạo đệm các sprite bóng cờ 3D, ghost và particles theo tỷ lệ DPR
 │
 ├── fx/
 │    ├── particles.js      ← Hệ thống hạt pha lê vỡ (crystal shards)
 │    ├── camera.js         ← Điều khiển rung lắc, co giãn màn hình qua Screen Transform
 │    └── tween.js          ← Bộ điều khiển Tween deterministic nội bộ
 │
 ├── ui/
 │    ├── hud.js            ← Điều khiển HUD áp lực (Near Death), thông báo nước đi
 │    ├── modal.js          ← Popup menu, bảng chọn màu, bảng xếp hạng
 │    ├── challenge.js      ← Logic Thử thách ngày (Daily Challenge) theo mã Seed
 │    └── profiler.js       ← HUD hiển thị hiệu năng thời gian thực (chỉ chạy ở dev build)
 │
 ├── audio/
 │    └── sound.js          ← Trình phát Web Audio API (tactile click, heartbeat, clear)
 │
 └── storage/
      ├── save.js           ← Tự động lưu tiến trình cục bộ (Auto Save)
      └── leaderboard.js    ← Đọc/ghi điểm số trực tuyến qua Firebase/Firestore (tương tự bản cũ)
```

---

## 🔬 4. Thiết Kế Chi Tiết Một Số Mô-đun Đặc Thù

### A. Seeded RNG (`rng.js`)
Điều khiển tính nhất quán tuyệt đối của thuật toán sinh bóng và vị trí cờ. Hỗ trợ lưu và phục hồi trạng thái hạt giống ngẫu nhiên phục vụ tính năng Rollback/Undo.
```javascript
export class SeededRNG {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }
  saveState() {
    return this.seed;
  }
  loadState(state) {
    this.seed = state;
  }
  clone() {
    return new SeededRNG(this.seed);
  }
}
```

### B. Event Sourcing Replay (`replay.js`)
Trận đấu được lưu giữ bằng trạng thái ban đầu (`initialState`) cộng với chuỗi các luồng sự kiện hành động của trò chơi (`GameEvent Stream`), giúp tối ưu hóa dung lượng lưu trữ tối đa:
```javascript
// Danh sách các GameEvent hợp lệ
class GameEvent {
  // 1. Dịch chuyển bóng: { type: "MOVE", from: [r, c], to: [r, c] }
  // 2. Xuất hiện bóng mới: { type: "SPAWN", balls: [[r, c, color], ...] }
  // 3. Ăn hàng bóng: { type: "CLEAR", cells: [[r, c], ...] }
  // 4. Cộng điểm: { type: "SCORE", delta: 150 }
}
```

### C. Sprite Cache hỗ trợ tỷ lệ DPR (`spritecache.js`)
Tạo đệm toàn bộ bóng cờ bằng Canvas không hiển thị (Offscreen Canvas) nhân tỉ lệ với **Device Pixel Ratio (DPR)** của thiết bị (1x, 2x, 3x) để đảm bảo hình ảnh sắc nét tuyệt đối trên các dòng điện thoại cao cấp màn hình Retina:
*   **Bóng cờ (Balls):** 6 màu cờ × 5 trạng thái co giãn/pulse = 30 sprites.
*   **Bóng ma (Ghost):** 6 màu cờ × 1 độ mờ (30% opacity) = 6 sprites.
*   **Hào quang (Glow):** 6 màu cờ × 3 cường độ sáng = 18 sprites.

### D. Game Scheduler (`scheduler.js`)
Tách rời game loop khỏi các hàm hẹn giờ gốc của trình duyệt nhằm hỗ trợ tạm dừng (Pause), tua nhanh, tua chậm (slow motion) hoặc đảo ngược (rollback) dòng chảy thời gian của game.
```javascript
export class GameScheduler {
  constructor() {
    this.tasks = [];
    this.timeScale = 1.0;
    this.paused = false;
  }
  update(dt) {
    if (this.paused) return;
    const scaledDt = dt * this.timeScale;
    // Thực thi và cập nhật thời gian còn lại của các tác vụ
  }
  after(ms, fn) { ... }
  every(ms, fn) { ... }
  cancel(id) { ... }
}
```

---

## 💎 5. Đặc Tả Trải Nghiệm Premium Game Feel

### A. Phản hồi quả bóng (Premium Ball Feedback)
*   **Selected Pulse:** Quả bóng được chọn sẽ co giãn nhịp nhàng theo chu kỳ hình sin.
*   **Danger Alert:** Quả bóng cờ có nước đi kế tiếp bị chặn bởi spawn tương lai cắt ngang đường cờ (Potential Line Setup) sẽ chuyển màu nhạt đi (desaturate) và rung nhẹ cản trở (`🔴 shake`). *Lưu ý:* Tránh cảnh báo quá nhiều khi spawn tương lai trùng ô thông thường để giữ độ tư duy tự nhiên cho người chơi.
*   **Potential Line (Soft Glow):** Các bóng nằm trong hàng 4 quả cùng màu sẽ phát ra vầng hào quang nhẹ tỏa sáng dịu mắt.
*   **Near Complete Highlight:** Hiển thị một tia sáng chạy ngang qua hàng 4 quả cờ.

### B. Theme Engine
*   **Theme Class Contract: Cấu trúc theme hóa được quy chuẩn:
    ```javascript
    class Theme {
      constructor({ board, balls, particles, audio, ambient, hud, animation }) {
        this.board = board;           // màu ô cờ, màu lưới
        this.balls = balls;           // phong cách thiết kế bóng
        this.particles = particles;   // phong cách nổ hạt
        this.audio = audio;           // hiệu ứng âm thanh tactile
        this.ambient = ambient;       // nhạc nền Ambient phù hợp
        this.hud = hud;               // bộ màu hiển thị HUD áp lực
        this.animation = animation;   // { pulseSpeed, shakePower, glowIntensity }
      }
    }
    ```
    Người chơi tự do chọn các Theme: *Classic CRT*, *Windows 98*, *Crystal*, *Neon Cyber*, *Galaxy Space*, *Zen Garden*.

---

## 📈 6. Kịch Bản Nghiệm Thu & Đảm Bảo Chất Lượng (Verification Plan)

### 1. Golden Replay Test (Kiểm thử Determinism tự động)
Hệ thống tự động mô phỏng đầu vào thông qua hạt giống cố định và chuỗi di chuyển định sẵn để so sánh kết quả cờ trên môi trường chạy thử nghiệm:
```text
[Bắt đầu giả lập] seed=12345 → Di chuyển 500 nước đi mẫu → Điểm mong đợi: 12340 → Hash bàn cờ cuối cùng: AB92CD
Nếu Hash bàn cờ không khớp => Trượt quy trình build.
```

### 2. Trình Profiler Hiệu Năng
Trong phiên bản phát triển (Dev Build), hiển thị HUD đo chỉ số thời gian xử lý cờ trực quan giúp nhà phát triển tối ưu hóa mã nguồn:
```text
FPS: 60
Logic: 0.11ms | Render: 1.15ms | Particle: 0.72ms
Memory: 14MB | DrawCalls: 84
```
