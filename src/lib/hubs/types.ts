import type { LocalizedList, LocalizedText } from "@/lib/content/types";
import type { MediaKind } from "@/lib/smart-media";

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

// Ảnh/video trên đầu trang hub (slideshow). url: ảnh, file video, link YouTube hoặc Google Drive.
export type HubMediaItem = {
  url: string;
  kind?: MediaKind;
  caption?: LocalizedText;
};

// Các khối bên dưới phần hero của trang /<hub>, sắp xếp + bật/tắt trong Admin.
export type HubBlockId = "features" | "specs-docs" | "latest";

export type HubBlock = {
  id: HubBlockId;
  enabled: boolean;
};

export const HUB_BLOCK_LABELS: Record<HubBlockId, string> = {
  features: "Tính năng (Robot làm được gì?)",
  "specs-docs": "Thông số + Bắt đầu từ đâu",
  latest: "Bản cập nhật mới nhất"
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
  // Giữ để tương thích dữ liệu cũ; hiển thị dùng `media` (cover cũ tự chuyển thành media[0]).
  cover?: string;
  media: HubMediaItem[];
  mediaInterval: number;
  autoplayVideo: boolean;
  layout: HubBlock[];
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

// Bản ghi tài liệu đầy đủ (kèm nội dung Markdown) - dùng khi lưu/sửa trong Admin.
export type HubDocRecord = {
  slug: string[];
  title: string;
  description: string;
  section: string;
  order: number;
  updated?: string;
  body: string;
};

export type HubSource = "file" | "database" | "database-override";

export type HubDoc = HubDocMeta & {
  html: string;
  toc: HubDocTocItem[];
};
