"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FirmwareReleaseView } from "@/lib/firmware-store";
import { formatBytes } from "@/lib/firmware-image";
import { useLanguage } from "@/components/providers/language-provider";
import { EspInstallButton } from "@/components/hub/esp-install-button";

type Props = {
  hubSlug: string;
  hubName: string;
  board: string;
  chip: string;
  fallbackManifest?: string;
};

type FallbackState = { status: "idle" | "checking" | "ready" | "missing"; version?: string };

// Một lựa chọn để nạp: bản phát hành từ Supabase hoặc manifest tĩnh (public/firmware/<hub>/manifest.json).
type FlashOption =
  | { kind: "release"; id: string; manifest: string; release: FirmwareReleaseView }
  | { kind: "static"; id: "static"; manifest: string };

export function HubFlasher({ hubSlug, hubName, board, chip, fallbackManifest }: Props) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const [releases, setReleases] = useState<FirmwareReleaseView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [serialSupported, setSerialSupported] = useState(true);
  const [isHttps, setIsHttps] = useState(true);
  const [fallback, setFallback] = useState<FallbackState>({ status: "idle" });

  useEffect(() => {
    setSerialSupported(typeof navigator !== "undefined" && "serial" in navigator);
    setIsHttps(window.isSecureContext);
    fetch(`/api/firmware?board=${encodeURIComponent(board)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { items?: FirmwareReleaseView[] }) => {
        const list = (data.items ?? []).filter((it) => it.can_flash);
        setReleases(list);
        const firstStable = list.find((it) => it.channel === "stable") ?? list[0];
        if (firstStable) setSelectedId(firstStable.id);
      })
      .catch(() => setReleases([]))
      .finally(() => setLoading(false));
  }, [board]);

  // Chưa có bản phát hành nào -> thử manifest tĩnh, kiểm tra file .bin có thật không trước khi cho bấm nạp.
  useEffect(() => {
    if (loading || releases.length > 0 || !fallbackManifest) return;
    setFallback({ status: "checking" });
    (async () => {
      try {
        const res = await fetch(fallbackManifest, { cache: "no-store" });
        if (!res.ok) throw new Error("manifest");
        const manifest = (await res.json()) as { version?: string; builds?: Array<{ parts?: Array<{ path: string }> }> };
        const firstPart = manifest.builds?.[0]?.parts?.[0]?.path;
        if (!firstPart) throw new Error("parts");
        const partUrl = new URL(firstPart, new URL(fallbackManifest, window.location.href)).toString();
        const head = await fetch(partUrl, { method: "HEAD", cache: "no-store" });
        setFallback({ status: head.ok ? "ready" : "missing", version: manifest.version });
        if (head.ok) setSelectedId("static");
      } catch {
        setFallback({ status: "missing" });
      }
    })();
  }, [loading, releases.length, fallbackManifest]);

  const options: FlashOption[] = useMemo(() => {
    const list: FlashOption[] = releases.map((release) => ({
      kind: "release",
      id: release.id,
      manifest: `/api/firmware/manifest/${release.id}`,
      release
    }));
    if (!list.length && fallbackManifest && fallback.status === "ready") {
      list.push({ kind: "static", id: "static", manifest: fallbackManifest });
    }
    return list;
  }, [releases, fallbackManifest, fallback.status]);

  const selected = options.find((it) => it.id === selectedId) ?? null;
  const selectedRelease = selected?.kind === "release" ? selected.release : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        {/* Bước 1-2-3 trực quan */}
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: "🔌", title: vi ? "Cắm cáp USB" : "Plug in USB", text: vi ? "Dùng cáp có dây dữ liệu, cắm cổng USB của ESP32-S3." : "Use a data-capable cable on the ESP32-S3 USB port." },
            { icon: "⚡", title: vi ? "Bấm Nạp firmware" : "Click Flash", text: vi ? "Chọn cổng COM trong hộp thoại của trình duyệt." : "Pick the COM port in the browser dialog." },
            { icon: "📶", title: vi ? "Cài Wi-Fi" : "Set up Wi-Fi", text: vi ? "Quét QR trên màn hình robot để kết nối mạng." : "Scan the QR on the robot screen to join Wi-Fi." }
          ].map((step, idx) => (
            <li key={idx} className="card">
              <p className="text-2xl">{step.icon}</p>
              <p className="mt-2 font-semibold">
                {idx + 1}. {step.title}
              </p>
              <p className="muted mt-1 text-sm">{step.text}</p>
            </li>
          ))}
        </ol>

        <section className="card space-y-4">
          {!serialSupported && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              {vi
                ? "Trình duyệt này không hỗ trợ Web Serial. Hãy mở trang bằng Chrome hoặc Edge trên máy tính (không hỗ trợ điện thoại, Safari, Firefox)."
                : "This browser does not support Web Serial. Please use desktop Chrome or Edge (mobile, Safari and Firefox are not supported)."}
            </p>
          )}
          {!isHttps && (
            <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {vi ? "Web Serial chỉ chạy trên HTTPS hoặc localhost." : "Web Serial only works on HTTPS or localhost."}
            </p>
          )}

          {loading || fallback.status === "checking" ? (
            <div className="space-y-2">
              <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-12 w-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          ) : !selected ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{vi ? "Chưa có bản firmware nào được phát hành." : "No firmware has been released yet."}</p>
              <p className="muted">
                {vi ? "Quay lại sau, hoặc theo dõi trang " : "Check back later, or follow the "}
                <Link href={`/${hubSlug}/updates`} className="text-brand-600 underline">
                  {vi ? "Cập nhật" : "Updates"}
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold">
                  {selectedRelease?.title || hubName}{" "}
                  <span className="text-brand-600 dark:text-brand-300">
                    v{selectedRelease?.version ?? fallback.version ?? "?"}
                  </span>
                </h2>
                <span className="chip">
                  {selectedRelease?.chip ?? chip}
                  {selectedRelease && ` · ${new Date(selectedRelease.updated_at).toLocaleDateString(vi ? "vi-VN" : "en-US")}`}
                </span>
              </div>
              {serialSupported && isHttps && <EspInstallButton manifest={selected.manifest} label={vi ? "Nạp firmware" : "Flash firmware"} />}
              <ul className="muted list-disc space-y-1 pl-5 text-sm">
                <li>
                  <b>{vi ? "Robot mới / lỗi nặng:" : "New board / badly broken:"}</b>{" "}
                  {vi ? "tick “Erase device”: xoá sạch rồi nạp, phải cài lại Wi-Fi." : "tick “Erase device” for a clean install (Wi-Fi must be set up again)."}
                </li>
                <li>
                  <b>{vi ? "Robot đang dùng, chỉ cập nhật:" : "Updating a working robot:"}</b>{" "}
                  {vi ? "không tick xoá: giữ Wi-Fi, mật khẩu WebUI và cài đặt." : "don't erase: Wi-Fi, WebUI password and settings are kept."}
                </li>
                <li>
                  {vi
                    ? "Đóng mọi chương trình đang mở cổng COM (Serial Monitor, idf.py monitor, Arduino IDE…)."
                    : "Close any program holding the COM port (Serial Monitor, idf.py monitor, Arduino IDE…)."}
                </li>
              </ul>
            </>
          )}
        </section>

        {selectedRelease?.notes && (
          <section className="card space-y-2">
            <h3 className="font-semibold">{vi ? "Có gì mới" : "What's new"}</h3>
            <pre className="whitespace-pre-wrap font-sans text-sm">{selectedRelease.notes}</pre>
          </section>
        )}

        {selectedRelease?.app_url && (
          <section className="card space-y-2 text-sm">
            <h3 className="font-semibold">{vi ? "Robot đã có firmware? Cập nhật không cần cáp (OTA)" : "Already flashed? Update over Wi-Fi (OTA)"}</h3>
            <p className="muted">
              {vi
                ? "Mở WebUI của robot → Cài đặt → ⬆️ Cập nhật firmware → Kiểm tra bản mới, hoặc dán link dưới đây vào ô “Cài từ đường link”."
                : "Open the robot WebUI → Settings → ⬆️ Firmware update → Check for updates, or paste this link into “Install from URL”."}
            </p>
            <div className="flex gap-2">
              <input readOnly value={selectedRelease.app_url} className="input text-xs" />
              <button onClick={() => navigator.clipboard.writeText(selectedRelease.app_url)} className="btn-ghost px-3 text-xs">
                Copy
              </button>
            </div>
            <p className="muted text-xs">
              OTA {formatBytes(selectedRelease.app_size)} · SHA-256 {selectedRelease.app_sha256.slice(0, 16)}…
            </p>
          </section>
        )}
      </div>

      <aside className="space-y-4">
        {releases.length > 1 && (
          <section className="card space-y-2">
            <h3 className="text-sm font-semibold">{vi ? "Chọn phiên bản" : "Choose version"}</h3>
            {releases.map((it) => (
              <button
                key={it.id}
                onClick={() => setSelectedId(it.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${selectedId === it.id ? "bg-brand-600 text-white" : "border hover:border-brand-400"}`}
                style={selectedId === it.id ? undefined : { borderColor: "var(--border)" }}
              >
                <span className="font-semibold">v{it.version}</span>
                {it.channel === "beta" && <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">BETA</span>}
                {it.title && <span className="block text-xs opacity-80">{it.title}</span>}
              </button>
            ))}
          </section>
        )}

        <section className="card space-y-2 text-sm">
          <h3 className="font-semibold">{vi ? "Không nạp được?" : "Flashing failed?"}</h3>
          <ul className="muted list-disc space-y-1 pl-5">
            <li>{vi ? "Không thấy cổng COM: đổi cáp USB khác (nhiều cáp chỉ sạc)." : "No COM port: try another cable (many are charge-only)."}</li>
            <li>
              {vi
                ? "“Failed to open serial port”: giữ BOOT, nhấn RESET, thả BOOT rồi thử lại."
                : "“Failed to open serial port”: hold BOOT, tap RESET, release BOOT, retry."}
            </li>
            <li>{vi ? "Nạp xong robot im lặng: mở WebUI kiểm tra cảnh báo dữ liệu giọng nói." : "Robot silent after flashing: check the WebUI for voice-data warnings."}</li>
          </ul>
          <Link href={`/${hubSlug}/docs`} className="inline-block font-semibold text-brand-600 dark:text-brand-300">
            {vi ? "Xem tài liệu sửa lỗi →" : "Troubleshooting docs →"}
          </Link>
        </section>

        {selectedRelease?.wiring_image && (
          <section className="card space-y-2">
            <h3 className="text-sm font-semibold">{vi ? "Sơ đồ đấu nối" : "Wiring diagram"}</h3>
            <a href={selectedRelease.wiring_image} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedRelease.wiring_image} alt="Wiring" className="w-full rounded-lg border" style={{ borderColor: "var(--border)" }} />
            </a>
          </section>
        )}
      </aside>
    </div>
  );
}
