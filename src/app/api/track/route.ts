import { NextResponse } from "next/server";
import { insertRow, updateRows } from "@/lib/data/table-store";
import { getRequestInfo } from "@/lib/analytics/request-info";
import { cleanText, clientFingerprint, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const ID = /^[a-zA-Z0-9-]{8,64}$/;

function referrerHost(referrer: string, selfHost: string) {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host && host !== selfHost ? host.slice(0, 80) : null;
  } catch {
    return null;
  }
}

// POST {type:"view", ...} -> ghi 1 lượt xem, trả id. POST {type:"ping", id, visitorId, duration} -> cập nhật thời gian ở lại.
// Body gửi bằng navigator.sendBeacon nên đọc dạng text rồi parse.
export async function POST(request: Request) {
  const body = (await request
    .text()
    .then((t) => JSON.parse(t))
    .catch(() => null)) as Record<string, unknown> | null;
  if (!body) return new NextResponse(null, { status: 204 });

  const info = getRequestInfo(request);
  if (info.isBot) return new NextResponse(null, { status: 204 });
  if (!rateLimit(`track:${clientFingerprint(request)}`, 120, 60_000)) return new NextResponse(null, { status: 204 });

  const visitorId = cleanText(body.visitorId, 64);
  if (!ID.test(visitorId)) return new NextResponse(null, { status: 204 });

  try {
    if (body.type === "ping") {
      const id = cleanText(body.id, 64);
      const duration = Math.min(4 * 3600, Math.max(0, Math.round(Number(body.duration) || 0)));
      // Chỉ cập nhật dòng của đúng khách đó (không sửa được lượt xem của người khác).
      if (ID.test(id)) await updateRows("analytics_visits", { id, visitor_id: visitorId }, { duration_sec: duration, last_seen_at: new Date().toISOString() });
      return new NextResponse(null, { status: 204 });
    }

    const path = cleanText(body.path, 300);
    if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return new NextResponse(null, { status: 204 });
    const selfHost = new URL(request.url).hostname.replace(/^www\./, "");
    const hub = cleanText(body.hub, 40) || null;

    const row = await insertRow("analytics_visits", {
      visitor_id: visitorId,
      session_id: cleanText(body.sessionId, 64) || "nosession",
      path,
      hub,
      referrer_host: referrerHost(String(body.referrer ?? ""), selfHost),
      utm_source: cleanText(body.utmSource, 60) || null,
      utm_medium: cleanText(body.utmMedium, 60) || null,
      utm_campaign: cleanText(body.utmCampaign, 80) || null,
      country: info.country,
      region: info.region,
      city: info.city,
      device: info.device,
      browser: info.browser,
      os: info.os,
      language: cleanText(body.language, 16) || null,
      screen: cleanText(body.screen, 16) || null,
      timezone: cleanText(body.timezone, 48) || null,
      is_new_visitor: body.isNew === true,
      duration_sec: 0,
      last_seen_at: new Date().toISOString()
    });
    return NextResponse.json({ id: row.id });
  } catch (error) {
    // Thống kê không bao giờ được làm hỏng trang của khách.
    console.error("[track] failed", error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 204 });
  }
}
