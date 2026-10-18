"use client";

import Script from "next/script";
import { createElement } from "react";

// ESP Web Tools: nạp firmware qua Web Serial (Chrome/Edge trên máy tính, trang chạy HTTPS hoặc localhost).
// Thư viện tự xử lý: chọn cổng COM, nhận chip, xoá flash (tuỳ chọn), ghi các part theo manifest.
const ESP_WEB_TOOLS = "https://unpkg.com/esp-web-tools@10.4.0/dist/web/install-button.js?module";

export function EspInstallButton({ manifest, label }: { manifest: string; label: string }) {
  return (
    <>
      <Script src={ESP_WEB_TOOLS} type="module" strategy="afterInteractive" />
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
    </>
  );
}
