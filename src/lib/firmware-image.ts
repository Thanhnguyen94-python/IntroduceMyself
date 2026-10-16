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
