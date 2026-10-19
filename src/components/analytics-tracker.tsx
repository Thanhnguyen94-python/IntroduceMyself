"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getSessionId, getVisitorId, trackingAllowed } from "@/lib/visitor-id";

// Ghi lượt xem mỗi lần đổi trang + "nhịp tim" 30 giây/lần (thời gian ở lại, trạng thái đang online).
// Không dùng cookie, không lưu IP. Tôn trọng Do Not Track / Global Privacy Control.
export function AnalyticsTracker({ hub }: { hub?: string }) {
  const pathname = usePathname();
  const current = useRef<{ id: string | null; startedAt: number; visibleMs: number; visibleSince: number | null }>({
    id: null,
    startedAt: 0,
    visibleMs: 0,
    visibleSince: null
  });

  useEffect(() => {
    if (!trackingAllowed() || !pathname) return;
    const { id: visitorId, isNew } = getVisitorId();
    if (visitorId === "anonymous") return;
    const state = current.current;

    const seconds = () => Math.round((state.visibleMs + (state.visibleSince ? Date.now() - state.visibleSince : 0)) / 1000);
    const ping = (beacon = false) => {
      if (!state.id) return;
      const payload = JSON.stringify({ type: "ping", id: state.id, visitorId, duration: seconds() });
      if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/track", payload);
      else fetch("/api/track", { method: "POST", body: payload, keepalive: true }).catch(() => undefined);
    };

    // Kết thúc lượt xem trước (nếu có) trước khi bắt đầu lượt mới.
    ping(true);
    state.id = null;
    state.startedAt = Date.now();
    state.visibleMs = 0;
    state.visibleSince = document.visibilityState === "visible" ? Date.now() : null;

    const params = new URLSearchParams(window.location.search);
    let cancelled = false;
    fetch("/api/track", {
      method: "POST",
      body: JSON.stringify({
        type: "view",
        visitorId,
        sessionId: getSessionId(),
        isNew,
        path: pathname,
        hub,
        referrer: document.referrer,
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    })
      .then((res) => (res.status === 200 ? res.json() : null))
      .then((data: { id?: string } | null) => {
        if (!cancelled && data?.id) state.id = data.id;
      })
      .catch(() => undefined);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (state.visibleSince) state.visibleMs += Date.now() - state.visibleSince;
        state.visibleSince = null;
        ping(true);
      } else {
        state.visibleSince = Date.now();
      }
    };
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") ping();
    }, 30_000);
    const onHide = () => ping(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [pathname, hub]);

  return null;
}
