import type { CalculatorId, HandbookCategory, HandbookEntry, Threshold } from "@/lib/handbook/types";

// Khai báo gọn 1 mục sổ tay mặc định. Nội dung tiếng Việt; bản tiếng Anh để trống thì web dùng tiếng Việt.
export type SeedInput = {
  slug: string;
  symbol: string;
  vi: string;
  en: string;
  summary: string;
  formula?: string;
  unit?: string;
  thresholds?: Array<[Threshold["level"], string, string]>;
  body: string;
  tags?: string[];
  related?: string[];
  references?: string[];
  calculator?: CalculatorId;
};

export function seedGroup(category: HandbookCategory, items: SeedInput[]): HandbookEntry[] {
  return items.map((s, i) => ({
    id: `seed-${s.slug}`,
    slug: s.slug,
    category,
    sortOrder: (i + 1) * 10,
    status: "published",
    title: { vi: s.vi, en: s.en },
    symbol: s.symbol,
    summary: { vi: s.summary, en: "" },
    formula: s.formula ?? "",
    unit: s.unit ?? "",
    thresholds: (s.thresholds ?? []).map(([level, range, meaning]) => ({ level, range, meaning })),
    body: { vi: s.body.trim(), en: "" },
    tags: s.tags ?? [],
    related: s.related ?? [],
    references: s.references ?? [],
    calculator: s.calculator ?? "",
    updatedAt: "2026-10-22T00:00:00.000Z"
  }));
}
