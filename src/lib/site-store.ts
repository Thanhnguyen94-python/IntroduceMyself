import { promises as fs } from "fs";
import path from "path";
import type { SiteData } from "@/lib/content/types";
import { normalizeSiteData } from "@/lib/content/normalizers";

const sitePath = path.join(process.cwd(), "src", "content", "pages", "site.json");

export async function readSiteData(): Promise<SiteData> {
  const raw = await fs.readFile(sitePath, "utf-8");
  const parsed = JSON.parse(raw) as SiteData;
  return normalizeSiteData(parsed);
}

export async function writeSiteData(input: SiteData): Promise<SiteData> {
  const normalized = normalizeSiteData(input);
  await fs.writeFile(sitePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return normalized;
}
