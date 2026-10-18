# Ảnh cho Project Hub

Mỗi hub có thư mục riêng: `public/assets/images/hubs/<slug>/` (vd `hubs/joy/`).
URL trên web = bỏ chữ `public`: `/assets/images/hubs/joy/wiring.png`.

## Gợi ý đặt tên
| File | Dùng ở đâu |
|---|---|
| `cover.jpg` | Ảnh lớn trang tổng quan hub (`"cover"` trong hub.json) |
| `wiring.png` | Sơ đồ đấu dây tổng (docs/hardware/wiring.md) |
| `wiring-audio.png`, `wiring-motor.png`… | Sơ đồ từng phần |
| `bom-parts.jpg` | Ảnh chụp bộ linh kiện |

- Đặt tên chữ thường, không dấu, không khoảng trắng.
- Ảnh sơ đồ: PNG, rộng 1600–2000 px. Ảnh chụp: JPG/WebP, < 500 KB.

## Chèn vào tài liệu (.md)
```md
![Sơ đồ đấu dây tổng](/assets/images/hubs/joy/wiring.png "Hình 1. Sơ đồ đấu dây Joy_chi_cot")
```
Phần trong ngoặc kép là chú thích hiện dưới ảnh. Bấm vào ảnh trên web sẽ mở ảnh gốc.

## Không muốn deploy lại?
Upload ở Admin → Nội dung & hiển thị → **Kho Media Storage** (Supabase), copy URL rồi dán vào file .md.
