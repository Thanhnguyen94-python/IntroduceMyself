import { NextResponse } from "next/server";
import { compareVersions, getLatestFirmware, type FirmwareChannel } from "@/lib/firmware-store";

export const dynamic = "force-dynamic";

// WebUI của robot (chạy trong LAN, khác origin) gọi API này để hỏi có bản mới không:
//   GET /api/firmware/latest?board=bread-compact-wifi&current=2.2.6&channel=stable
// Nếu có, WebUI gửi "url" cho robot cài qua /api/ota/url.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const board = params.get("board")?.trim() || "bread-compact-wifi";
  const current = params.get("current")?.trim() || "";
  const channel: FirmwareChannel = params.get("channel") === "beta" ? "beta" : "stable";

  try {
    const latest = await getLatestFirmware(board, channel);
    if (!latest) {
      return NextResponse.json({ ok: true, board, channel, update_available: false }, { headers: CORS_HEADERS });
    }
    return NextResponse.json(
      {
        ok: true,
        board,
        channel,
        version: latest.version,
        title: latest.title,
        notes: latest.notes,
        url: latest.app_url,
        size: latest.app_size,
        sha256: latest.app_sha256,
        published_at: latest.updated_at,
        update_available: current ? compareVersions(latest.version, current) > 0 : true
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot check firmware.";
    return NextResponse.json({ ok: false, message }, { status: 500, headers: CORS_HEADERS });
  }
}
