export type ManagedPageKey = "overview" | "journey" | "projects" | "showcase" | "docs";

export type SiteVisibilityConfig = {
  schemaVersion: number;
  pages: Record<ManagedPageKey, boolean>;
};
