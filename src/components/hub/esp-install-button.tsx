"use client";

import Script from "next/script";
import { createElement, useEffect, useRef } from "react";
import { getVisitorId } from "@/lib/visitor-id";

// ESP Web Tools: nạp firmware qua Web Serial (Chrome/Edge trên máy tính, trang chạy HTTPS hoặc localhost).
// Thư viện tự xử lý: chọn cổng COM, nhận chip, xoá flash (tuỳ chọn), ghi các part theo manifest.
const ESP_WEB_TOOLS = "https://unpkg.com/esp-web-tools@10.4.0/dist/web/install-button.js?module";

export type FlashTrackInfo = {
  releaseKey: string; // id bản phát hành, hoặc "static:<hub>"
  board?: string;
  version?: string;
  hub?: string;
};

type DialogState = { state?: string; message?: string; details?: { error?: string; details?: string } };
type InstallDialog = HTMLElement & { _installState?: DialogState; _installErase?: boolean };

function send(track: FlashTrackInfo, event: string, extra: Record<string, unknown> = {}) {
  const body = JSON.stringify({ ...track, event, visitorId: getVisitorId().id, ...extra });
  fetch("/api/firmware/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

// Hộp thoại nạp (ewt-install-dialog) không phát sự kiện ra ngoài, nhưng giữ trạng thái ở _installState:
// preparing -> erasing -> writing -> finished | error. Đọc định kỳ để đếm bắt đầu / thành công / lỗi.
function watchInstallDialog(track: FlashTrackInfo) {
  const sent = new Set<string>();
  let seenDialog = false;
  const startedAt = Date.now();

  const timer = window.setInterval(() => {
    const dialog = document.querySelector("ewt-install-dialog") as InstallDialog | null;
    if (!dialog) {
      // Người dùng đóng hộp chọn cổng hoặc đóng hộp thoại -> dừng theo dõi.
      if (seenDialog || Date.now() - startedAt > 60_000) window.clearInterval(timer);
      return;
    }
    seenDialog = true;
    const state = dialog._installState?.state;
    if (!state) return;
    if ((state === "erasing" || state === "writing") && !sent.has("started")) {
      sent.add("started");
      send(track, "started", { erase: Boolean(dialog._installErase) });
    }
    if (state === "finished" && !sent.has("success")) {
      sent.add("success");
      send(track, "success");
      window.clearInterval(timer);
    }
    if (state === "error" && !sent.has("error")) {
      sent.add("error");
      const info = dialog._installState;
      send(track, "error", { errorMessage: [info?.message, info?.details?.error].filter(Boolean).join(" | ") });
      window.clearInterval(timer);
    }
    if (Date.now() - startedAt > 30 * 60_000) window.clearInterval(timer);
  }, 500);
  return () => window.clearInterval(timer);
}

export function EspInstallButton({ manifest, label, track }: { manifest: string; label: string; track?: FlashTrackInfo }) {
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  return (
    <>
      <Script src={ESP_WEB_TOOLS} type="module" strategy="afterInteractive" />
      <div
        className="inline-block"
        onClickCapture={() => {
          if (!track) return;
          stopRef.current?.();
          stopRef.current = watchInstallDialog(track);
          if (track.releaseKey.startsWith("static:")) send(track, "manifest");
        }}
      >
        {createElement(
          "esp-web-install-button",
          { manifest, key: manifest },
          <button slot="activate" className="btn-primary px-6 py-3 text-base">
            ⚡ {label}
          </button>,
          <span slot="unsupported" className="text-sm text-red-600">
            Trình duyệt không hỗ trợ nạp qua USB. Hãy dùng Chrome hoặc Edge trên máy tính.
          </span>,
          <span slot="not-allowed" className="text-sm text-red-600">
            Trang cần chạy qua HTTPS để nạp qua USB.
          </span>
        )}
      </div>
    </>
  );
}
