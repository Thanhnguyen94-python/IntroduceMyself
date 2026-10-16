-- Tách file merged thành từng phần (bootloader, partition table, otadata, app, assets) để nạp online:
-- - Không ghi đè vùng NVS bằng 0xFF -> giữ Wi-Fi/cài đặt khi không chọn "xoá".
-- - Bỏ qua khoảng trống 0xFF lớn -> nạp nhanh hơn, ít dữ liệu truyền qua USB.
-- flash_parts: [{ "path": "<storage path>", "offset": 0, "size": 1234 }, ...]
-- Date: 2026-10-16

alter table public.firmware_releases
  add column if not exists flash_parts jsonb not null default '[]'::jsonb;
