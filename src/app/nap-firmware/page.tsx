"use client";

import Script from "next/script";
import { createElement, useEffect, useMemo, useState } from "react";
import type { FirmwareReleaseView } from "@/lib/firmware-store";
import { formatBytes } from "@/lib/firmware-image";

// ESP Web Tools: nạp firmware qua Web Serial (Chrome/Edge trên máy tính).
const ESP_WEB_TOOLS = "https://unpkg.com/esp-web-tools@10.4.0/dist/web/install-button.js?module";

export default function NapFirmwarePage() {
  const [items, setItems] = useState<FirmwareReleaseView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [serialSupported, setSerialSupported] = useState(true);

  useEffect(() => {
    setSerialSupported(typeof navigator !== "undefined" && "serial" in navigator);
    fetch("/api/firmware", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { items?: FirmwareReleaseView[] }) => {
        const list = data.items ?? [];
        setItems(list);
        const firstStable = list.find((it) => it.channel === "stable") ?? list[0];
        if (firstStable) setSelectedId(firstStable.id);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const boards = useMemo(() => Array.from(new Set(items.map((it) => it.board))), [items]);
  const selected = items.find((it) => it.id === selectedId) ?? null;

  return (
    <section className="space-y-4">
      <Script src={ESP_WEB_TOOLS} type="module" strategy="afterInteractive" />

      <div className="card space-y-1">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Nạp firmware robot Xiaozhi</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Chọn bản firmware, đấu nối theo sơ đồ, cắm robot vào máy tính bằng cáp USB rồi bấm “Nạp firmware”. Không cần cài phần mềm.
        </p>
      </div>

      {loading ? (
        <div className="card text-sm">Đang tải danh sách firmware…</div>
      ) : items.length === 0 ? (
        <div className="card text-sm">Chưa có bản firmware nào được phát hành.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <aside className="card h-fit space-y-3">
            {boards.map((board) => (
              <div key={board} className="space-y-2">
                <div className="text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
                  {board}
                </div>
                {items
                  .filter((it) => it.board === board)
                  .map((it) => (
                    <button
                      key={it.id}
                      onClick={() => setSelectedId(it.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${selectedId === it.id ? "bg-brand-600 text-white" : "border"}`}
                      style={selectedId === it.id ? undefined : { borderColor: "var(--border)" }}
                    >
                      <div className="font-semibold">
                        v{it.version}
                        {it.channel === "beta" && <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">BETA</span>}
                      </div>
                      {it.title && <div className="text-xs opacity-80">{it.title}</div>}
                    </button>
                  ))}
              </div>
            ))}
          </aside>

          {selected && (
            <div className="space-y-4">
              <div className="card space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold">
                    {selected.title || selected.board} <span className="text-brand-600">v{selected.version}</span>
                  </h2>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {selected.chip} · {new Date(selected.updated_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>

                {selected.can_flash ? (
                  serialSupported ? (
                    createElement(
                      "esp-web-install-button",
                      { manifest: `/api/firmware/manifest/${selected.id}`, key: selected.id },
                      <button slot="activate" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                        ⚡ Nạp firmware
                      </button>,
                      <span slot="unsupported" className="text-sm text-red-600">
                        Trình duyệt không hỗ trợ nạp qua USB. Hãy dùng Chrome hoặc Edge trên máy tính.
                      </span>,
                      <span slot="not-allowed" className="text-sm text-red-600">
                        Trang cần chạy qua HTTPS để nạp qua USB.
                      </span>
                    )
                  ) : (
                    <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Trình duyệt này không hỗ trợ nạp qua USB (Web Serial). Hãy mở trang bằng Chrome hoặc Edge trên máy tính.
                    </p>
                  )
                ) : (
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    Bản này chỉ có gói cập nhật OTA (dùng cho robot đã nạp sẵn firmware).
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <h3 className="font-semibold">1. Nạp firmware</h3>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Đóng các chương trình đang mở cổng COM của robot (Serial Monitor, idf.py monitor, Arduino IDE…).</li>
                    <li>Cắm robot vào máy tính bằng cáp USB có dây dữ liệu.</li>
                    <li>
                      Bấm “Nạp firmware” → chọn cổng COM → “Install”.
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        <li>
                          <b>Robot mới / lỗi nặng:</b> tick “Erase device”: xoá sạch rồi nạp, phải cài lại Wi-Fi.
                        </li>
                        <li>
                          <b>Robot đang dùng, chỉ cập nhật:</b> không tick xoá: giữ Wi-Fi, mật khẩu WebUI và cài đặt.
                        </li>
                      </ul>
                    </li>
                    <li>Nếu không thấy cổng hoặc báo “Failed to open serial port”: rút cáp cắm lại; vẫn lỗi thì giữ nút BOOT, nhấn RESET, thả BOOT rồi thử lại.</li>
                  </ol>

                  <h3 className="pt-2 font-semibold">2. Kết nối Wi-Fi (lần đầu hoặc sau khi xoá)</h3>
                  <ol className="list-decimal space-y-1 pl-5">
                    <li>Màn hình robot hiện mã QR “Quet QR de cai Wi-Fi”: mở camera điện thoại quét mã để vào Wi-Fi của robot (tên dạng <code>Xiaozhi-XXXX</code>).</li>
                    <li>Trang cấu hình tự bật lên; nếu không, mở trình duyệt vào <code>http://192.168.4.1</code>.</li>
                    <li>Chọn Wi-Fi nhà bạn, nhập mật khẩu, bấm kết nối. Robot tự thoát chế độ cài đặt và vào mạng.</li>
                    <li>Kết nối xong, màn hình hiện QR của WebUI: quét để mở trang điều khiển robot.</li>
                  </ol>

                  <h3 className="pt-2 font-semibold">3. Gọi robot</h3>
                  <p>
                    Nói từ đánh thức <b>“Hi Joy”</b> (đọc “hai joi”), robot đáp lại thì bắt đầu trò chuyện. Nếu robot không phản hồi, mở WebUI → Cài đặt → Cập nhật firmware: có cảnh báo
                    “dữ liệu giọng nói bị lỗi” thì nạp lại firmware.
                  </p>
                </div>
              </div>

              {(selected.wiring_image || selected.hardware) && (
                <div className="card space-y-3">
                  <h3 className="text-lg font-semibold">Phần cứng & sơ đồ đấu nối</h3>
                  {selected.wiring_image && (
                    <a href={selected.wiring_image} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.wiring_image} alt={`Sơ đồ đấu nối ${selected.board}`} className="w-full rounded-lg border" style={{ borderColor: "var(--border)" }} />
                    </a>
                  )}
                  {selected.hardware && <pre className="whitespace-pre-wrap rounded-lg border p-3 text-sm" style={{ borderColor: "var(--border)" }}>{selected.hardware}</pre>}
                </div>
              )}

              {selected.notes && (
                <div className="card space-y-2">
                  <h3 className="text-lg font-semibold">Có gì mới</h3>
                  <pre className="whitespace-pre-wrap text-sm">{selected.notes}</pre>
                </div>
              )}

              {selected.app_url && (
                <div className="card space-y-2 text-sm">
                  <h3 className="text-lg font-semibold">Robot đã có firmware? Cập nhật không cần cáp</h3>
                  <p>
                    Mở WebUI của robot → <b>Cài đặt</b> → <b>⬆️ Cập nhật firmware</b> → bấm <b>Kiểm tra bản mới</b>, hoặc dán link dưới đây vào ô “Cài từ đường link”.
                  </p>
                  <div className="flex gap-2">
                    <input readOnly value={selected.app_url} className="w-full rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                    <button onClick={() => navigator.clipboard.writeText(selected.app_url)} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white">
                      Copy
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Gói OTA {formatBytes(selected.app_size)} · SHA-256 {selected.app_sha256.slice(0, 16)}…
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
