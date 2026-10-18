import { promises as fs } from "fs";
import path from "path";
import { HUBS_DIR, HUB_SLUG_PATTERN, RESERVED_HUB_SLUGS, normalizeHub } from "@/lib/hubs/registry";
import { DOC_SLUG_PART, hubDocsDir, readFileDocRecords, serializeDoc } from "@/lib/hubs/docs";
import { HUB_DOCS_KEY_PREFIX, HUB_KEY_PREFIX, deleteDbRows, isProductionRuntime, isFileStorageMode, writeDbRow } from "@/lib/hubs/db";
import type { HubConfig, HubDocRecord } from "@/lib/hubs/types";

// Ghi dữ liệu Hub từ Admin.
//   Có Supabase (production): lưu site_content -> có hiệu lực ngay, không cần deploy.
//   Local không có Supabase: ghi thẳng vào src/content/hubs/<slug>/ để commit.

const TEMPLATE_DIR = path.join(HUBS_DIR, "_template");

export function validateHubSlug(slug: string) {
  if (!HUB_SLUG_PATTERN.test(slug)) return "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang (vd don-nha).";
  if (RESERVED_HUB_SLUGS.has(slug)) return `Slug "${slug}" trùng route có sẵn của web.`;
  if (slug.length > 40) return "Slug tối đa 40 ký tự.";
  return null;
}

function assertWritable() {
  if (isFileStorageMode() && isProductionRuntime()) {
    throw new Error("Production chưa cấu hình Supabase nên không lưu được.");
  }
}

// Lưu cấu hình: bỏ slug (slug là khoá), bỏ cover cũ (đã chuyển sang media).
function toStoredConfig(config: HubConfig) {
  const { slug: _slug, cover: _cover, ...rest } = config;
  return rest;
}

export function sanitizeDocs(input: HubDocRecord[]): HubDocRecord[] {
  const seen = new Set<string>();
  const docs: HubDocRecord[] = [];
  for (const raw of Array.isArray(input) ? input : []) {
    const slug = (Array.isArray(raw?.slug) ? raw.slug : String(raw?.slug ?? "").split("/"))
      .map((part) => String(part).trim().toLowerCase())
      .filter(Boolean);
    if (!slug.length || !slug.every((part) => DOC_SLUG_PART.test(part))) {
      throw new Error(`Đường dẫn tài liệu không hợp lệ: "${slug.join("/")}". Chỉ dùng a-z, 0-9, "-" và "/".`);
    }
    const key = slug.join("/");
    if (seen.has(key)) throw new Error(`Trùng đường dẫn tài liệu: ${key}`);
    seen.add(key);
    docs.push({
      slug,
      title: String(raw.title ?? "").trim() || slug[slug.length - 1],
      description: String(raw.description ?? "").replace(/\s*\n\s*/g, " ").trim(),
      section: String(raw.section ?? "general").trim() || "general",
      order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 100,
      updated: raw.updated ? String(raw.updated).trim() : undefined,
      body: String(raw.body ?? "")
    });
  }
  return docs;
}

export async function saveHubConfig(slug: string, input: Partial<HubConfig>) {
  assertWritable();
  const config = normalizeHub(input, slug);
  if (isFileStorageMode()) {
    const dir = path.join(HUBS_DIR, slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "hub.json"), `${JSON.stringify(toStoredConfig(config), null, 2)}\n`, "utf-8");
  } else {
    await writeDbRow(`${HUB_KEY_PREFIX}${slug}`, toStoredConfig(config));
  }
  return config;
}

export async function saveHubDocs(slug: string, input: HubDocRecord[]) {
  assertWritable();
  const docs = sanitizeDocs(input);
  if (isFileStorageMode()) {
    const dir = hubDocsDir(slug);
    const existing = await readFileDocRecords(slug);
    const keep = new Set(docs.map((it) => it.slug.join("/")));
    for (const doc of docs) {
      const file = path.join(dir, ...doc.slug) + ".md";
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, serializeDoc(doc), "utf-8");
    }
    for (const old of existing) {
      if (!keep.has(old.slug.join("/"))) await fs.rm(path.join(dir, ...old.slug) + ".md", { force: true });
    }
  } else {
    await writeDbRow(`${HUB_DOCS_KEY_PREFIX}${slug}`, { docs });
  }
  return docs;
}

// Tạo hub mới từ mẫu src/content/hubs/_template.
export async function createHubFromTemplate(slug: string, name: string) {
  const today = new Date().toISOString().slice(0, 10);
  const fill = (text: string) => text.replaceAll("__SLUG__", slug).replaceAll("__NAME__", name).replaceAll("__DATE__", today);

  const rawConfig = JSON.parse(fill(await fs.readFile(path.join(TEMPLATE_DIR, "hub.json"), "utf-8"))) as Partial<HubConfig>;
  // Ảnh bìa mẫu trỏ tới file chưa tồn tại -> để trống, người dùng thêm trong tab Media.
  rawConfig.cover = undefined;
  rawConfig.media = [];
  const templateDocs = (await readFileDocRecords("_template")).map((doc) => ({ ...doc, body: fill(doc.body), title: fill(doc.title), updated: today }));

  const config = await saveHubConfig(slug, { ...rawConfig, name });
  await saveHubDocs(slug, templateDocs);
  return config;
}

// Xoá bản đã sửa trong database -> quay về bản file trong repo (nếu có). Hub chỉ có trong DB sẽ bị xoá hẳn.
export async function resetHubToFile(slug: string) {
  assertWritable();
  if (isFileStorageMode()) throw new Error("Chế độ local đang sửa trực tiếp file, dùng git để khôi phục.");
  await deleteDbRows([`${HUB_KEY_PREFIX}${slug}`, `${HUB_DOCS_KEY_PREFIX}${slug}`]);
}

export async function deleteLocalHub(slug: string) {
  if (!isFileStorageMode() || isProductionRuntime()) throw new Error("Chỉ xoá thư mục hub khi chạy local.");
  await fs.rm(path.join(HUBS_DIR, slug), { recursive: true, force: true });
}
