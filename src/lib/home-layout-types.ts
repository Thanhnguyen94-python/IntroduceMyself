import type { LocalizedText } from "@/lib/content/types";

// Các khối (section) có thể bật/tắt và kéo thả thứ tự trên trang chủ Portfolio.
export type HomeSectionId = "hero" | "stats" | "highlights" | "skills" | "case-studies" | "journey" | "contact";

export type HomeSection = {
  id: HomeSectionId;
  enabled: boolean;
};

export type HomeLayoutConfig = {
  schemaVersion: number;
  sections: HomeSection[];
  // Slug các dự án nổi bật hiển thị ở section Case Study (rỗng = tự lấy 3 dự án đầu).
  featuredProjects: string[];
};

export const HOME_SECTION_META: Record<HomeSectionId, { label: LocalizedText; description: string }> = {
  hero: { label: { vi: "Giới thiệu (Hero)", en: "Hero" }, description: "Ảnh đại diện, chức danh, slogan, nút CTA." },
  stats: { label: { vi: "Số liệu nổi bật", en: "Key numbers" }, description: "Số năm kinh nghiệm, số dự án, số công ty." },
  highlights: { label: { vi: "Điểm mạnh", en: "Highlights" }, description: "Danh sách điểm nổi bật trong hồ sơ." },
  skills: { label: { vi: "Kỹ năng", en: "Skills" }, description: "Nhóm kỹ năng / thiết bị." },
  "case-studies": { label: { vi: "Case Study dự án", en: "Case studies" }, description: "Các dự án nổi bật dạng case study." },
  journey: { label: { vi: "Hành trình", en: "Journey" }, description: "Timeline rút gọn các mốc công việc." },
  contact: { label: { vi: "Liên hệ", en: "Contact" }, description: "Khối kêu gọi liên hệ / tải CV." }
};

export const DEFAULT_HOME_LAYOUT: HomeLayoutConfig = {
  schemaVersion: 1,
  sections: (["hero", "stats", "case-studies", "highlights", "skills", "journey", "contact"] as HomeSectionId[]).map((id) => ({
    id,
    enabled: true
  })),
  featuredProjects: []
};

export function normalizeHomeLayout(raw: Partial<HomeLayoutConfig> | null | undefined): HomeLayoutConfig {
  const known = Object.keys(HOME_SECTION_META) as HomeSectionId[];
  const seen = new Set<HomeSectionId>();
  const sections: HomeSection[] = [];

  for (const item of raw?.sections ?? []) {
    if (!item || !known.includes(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    sections.push({ id: item.id, enabled: item.enabled !== false });
  }
  // Section mới thêm vào code mà dữ liệu cũ chưa có -> nối vào cuối, mặc định bật.
  for (const id of known) {
    if (!seen.has(id)) sections.push({ id, enabled: true });
  }

  return {
    schemaVersion: 1,
    sections,
    featuredProjects: Array.isArray(raw?.featuredProjects) ? raw.featuredProjects.filter((it) => typeof it === "string") : []
  };
}
