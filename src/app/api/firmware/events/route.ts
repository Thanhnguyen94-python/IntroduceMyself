import { NextResponse } from "next/server";
import { recordFlashEvent } from "@/lib/analytics/flash-events";
import { cleanText, clientFingerprint, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EVENTS = new Set(["started", "success", "error"]);

// Trình duyệt báo kết quả nạp (bắt đầu ghi / thành công / lỗi). "manifest" do server tự ghi.
export async function POST(request: Request) {
  if (!rateLimit(`flash:${clientFingerprint(request)}`, 30, 10 * 60_000)) return new NextResponse(null, { status: 204 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const event = cleanText(body?.event, 16);
  const releaseKey = cleanText(body?.releaseKey, 80);
  // "manifest" từ trình duyệt chỉ nhận cho manifest tĩnh (bản phát hành thì server tự đếm khi tải manifest).
  const allowed = EVENTS.has(event) || (event === "manifest" && releaseKey.startsWith("static:"));
  if (!body || !allowed || !/^[a-zA-Z0-9:_-]{3,80}$/.test(releaseKey)) return new NextResponse(null, { status: 204 });

  await recordFlashEvent(request, {
    releaseKey,
    board: cleanText(body.board, 60) || null,
    version: cleanText(body.version, 40) || null,
    hub: cleanText(body.hub, 40) || null,
    event: event as "manifest" | "started" | "success" | "error",
    erase: typeof body.erase === "boolean" ? body.erase : null,
    errorMessage: cleanText(body.errorMessage, 300) || null,
    visitorId: cleanText(body.visitorId, 64) || null
  });
  return new NextResponse(null, { status: 204 });
}
