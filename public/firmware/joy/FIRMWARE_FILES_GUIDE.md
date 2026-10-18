# public/firmware/joy - Manifest tĩnh cho Web Flasher

Trang `/joy/flash` ưu tiên các bản phát hành trên Supabase (quản lý ở `/admin/firmware`).
Khi **chưa có bản phát hành nào**, trang dùng `manifest.json` trong thư mục này.

## Chuẩn bị file .bin

File phải là bản **merged** (bootloader + partition table + app, nạp ở offset 0).
File `xiaozhi.bin` (chỉ có app) **không** dùng được ở đây.

```bash
# trong repo xiaozhi-esp32, sau khi build board bread-compact-wifi
idf.py build
idf.py merge-bin            # ESP-IDF >= 5.4: tạo build/merged-binary.bin
# ESP-IDF cũ hơn: python scripts/release.py (của xiaozhi-esp32) hoặc
#   cd build && esptool.py --chip esp32s3 merge_bin -o merged-binary.bin @flash_args
cp build/merged-binary.bin <repo web>/public/firmware/joy/joy_chi_cot-merged.bin
```

Sau đó sửa `version` trong `manifest.json` cho khớp `PROJECT_VER`.

## Định dạng manifest (ESP Web Tools)

- `path` tính tương đối theo vị trí file manifest.
- `new_install_prompt_erase: true` hiện ô “Erase device” khi nạp.
- Muốn nạp từng phần thay vì file merged:
  `bootloader.bin @ 0x0`, `partition-table.bin @ 0x8000`, `ota_data_initial.bin @ 0xd000`, `xiaozhi.bin @ 0x20000`
  (kiểm tra lại offset theo `build/flasher_args.json`).
