import { NextResponse } from "next/server";
import { hubVisibilityKey, listHubs, toHubSummary } from "@/lib/hubs/registry";
import { readSiteVisibility } from "@/lib/site-visibility-store";
import { isPageEnabled } from "@/lib/site-visibility-types";

export const dynamic = "force-dynamic";

// Danh sách Project Hub.
//   /api/hubs            -> tất cả (Admin dùng để hiện nút bật/tắt)
//   /api/hubs?visible=1  -> chỉ hub đang bật (Portfolio dùng để gắn link sang hub)
export async function GET(request: Request) {
  const onlyVisible = new URL(request.url).searchParams.get("visible") === "1";
  let hubs = await listHubs();
  if (onlyVisible) {
    const visibility = await readSiteVisibility();
    hubs = hubs.filter((hub) => isPageEnabled(visibility, hubVisibilityKey(hub.slug)));
  }
  return NextResponse.json({ items: hubs.map(toHubSummary) });
}
