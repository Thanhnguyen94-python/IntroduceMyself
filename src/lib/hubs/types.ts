import type { LocalizedList, LocalizedText } from "@/lib/content/types";

// Một "Project Hub" = không gian cho maker/người dùng của 1 dự án phần cứng
// (tài liệu, nạp firmware, cập nhật). Mỗi hub là 1 thư mục trong src/content/hubs/<slug>/.

export type HubStatus = "alpha" | "beta" | "stable";

export type HubFeature = {
  icon: string;
  title: LocalizedText;
  text: LocalizedText;
};

export type HubSpec = {
  label: LocalizedText;
  value: string;
};

export type HubDocSection = {
  id: string;
  title: LocalizedText;
  icon?: string;
};

export type HubUpdate = {
  version: string;
  date: string;
  channel?: "stable" | "beta";
  title: LocalizedText;
  notes: LocalizedList;
};

export type HubFirmwareConfig = {
  // Khớp cột `board` trong bảng firmware_releases (Supabase).
  board: string;
  chip: string;
  // Manifest tĩnh dùng khi chưa có bản phát hành nào trên Supabase.
  fallbackManifest?: string;
};

export type HubLink = {
  label: LocalizedText;
  href: string;
};

export type HubConfig = {
  schemaVersion: number;
  slug: string;
  name: string;
  emoji: string;
  order: number;
  status: HubStatus;
  tagline: LocalizedText;
  description: LocalizedText;
  cover?: string;
  // Slug case study tương ứng bên Portfolio (chỉ để admin tham chiếu, không render link ngược).
  caseStudySlug?: string;
  firmware?: HubFirmwareConfig;
  features: HubFeature[];
  specs: HubSpec[];
  docSections: HubDocSection[];
  updates: HubUpdate[];
  links: HubLink[];
};

export type HubSummary = Pick<HubConfig, "slug" | "name" | "emoji" | "status" | "tagline" | "order" | "caseStudySlug">;

export type HubDocMeta = {
  hub: string;
  slug: string[];
  path: string;
  title: string;
  description: string;
  section: string;
  order: number;
  updated?: string;
};

export type HubDocTocItem = {
  id: string;
  text: string;
  depth: number;
};

export type HubDoc = HubDocMeta & {
  html: string;
  toc: HubDocTocItem[];
};
