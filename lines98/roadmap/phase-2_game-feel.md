# Phase 2 Roadmap: Visuals, Custom Tweens & Game Feel 🎨✨

Mục tiêu của giai đoạn 2 là xây dựng bộ điều khiển Tween nội bộ, dựng SpriteCache vẽ cờ siêu nhanh theo DPR của thiết bị, thực hiện hiệu ứng rung lắc màn hình và bổ sung các phản hồi cờ Premium để kích thích dopamine.

---

## 📅 Danh Sách Nhiệm Vụ Chi Tiết

### 1. Xây dựng Tween Engine nội bộ (`fx/tween.js`)
* Thiết lập lớp `Tween` cập nhật theo chu kỳ gia số delta thời gian (`dt`).
* Đảm bảo các thuộc tính co giãn bóng, di chuyển bóng hoạt động tuần tự (deterministic) để phục vụ replay.

### 2. Thiết lập Sprite Cache theo DPR (`render/spritecache.js`)
* Vẽ trước bóng cờ 3D radial gradient sắc nét vào Offscreen Canvas theo Device Pixel Ratio (1x, 2x, 3x).
* Cache đầy đủ 30 sprite bóng (6 màu × 5 trạng thái co giãn), 6 sprite ghost mờ 30% và 18 sprite glow phát sáng.
* Triển khai bộ atlas hạt pha lê vỡ.

### 3. Canvas2D Viewport & Screen Transform (`render/viewport.js` & `fx/camera.js`)
* Xây dựng luồng vẽ chính vẽ lưới cờ, bóng cờ và ghost bằng `ctx.drawImage` thay cho vẽ vector.
* Dựng hệ thống Screen Transform ứng dụng `ctx.translate`, `ctx.scale`, `ctx.rotate` để giả lập nghiêng góc 2.5D, giật nhẹ camera khi ăn điểm và zoom nhẹ khi bóng lăn.
* Vẽ đường đi neon động thời gian thực (`Dynamic Path Preview`).

### 4. Hệ thống hạt tinh thể nổ (`fx/particles.js`)
* Mô phỏng các hạt pha lê rơi tự do (Crystal Shards) theo gia tốc trọng lực giả lập khi ăn điểm.

### 5. Premium Ball Feedback & Pressure Mode HUD (`ui/hud.js`)
* Tạo hoạt ảnh selected pulse co giãn liên tục, danger alert rung lắc desaturate bóng và soft glow halo phát sáng.
* Thiết lập Near Complete Highlight luồng sáng chớp chạy dọc hàng 4 quả cờ.
* Tạo lớp phủ chớp đỏ Vignette và nhịp tim đập nhẹ màn hình kèm hiệu ứng âm thanh tim đập khi bàn cờ đầy > 85%.
