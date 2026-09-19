import { promises as fs } from "fs";
import path from "path";
import type { ShowcaseData } from "@/lib/showcase-types";

const showcasePath = path.join(process.cwd(), "src", "content", "showcase", "products.json");

export async function readShowcaseData(): Promise<ShowcaseData> {
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

export async function writeShowcaseData(data: ShowcaseData) {
  const payload: ShowcaseData = {
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

  await fs.writeFile(showcasePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}
