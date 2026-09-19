export type ShowcaseItem = {
  id: string;
  category: "3d" | "display";
  name: { vi: string; en: string };
  description: { vi: string; en: string };
  image: string;
  gallery?: string[];
  oldPrice: number;
  salePrice: number;
  stockText: { vi: string; en: string };
  tags: string[];
};

export type ShowcaseData = {
  schemaVersion: number;
  items: ShowcaseItem[];
};
