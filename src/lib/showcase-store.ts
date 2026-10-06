import { promises as fs } from "fs";
import path from "path";
import type { ShowcaseData } from "@/lib/showcase-types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const showcasePath = path.join(process.cwd(), "src", "content", "showcase", "products.json");

type ShowcaseProductRow = {
  id: string;
  category: "3d" | "display";
  name_vi: string;
  name_en: string;
  description_vi: string;
  description_en: string;
  image: string;
  gallery: string[] | null;
  old_price: number;
  sale_price: number;
  stock_text_vi: string;
  stock_text_en: string;
  tags: string[] | null;
  sort_order: number;
};

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function normalizePayload(data: ShowcaseData): ShowcaseData {
  return {
    schemaVersion: 1,
    items: (data.items ?? []).map((item, index) => ({
      id: item.id?.trim() || `sp-${String(index + 1).padStart(2, "0")}`,
      category: item.category === "display" ? "display" : "3d",
      name: {
        vi: item.name?.vi?.trim() ?? "",
        en: item.name?.en?.trim() ?? ""
      },
      description: {
        vi: item.description?.vi?.trim() ?? "",
        en: item.description?.en?.trim() ?? ""
      },
      image: item.image?.trim() ?? "",
      gallery: (item.gallery ?? []).map((img) => img.trim()).filter(Boolean),
      oldPrice: Number.isFinite(item.oldPrice) ? Math.max(0, Math.round(item.oldPrice)) : 0,
      salePrice: Number.isFinite(item.salePrice) ? Math.max(0, Math.round(item.salePrice)) : 0,
      stockText: {
        vi: item.stockText?.vi?.trim() ?? "",
        en: item.stockText?.en?.trim() ?? ""
      },
      tags: (item.tags ?? []).map((tag) => tag.trim()).filter(Boolean)
    }))
  };
}

function fromSupabaseRows(rows: ShowcaseProductRow[]): ShowcaseData {
  return {
    schemaVersion: 1,
    items: rows
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((row) => ({
        id: row.id,
        category: row.category === "display" ? "display" : "3d",
        name: {
          vi: row.name_vi ?? "",
          en: row.name_en ?? ""
        },
        description: {
          vi: row.description_vi ?? "",
          en: row.description_en ?? ""
        },
        image: row.image ?? "",
        gallery: Array.isArray(row.gallery) ? row.gallery : [],
        oldPrice: Number(row.old_price ?? 0),
        salePrice: Number(row.sale_price ?? 0),
        stockText: {
          vi: row.stock_text_vi ?? "",
          en: row.stock_text_en ?? ""
        },
        tags: Array.isArray(row.tags) ? row.tags : []
      }))
  };
}

function toSupabaseRows(data: ShowcaseData): ShowcaseProductRow[] {
  return data.items.map((item, index) => ({
    id: item.id,
    category: item.category === "display" ? "display" : "3d",
    name_vi: item.name.vi,
    name_en: item.name.en,
    description_vi: item.description.vi,
    description_en: item.description.en,
    image: item.image,
    gallery: item.gallery ?? [],
    old_price: item.oldPrice,
    sale_price: item.salePrice,
    stock_text_vi: item.stockText.vi,
    stock_text_en: item.stockText.en,
    tags: item.tags ?? [],
    sort_order: index
  }));
}

async function readShowcaseDataFromFile(): Promise<ShowcaseData> {
  const raw = await fs.readFile(showcasePath, "utf-8");
  const parsed = JSON.parse(raw) as ShowcaseData;

  return {
    schemaVersion: parsed.schemaVersion ?? 1,
    items: (parsed.items ?? []).map((item) => ({
      id: item.id,
      category: item.category === "display" ? "display" : "3d",
      name: {
        vi: item.name?.vi ?? "",
        en: item.name?.en ?? ""
      },
      description: {
        vi: item.description?.vi ?? "",
        en: item.description?.en ?? ""
      },
      image: item.image ?? "",
      gallery: Array.isArray(item.gallery) ? item.gallery.filter(Boolean) : [],
      oldPrice: Number(item.oldPrice ?? 0),
      salePrice: Number(item.salePrice ?? 0),
      stockText: {
        vi: item.stockText?.vi ?? "",
        en: item.stockText?.en ?? ""
      },
      tags: Array.isArray(item.tags) ? item.tags : []
    }))
  };
}

async function writeShowcaseDataToFile(payload: ShowcaseData) {
  await fs.writeFile(showcasePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export async function readShowcaseData(): Promise<ShowcaseData> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("showcase_products")
      .select("id, category, name_vi, name_en, description_vi, description_en, image, gallery, old_price, sale_price, stock_text_vi, stock_text_en, tags, sort_order")
      .order("sort_order", { ascending: true });

    if (!error && Array.isArray(data)) {
      return fromSupabaseRows(data as ShowcaseProductRow[]);
    }
  }

  return readShowcaseDataFromFile();
}

export async function writeShowcaseData(data: ShowcaseData) {
  const payload = normalizePayload(data);
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const rows = toSupabaseRows(payload);

    const { error: upsertError } = await supabase
      .from("showcase_products")
      .upsert(rows, { onConflict: "id" });

    if (upsertError) {
      if (isProductionRuntime()) {
        throw new Error(`Supabase write failed (showcase_products upsert): ${upsertError.message}`);
      }
    }

    if (!upsertError) {
      const { data: existingRows, error: existingError } = await supabase
        .from("showcase_products")
        .select("id");

      if (existingError && isProductionRuntime()) {
        throw new Error(`Supabase read-after-write failed (showcase_products select): ${existingError.message}`);
      }

      if (!existingError) {
        const keepIds = new Set(rows.map((row) => row.id));
        const staleIds = (existingRows ?? [])
          .map((row) => String(row.id ?? ""))
          .filter((id) => id && !keepIds.has(id));

        if (staleIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("showcase_products")
            .delete()
            .in("id", staleIds);

          if (deleteError && isProductionRuntime()) {
            throw new Error(`Supabase cleanup failed (showcase_products delete): ${deleteError.message}`);
          }

          if (!deleteError) {
            return;
          }
        } else {
          return;
        }
      }
    }
  } else if (isProductionRuntime()) {
    throw new Error("Supabase is not configured for server writes (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  }

  await writeShowcaseDataToFile(payload);
}
