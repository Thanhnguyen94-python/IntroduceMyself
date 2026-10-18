// 5 trang Portfolio cố định (giữ nguyên như trước).
export type PortfolioPageKey = "overview" | "journey" | "projects" | "showcase" | "docs";

// Mỗi Project Hub có key riêng dạng "hub:<slug>" (vd "hub:joy"), sinh tự động từ thư mục hub.
export type HubPageKey = `hub:${string}`;

export type ManagedPageKey = PortfolioPageKey | HubPageKey;

export const PORTFOLIO_PAGE_KEYS: PortfolioPageKey[] = ["overview", "journey", "projects", "showcase", "docs"];

export type SiteVisibilityConfig = {
  schemaVersion: number;
  pages: Record<string, boolean>;
};

export function isPageEnabled(config: SiteVisibilityConfig, key: ManagedPageKey) {
  // Key chưa từng lưu (vd hub mới thêm) mặc định là bật.
  return config.pages?.[key] !== false;
}
