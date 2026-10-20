// Các trang Portfolio cố định. "smt" = Mẫu báo cáo SMT (/tai-lieu-ky-thuat/smt-reports),
// "handbook" = Sổ tay SMT (/tai-lieu-ky-thuat/so-tay).
export type PortfolioPageKey = "overview" | "journey" | "projects" | "showcase" | "docs" | "smt" | "handbook";

// Mỗi Project Hub có key riêng dạng "hub:<slug>" (vd "hub:joy"), sinh tự động từ thư mục hub.
export type HubPageKey = `hub:${string}`;

export type ManagedPageKey = PortfolioPageKey | HubPageKey;

export const PORTFOLIO_PAGE_KEYS: PortfolioPageKey[] = ["overview", "journey", "projects", "showcase", "docs", "smt", "handbook"];

export type SiteVisibilityConfig = {
  schemaVersion: number;
  pages: Record<string, boolean>;
};

export function isPageEnabled(config: SiteVisibilityConfig, key: ManagedPageKey) {
  // Key chưa từng lưu (vd hub mới thêm) mặc định là bật.
  return config.pages?.[key] !== false;
}
