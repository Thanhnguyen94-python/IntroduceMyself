import type { LocalizedText } from "@/lib/content/types";

// Sổ tay tra cứu SMT: mỗi mục = 1 tham số / khái niệm (Cpk, FPY, Area ratio, TAL, MSL...).
// Dùng chung client + server.

export const HANDBOOK_CATEGORIES = [
  { id: "quality", icon: "📏", vi: "Chất lượng & SPC", en: "Quality & SPC" },
  { id: "productivity", icon: "⚙️", vi: "Năng suất & thiết bị", en: "Productivity & equipment" },
  { id: "printing", icon: "🖨️", vi: "In kem & Stencil", en: "Printing & stencil" },
  { id: "placement", icon: "🤖", vi: "Gắn linh kiện", en: "Placement" },
  { id: "reflow", icon: "🔥", vi: "Reflow & hàn", en: "Reflow & soldering" },
  { id: "materials", icon: "📦", vi: "Vật tư, MSL & ESD", en: "Materials, MSL & ESD" },
  { id: "inspection", icon: "🔍", vi: "Kiểm tra & IPC", en: "Inspection & IPC" },
  { id: "problem", icon: "🧭", vi: "Giải quyết vấn đề", en: "Problem solving" }
] as const;
export type HandbookCategory = (typeof HANDBOOK_CATEGORIES)[number]["id"];

// Máy tính nhỏ gắn kèm mục (components/handbook/calculators.tsx).
export const HANDBOOK_CALCULATORS = [
  { id: "cpk", label: "Cp / Cpk" },
  { id: "sigma", label: "DPMO ↔ Sigma" },
  { id: "area-ratio", label: "Area ratio stencil" },
  { id: "oee", label: "OEE" },
  { id: "takt", label: "Takt time & UPH" },
  { id: "rty", label: "RTY (yield nhiều công đoạn)" },
  { id: "mtbf", label: "MTBF / MTTR / Availability" },
  { id: "msl", label: "Thời gian sàn MSL còn lại" }
] as const;
export type CalculatorId = (typeof HANDBOOK_CALCULATORS)[number]["id"];

export type ThresholdLevel = "good" | "warning" | "critical" | "info";
export type Threshold = { level: ThresholdLevel; range: string; meaning: string };

export type HandbookEntry = {
  id: string;
  slug: string;
  category: HandbookCategory;
  sortOrder: number;
  status: "published" | "draft";
  title: LocalizedText;
  // Ký hiệu / viết tắt hiển thị to trên thẻ (VD "Cpk", "TAL")
  symbol: string;
  summary: LocalizedText;
  // Công thức dạng chữ, mỗi dòng 1 công thức
  formula: string;
  unit: string;
  thresholds: Threshold[];
  // Nội dung chi tiết (Markdown)
  body: LocalizedText;
  tags: string[];
  related: string[];
  references: string[];
  calculator: CalculatorId | "";
  updatedAt: string;
};

export const categoryOf = (id: string) => HANDBOOK_CATEGORIES.find((c) => c.id === id) ?? HANDBOOK_CATEGORIES[0];

// Bỏ dấu tiếng Việt để tìm "cpk", "nang luc", "ram" đều ra.
export function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

export function searchText(e: HandbookEntry) {
  return fold([e.symbol, e.title.vi, e.title.en, e.summary.vi, e.summary.en, e.formula, e.tags.join(" "), e.slug].join(" "));
}

// Mục trống cho Admin → Thêm mục.
export function emptyEntry(): HandbookEntry {
  return {
    id: "",
    slug: "",
    category: "quality",
    sortOrder: 100,
    status: "draft",
    title: { vi: "", en: "" },
    symbol: "",
    summary: { vi: "", en: "" },
    formula: "",
    unit: "",
    thresholds: [],
    body: { vi: "### Ý nghĩa\n\n### Cách đo / tính\n\n### Lưu ý thực tế\n", en: "" },
    tags: [],
    related: [],
    references: [],
    calculator: "",
    updatedAt: ""
  };
}
