import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assertReadable } from "@/lib/supabase/strict-read";
import { deleteRows, getRow, insertRow, selectRows, StorageUnavailableError, updateRows } from "@/lib/data/table-store";
import { normalizeMediaUrl } from "@/lib/smart-media";
import { DEFAULT_SHOP_SETTINGS } from "@/lib/shop/defaults";
import { RESERVED_PRODUCT_SLUGS, slugify, type ProductStatus, type ShopProduct, type ShopSettings } from "@/lib/shop/types";
import type { LocalizedText } from "@/lib/content/types";

// Sản phẩm: bảng shop_products (Supabase) hoặc .data/dev-db.json khi chạy local không có Supabase.
// Cài đặt cửa hàng: site_content["shop_settings"] (Supabase) hoặc .data/shop-settings.json.

const SETTINGS_KEY = "shop_settings";
const DEV_SETTINGS_FILE = path.join(process.cwd(), ".data", "shop-settings.json");
const DEV_SEED_MARKER = path.join(process.cwd(), ".data", "shop-seeded");
const LEGACY_PRODUCTS_FILE = path.join(process.cwd(), "src", "content", "showcase", "products.json");

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

// ---------- Chuẩn hoá ----------
const text = (value: unknown, max = 5000) => String(value ?? "").trim().slice(0, max);
const loc = (value: unknown, max = 5000): LocalizedText => {
  const v = (value ?? {}) as Partial<LocalizedText>;
  return { vi: text(v.vi, max), en: text(v.en, max) };
};
const int = (value: unknown, min = 0) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(min, n) : min;
};

export function normalizeProduct(input: Partial<ShopProduct>): ShopProduct {
  const now = new Date().toISOString();
  const name = loc(input.name, 200);
  const status: ProductStatus = input.status === "published" || input.status === "hidden" ? input.status : "draft";
  const stockRaw = input.stock as unknown;
  return {
    id: text(input.id, 80) || randomUUID(),
    slug: slugify(text(input.slug) || name.vi || name.en) || `sp-${Date.now()}`,
    status,
    category: text(input.category, 40),
    name,
    summary: loc(input.summary, 600),
    description: loc(input.description, 20000),
    media: (Array.isArray(input.media) ? input.media : [])
      .map((m) => ({ url: normalizeMediaUrl(text(m?.url, 1000)), ...(m?.kind && m.kind !== "auto" ? { kind: m.kind } : {}) }))
      .filter((m) => m.url)
      .slice(0, 20),
    price: int(input.price),
    compareAtPrice: int(input.compareAtPrice),
    stock: stockRaw === null || stockRaw === undefined || stockRaw === "" ? null : int(stockRaw),
    stockNote: loc(input.stockNote, 120),
    options: (Array.isArray(input.options) ? input.options : [])
      .map((o) => ({ name: loc(o?.name, 60), values: (Array.isArray(o?.values) ? o.values : []).map((v) => text(v, 60)).filter(Boolean).slice(0, 20) }))
      .filter((o) => (o.name.vi || o.name.en) && o.values.length)
      .slice(0, 5),
    specs: (Array.isArray(input.specs) ? input.specs : [])
      .map((s) => ({ label: loc(s?.label, 80), value: text(s?.value, 200) }))
      .filter((s) => (s.label.vi || s.label.en) && s.value)
      .slice(0, 30),
    tags: (Array.isArray(input.tags) ? input.tags : []).map((t) => text(t, 40)).filter(Boolean).slice(0, 12),
    featured: Boolean(input.featured),
    badge: loc(input.badge, 30),
    sortOrder: int(input.sortOrder),
    soldCount: int(input.soldCount),
    createdAt: text(input.createdAt) || now,
    updatedAt: text(input.updatedAt) || now
  };
}

type ProductRow = {
  id: string;
  slug: string;
  status: ProductStatus;
  category: string;
  sort_order: number;
  price: number;
  compare_at_price: number;
  stock: number | null;
  featured: boolean;
  sold_count: number;
  data: Partial<ShopProduct>;
  created_at: string;
  updated_at: string;
};

function fromRow(row: ProductRow): ShopProduct {
  return normalizeProduct({
    ...(row.data ?? {}),
    id: row.id,
    slug: row.slug,
    status: row.status,
    category: row.category,
    sortOrder: row.sort_order,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    stock: row.stock,
    featured: row.featured,
    soldCount: row.sold_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function toRow(p: ShopProduct): ProductRow {
  const { name, summary, description, media, stockNote, options, specs, tags, badge } = p;
  return {
    id: p.id,
    slug: p.slug,
    status: p.status,
    category: p.category,
    sort_order: p.sortOrder,
    price: p.price,
    compare_at_price: p.compareAtPrice,
    stock: p.stock,
    featured: p.featured,
    sold_count: p.soldCount,
    data: { name, summary, description, media, stockNote, options, specs, tags, badge },
    created_at: p.createdAt,
    updated_at: p.updatedAt
  };
}

// ---------- Dữ liệu mẫu khi chạy local lần đầu (lấy từ trang "Sản phẩm trưng bày" cũ) ----------
type LegacyItem = {
  id: string;
  category: string;
  name: LocalizedText;
  description: LocalizedText;
  image: string;
  gallery?: string[];
  oldPrice: number;
  salePrice: number;
  stockText: LocalizedText;
  tags: string[];
};

let seeding: Promise<void> | null = null;
async function ensureDevSeed() {
  if (getSupabaseServerClient() || isProductionRuntime()) return;
  seeding ??= (async () => {
    try {
      await fs.access(DEV_SEED_MARKER);
      return;
    } catch {
      // chưa seed
    }
    try {
      const legacy = JSON.parse(await fs.readFile(LEGACY_PRODUCTS_FILE, "utf-8")) as { items?: LegacyItem[] };
      const items = legacy.items ?? [];
      for (const [index, item] of items.entries()) {
        const product = normalizeProduct({
          id: item.id,
          slug: item.name.vi,
          status: "published",
          category: item.category,
          name: item.name,
          summary: item.description,
          media: [...new Set([item.image, ...(item.gallery ?? [])].filter(Boolean))].map((url) => ({ url })),
          price: item.salePrice,
          compareAtPrice: item.oldPrice,
          stock: null,
          stockNote: item.stockText,
          tags: item.tags,
          featured: index < 2,
          sortOrder: index
        });
        await insertRow("shop_products", toRow(product));
      }
    } catch (error) {
      console.error("[shop] dev seed failed", error);
    }
    await fs.mkdir(path.dirname(DEV_SEED_MARKER), { recursive: true });
    await fs.writeFile(DEV_SEED_MARKER, new Date().toISOString(), "utf-8");
  })();
  await seeding;
}

// ---------- Sản phẩm ----------
export async function listProducts(opts: { publishedOnly?: boolean } = {}): Promise<ShopProduct[]> {
  await ensureDevSeed();
  const rows = await selectRows<ProductRow>("shop_products", {
    ...(opts.publishedOnly ? { eq: { status: "published" } } : {}),
    order: ["sort_order", "asc"],
    limit: 1000
  });
  return rows.map(fromRow);
}

export async function getProduct(id: string) {
  await ensureDevSeed();
  const row = await getRow<ProductRow>("shop_products", id);
  return row ? fromRow(row) : null;
}

export async function getProductBySlug(slug: string) {
  await ensureDevSeed();
  const rows = await selectRows<ProductRow>("shop_products", { eq: { slug }, limit: 1 });
  return rows[0] ? fromRow(rows[0]) : null;
}

export class ShopValidationError extends Error {}

export async function saveProduct(input: Partial<ShopProduct>): Promise<ShopProduct> {
  const product = normalizeProduct({ ...input, updatedAt: new Date().toISOString() });
  if (!product.name.vi && !product.name.en) throw new ShopValidationError("Sản phẩm cần có tên.");
  if (RESERVED_PRODUCT_SLUGS.has(product.slug)) throw new ShopValidationError(`Đường dẫn "${product.slug}" bị trùng với trang của cửa hàng, hãy đổi tên khác.`);

  const sameSlug = await selectRows<ProductRow>("shop_products", { eq: { slug: product.slug }, limit: 2, columns: "id,slug" });
  if (sameSlug.some((row) => row.id !== product.id)) throw new ShopValidationError(`Đường dẫn "/shop/san-pham/${product.slug}" đã có sản phẩm khác dùng.`);

  const existing = await getRow<ProductRow>("shop_products", product.id);
  if (existing) {
    // Giữ số đã bán và ngày tạo của bản trong database (form Admin không sửa 2 trường này).
    const merged = { ...product, soldCount: existing.sold_count, createdAt: existing.created_at };
    const { id: _id, created_at: _created, ...patch } = toRow(merged);
    await updateRows("shop_products", { id: product.id }, patch);
    return merged;
  }

  const all = await selectRows<ProductRow>("shop_products", { columns: "id,sort_order", order: ["sort_order", "desc"], limit: 1 });
  const created = { ...product, soldCount: 0, sortOrder: (all[0]?.sort_order ?? -1) + 1, createdAt: new Date().toISOString() };
  await insertRow("shop_products", toRow(created));
  return created;
}

export async function patchProduct(id: string, patch: { status?: ProductStatus; featured?: boolean; stock?: number | null }) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) row.status = patch.status;
  if (typeof patch.featured === "boolean") row.featured = patch.featured;
  if (patch.stock !== undefined) row.stock = patch.stock === null ? null : int(patch.stock);
  return updateRows("shop_products", { id }, row);
}

export async function deleteProduct(id: string) {
  await deleteRows("shop_products", { id });
}

export async function reorderProducts(ids: string[]) {
  await Promise.all(ids.map((id, index) => updateRows("shop_products", { id }, { sort_order: index })));
}

// Trừ / cộng lại tồn kho & số đã bán theo các dòng của đơn hàng. direction = -1 khi đặt, +1 khi huỷ.
export async function applyStock(lines: Array<{ productId: string; quantity: number }>, direction: 1 | -1) {
  for (const line of lines) {
    const row = await getRow<ProductRow>("shop_products", line.productId);
    if (!row) continue;
    const patch: Record<string, unknown> = { sold_count: Math.max(0, (row.sold_count ?? 0) - direction * line.quantity) };
    if (row.stock !== null && row.stock !== undefined) patch.stock = Math.max(0, row.stock + direction * line.quantity);
    await updateRows("shop_products", { id: row.id }, patch);
  }
}

// ---------- Cài đặt cửa hàng ----------
export function normalizeSettings(input: Partial<ShopSettings> | null | undefined): ShopSettings {
  const d = DEFAULT_SHOP_SETTINGS;
  const s = (input ?? {}) as Partial<ShopSettings>;
  const bank = (s.payment?.bank ?? d.payment.bank) as ShopSettings["payment"]["bank"];
  return {
    name: text(s.name, 60) || d.name,
    tagline: s.tagline ? loc(s.tagline, 160) : d.tagline,
    intro: s.intro ? loc(s.intro, 600) : d.intro,
    announcement: s.announcement ? loc(s.announcement, 160) : d.announcement,
    heroMedia: Array.isArray(s.heroMedia)
      ? s.heroMedia.map((m) => ({ url: normalizeMediaUrl(text(m?.url, 1000)), ...(m?.kind && m.kind !== "auto" ? { kind: m.kind } : {}) })).filter((m) => m.url).slice(0, 12)
      : d.heroMedia,
    slideInterval: Math.min(30, Math.max(2, int(s.slideInterval ?? d.slideInterval))),
    categories: Array.isArray(s.categories)
      ? s.categories.map((c) => ({ id: slugify(text(c?.id, 40)) || slugify(text(c?.label?.vi, 40)), icon: text(c?.icon, 8), label: loc(c?.label, 40) })).filter((c) => c.id)
      : d.categories,
    highlights: Array.isArray(s.highlights) ? s.highlights.map((h) => ({ icon: text(h?.icon, 8), title: loc(h?.title, 60), text: loc(h?.text, 160) })).slice(0, 6) : d.highlights,
    shipping: s.shipping ? { fee: int(s.shipping.fee), freeFrom: int(s.shipping.freeFrom), note: loc(s.shipping.note, 300) } : d.shipping,
    payment: {
      cod: s.payment ? s.payment.cod !== false : d.payment.cod,
      bank: { enabled: Boolean(bank.enabled), bankId: text(bank.bankId, 20), accountNo: text(bank.accountNo, 30).replace(/\s+/g, ""), accountName: text(bank.accountName, 60).toUpperCase() }
    },
    contact: s.contact ? { phone: text(s.contact.phone, 20), zalo: text(s.contact.zalo, 20), email: text(s.contact.email, 120) } : d.contact,
    policies: s.policies ? loc(s.policies, 4000) : d.policies
  };
}

export async function readShopSettings(): Promise<ShopSettings> {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data, error } = await supabase.from("site_content").select("payload").eq("config_key", SETTINGS_KEY).maybeSingle();
    assertReadable("site_content/shop_settings", supabase, error);
    return normalizeSettings((data?.payload as Partial<ShopSettings>) ?? null);
  }
  assertReadable("site_content/shop_settings", supabase);
  try {
    return normalizeSettings(JSON.parse(await fs.readFile(DEV_SETTINGS_FILE, "utf-8")) as Partial<ShopSettings>);
  } catch {
    return normalizeSettings(null);
  }
}

export async function writeShopSettings(input: Partial<ShopSettings>) {
  const settings = normalizeSettings(input);
  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase
      .from("site_content")
      .upsert({ config_key: SETTINGS_KEY, payload: settings, updated_at: new Date().toISOString() }, { onConflict: "config_key" });
    if (error) throw new Error(`Lưu cài đặt cửa hàng thất bại: ${error.message}`);
    return settings;
  }
  if (isProductionRuntime()) throw new StorageUnavailableError("Supabase chưa được cấu hình.");
  await fs.mkdir(path.dirname(DEV_SETTINGS_FILE), { recursive: true });
  await fs.writeFile(DEV_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  return settings;
}
