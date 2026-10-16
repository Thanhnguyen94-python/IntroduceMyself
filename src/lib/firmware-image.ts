// Đọc thông tin từ file firmware ESP32 ngay trên trình duyệt (trước khi upload).

export type AppImageInfo = {
  version: string;
  project: string;
  idf: string;
  built: string;
};

const IMAGE_MAGIC = 0xe9;
const APP_DESC_MAGIC = 0xabcd5432;
const PARTITION_TABLE_OFFSET = 0x8000;

function readCString(bytes: Uint8Array, offset: number, length: number) {
  const slice = bytes.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return new TextDecoder().decode(end >= 0 ? slice.subarray(0, end) : slice);
}

// esp_app_desc_t nằm ngay sau image header (24 byte) + segment header đầu tiên (8 byte).
function parseAppDesc(bytes: Uint8Array, base: number): AppImageInfo | null {
  if (bytes.length < base + 0x100 || bytes[base] !== IMAGE_MAGIC) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const desc = base + 0x20;
  if (view.getUint32(desc, true) !== APP_DESC_MAGIC) return null;
  return {
    version: readCString(bytes, desc + 16, 32),
    project: readCString(bytes, desc + 48, 32),
    built: `${readCString(bytes, desc + 96, 16)} ${readCString(bytes, desc + 80, 16)}`.trim(),
    idf: readCString(bytes, desc + 112, 32)
  };
}

// File app (xiaozhi.bin) dùng cho OTA.
export function parseAppImage(bytes: Uint8Array) {
  return parseAppDesc(bytes, 0);
}

// File merged (offset 0): tìm phân vùng app đầu tiên trong partition table rồi đọc app desc.
export function parseMergedImage(bytes: Uint8Array) {
  if (bytes.length < PARTITION_TABLE_OFFSET + 0x1000 || bytes[0] !== IMAGE_MAGIC) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let entry = PARTITION_TABLE_OFFSET; entry < PARTITION_TABLE_OFFSET + 0xc00; entry += 32) {
    if (bytes[entry] !== 0xaa || bytes[entry + 1] !== 0x50) break;
    const type = bytes[entry + 2];
    const offset = view.getUint32(entry + 4, true);
    if (type === 0 && offset < bytes.length) {
      return parseAppDesc(bytes, offset);
    }
  }
  return null;
}

export type FlashPart = {
  name: string;
  offset: number;
  bytes: Uint8Array;
};

const SECTOR = 0x1000;

function trimTrailingFF(bytes: Uint8Array) {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0xff) end -= 1;
  if (end === 0) return 0;
  // Làm tròn lên sector 4 KB để vùng xoá khi nạp phủ hết dữ liệu cũ phía sau.
  return Math.min(bytes.length, Math.ceil(end / SECTOR) * SECTOR);
}

// Tách file merged theo partition table. Vùng chỉ toàn 0xFF (nvs, phy, ota_1…) bị bỏ qua
// nên nạp không xoá Wi-Fi/cài đặt; riêng otadata giữ nguyên để robot khởi động từ ota_0.
export function splitMergedImage(bytes: Uint8Array): FlashPart[] | null {
  if (!parseMergedImage(bytes)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const regions: Array<{ name: string; start: number; end: number; keepFull: boolean }> = [
    { name: "bootloader", start: 0, end: PARTITION_TABLE_OFFSET, keepFull: false },
    { name: "partition-table", start: PARTITION_TABLE_OFFSET, end: PARTITION_TABLE_OFFSET + SECTOR, keepFull: false }
  ];
  for (let entry = PARTITION_TABLE_OFFSET; entry < PARTITION_TABLE_OFFSET + 0xc00; entry += 32) {
    if (bytes[entry] !== 0xaa || bytes[entry + 1] !== 0x50) break;
    const type = bytes[entry + 2];
    const subtype = bytes[entry + 3];
    const offset = view.getUint32(entry + 4, true);
    const size = view.getUint32(entry + 8, true);
    const label = readCString(bytes, entry + 12, 16) || `part-${offset.toString(16)}`;
    if (offset >= bytes.length) continue;
    regions.push({ name: label, start: offset, end: Math.min(bytes.length, offset + size), keepFull: type === 1 && subtype === 0 });
  }

  const parts: FlashPart[] = [];
  for (const region of regions) {
    const slice = bytes.subarray(region.start, region.end);
    const length = region.keepFull ? slice.length : trimTrailingFF(slice);
    if (length > 0) parts.push({ name: region.name, offset: region.start, bytes: slice.slice(0, length) });
  }
  return parts;
}

export async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function formatBytes(size: number) {
  if (!size) return "—";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}
