// Tạo Project Hub mới từ mẫu src/content/hubs/_template.
// Dùng: npm run new:hub -- <slug> "<Tên dự án>"
//   vd: npm run new:hub -- don-nha "Robot_don_nha"
import { promises as fs } from "fs";
import path from "path";

const [slug, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ").trim() || slug;

// Slug trùng route tĩnh / thư mục public sẽ không bao giờ mở được hub.
const RESERVED = new Set(["admin", "api", "assets", "firmware", "cv", "du-an", "hanh-trinh", "san-pham-trung-bay", "tai-lieu-ky-thuat", "tong-quan", "_next"]);

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

if (!slug) fail('Thiếu slug. Ví dụ: npm run new:hub -- don-nha "Robot_don_nha"');
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) fail("Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang (vd don-nha).");
if (RESERVED.has(slug)) fail(`Slug "${slug}" trùng route có sẵn, hãy chọn tên khác.`);

const root = process.cwd();
const templateDir = path.join(root, "src", "content", "hubs", "_template");
const hubDir = path.join(root, "src", "content", "hubs", slug);

try {
  await fs.access(hubDir);
  fail(`Đã tồn tại ${path.relative(root, hubDir)}`);
} catch {
  // chưa có -> tạo mới
}

const today = new Date().toISOString().slice(0, 10);
const fill = (text) => text.replaceAll("__SLUG__", slug).replaceAll("__NAME__", name).replaceAll("__DATE__", today);

async function copyDir(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(src, dest);
    else await fs.writeFile(dest, fill(await fs.readFile(src, "utf-8")), "utf-8");
  }
}

await copyDir(templateDir, hubDir);

const imagesDir = path.join(root, "public", "assets", "images", "hubs", slug);
await fs.mkdir(imagesDir, { recursive: true });
await fs.writeFile(path.join(imagesDir, ".gitkeep"), "", "utf-8");

const firmwareDir = path.join(root, "public", "firmware", slug);
await fs.mkdir(firmwareDir, { recursive: true });
const manifest = {
  name,
  version: "0.1.0",
  new_install_prompt_erase: true,
  builds: [{ chipFamily: "ESP32-S3", parts: [{ path: `${slug}-merged.bin`, offset: 0 }] }]
};
await fs.writeFile(path.join(firmwareDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");

console.log(`✔ Đã tạo Project Hub "${name}"`);
console.log(`  Nội dung : src/content/hubs/${slug}/hub.json + docs/*.md`);
console.log(`  Ảnh      : public/assets/images/hubs/${slug}/`);
console.log(`  Firmware : public/firmware/${slug}/manifest.json`);
console.log(`  Xem thử  : npm run dev -> http://localhost:3000/${slug}`);
console.log(`  Không có firmware? Xoá khối "firmware" trong hub.json để ẩn trang Nạp firmware.`);
