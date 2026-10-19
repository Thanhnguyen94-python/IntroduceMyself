"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FirmwareReleaseView } from "@/lib/firmware-store";
import type { FirmwareStat } from "@/lib/analytics/summary";
import { formatBytes, parseAppImage, parseMergedImage, sha256Hex, splitMergedImage, type FlashPart } from "@/lib/firmware-image";

type Draft = {
  id?: string;
  board: string;
  chip: string;
  version: string;
  channel: "stable" | "beta";
  title: string;
  notes: string;
  hardware: string;
  wiring_image: string;
  is_published: boolean;
};

type PendingFile = {
  file: File;
  bytes: Uint8Array;
  info: string;
  version: string;
  sha256: string;
  parts?: FlashPart[];
};

type Notice = { type: "success" | "error"; text: string } | null;

const BOARDS = ["bread-compact-wifi"];
const inputClass = "w-full rounded-lg border px-3 py-2 text-sm";
const inputStyle = { borderColor: "var(--border)", background: "var(--surface)" };

function emptyDraft(): Draft {
  return {
    board: BOARDS[0],
    chip: "ESP32-S3",
    version: "",
    channel: "stable",
    title: "",
    notes: "",
    hardware: "",
    wiring_image: "",
    is_published: false
  };
}

// Upload thẳng lên Supabase Storage bằng signed URL (không qua server Vercel).
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`)));
    xhr.onerror = () => reject(new Error("Lỗi mạng khi upload"));
    xhr.send(file);
  });
}

async function uploadFile(kind: "app" | "merged" | "part" | "wiring", draft: Draft, file: File, onProgress: (pct: number) => void) {
  const res = await fetch("/api/admin/firmware/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, board: draft.board, version: draft.version, fileName: file.name })
  });
  const data = (await res.json().catch(() => ({}))) as { path?: string; signedUrl?: string; publicUrl?: string; message?: string };
  if (!res.ok || !data.signedUrl || !data.path) throw new Error(data.message || "Không tạo được link upload");
  await putWithProgress(data.signedUrl, file, onProgress);
  return { path: data.path, publicUrl: data.publicUrl ?? "" };
}

async function readBinary(file: File, kind: "app" | "merged"): Promise<PendingFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = kind === "app" ? parseAppImage(bytes) : parseMergedImage(bytes);
  if (!info) {
    throw new Error(
      kind === "app"
        ? "Không phải file app ESP32 (cần build/xiaozhi.bin, không phải file merged/bootloader)."
        : "Không phải file merged (cần file nạp ở offset 0, có bootloader + partition table + app)."
    );
  }
  const parts = kind === "merged" ? splitMergedImage(bytes) ?? undefined : undefined;
  const partsInfo = parts ? ` · tách ${parts.length} phần: ${parts.map((p) => `${p.name}@0x${p.offset.toString(16)}`).join(", ")}` : "";
  return {
    file,
    bytes,
    parts,
    version: info.version,
    sha256: await sha256Hex(bytes),
    info: `${info.project} v${info.version} · IDF ${info.idf} · build ${info.built} · ${formatBytes(file.size)}${partsInfo}`
  };
}

export function FirmwareAdmin() {
  const [items, setItems] = useState<FirmwareReleaseView[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [appFile, setAppFile] = useState<PendingFile | null>(null);
  const [mergedFile, setMergedFile] = useState<PendingFile | null>(null);
  const [wiringFile, setWiringFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [stats, setStats] = useState<Record<string, FirmwareStat>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/firmware", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { items?: FirmwareReleaseView[]; message?: string };
    if (res.ok) setItems(data.items ?? []);
    else setNotice({ type: "error", text: data.message || "Không tải được danh sách firmware" });
    setLoading(false);
    // Số lần nạp theo từng bản (Admin → Thống kê có thêm chi tiết lỗi).
    fetch("/api/admin/firmware/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((payload: { items?: FirmwareStat[] }) => setStats(Object.fromEntries((payload.items ?? []).map((it) => [it.releaseKey, it]))))
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  function openEditor(item?: FirmwareReleaseView) {
    setAppFile(null);
    setMergedFile(null);
    setWiringFile(null);
    setProgress("");
    setDraft(
      item
        ? {
            id: item.id,
            board: item.board,
            chip: item.chip,
            version: item.version,
            channel: item.channel,
            title: item.title,
            notes: item.notes,
            hardware: item.hardware,
            wiring_image: item.wiring_image,
            is_published: item.is_published
          }
        : emptyDraft()
    );
  }

  async function pickBinary(kind: "app" | "merged", file: File) {
    try {
      const parsed = await readBinary(file, kind);
      if (kind === "app") setAppFile(parsed);
      else setMergedFile(parsed);
      setDraft((d) => (d && !d.version ? { ...d, version: parsed.version } : d));
      setNotice(null);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : String(error) });
    }
  }

  async function save() {
    if (!draft) return;
    const existing = items.find((it) => it.id === draft.id);
    if (!draft.version.trim()) {
      setNotice({ type: "error", text: "Cần nhập số phiên bản." });
      return;
    }
    for (const f of [appFile, mergedFile]) {
      if (f && f.version !== draft.version.trim()) {
        setNotice({ type: "error", text: `File ${f.file.name} là bản ${f.version}, khác số phiên bản ${draft.version}.` });
        return;
      }
    }
    if (draft.is_published && !appFile && !existing?.app_path) {
      setNotice({ type: "error", text: "Muốn publish cần có file app (xiaozhi.bin) cho OTA." });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const body: Record<string, unknown> = { ...draft, version: draft.version.trim() };
      if (appFile) {
        const up = await uploadFile("app", draft, appFile.file, (p) => setProgress(`Đang tải file app… ${p}%`));
        Object.assign(body, { app_path: up.path, app_size: appFile.file.size, app_sha256: appFile.sha256 });
      }
      if (mergedFile) {
        const up = await uploadFile("merged", draft, mergedFile.file, (p) => setProgress(`Đang tải file merged… ${p}%`));
        Object.assign(body, { merged_path: up.path, merged_size: mergedFile.file.size });
        // Các phần tách ra dùng cho trang nạp online (không ghi đè NVS, bỏ vùng trống).
        const flashParts: Array<{ path: string; offset: number; size: number }> = [];
        for (const [index, part] of (mergedFile.parts ?? []).entries()) {
          const partFile = new File([part.bytes], `${part.name}.bin`, { type: "application/octet-stream" });
          const label = `Đang tải phần ${index + 1}/${mergedFile.parts?.length} (${part.name})…`;
          const upPart = await uploadFile("part", draft, partFile, (p) => setProgress(`${label} ${p}%`));
          flashParts.push({ path: upPart.path, offset: part.offset, size: part.bytes.length });
        }
        body.flash_parts = flashParts;
      }
      if (wiringFile) {
        const up = await uploadFile("wiring", draft, wiringFile, (p) => setProgress(`Đang tải sơ đồ… ${p}%`));
        body.wiring_image = up.publicUrl;
      }
      setProgress("Đang lưu…");
      const res = await fetch("/api/admin/firmware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Lưu thất bại");
      setNotice({ type: "success", text: `Đã lưu firmware ${draft.version}` });
      setDraft(null);
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
      setProgress("");
    }
  }

  async function togglePublish(item: FirmwareReleaseView) {
    if (!item.is_published && !item.app_path) {
      setNotice({ type: "error", text: "Bản này chưa có file app nên chưa publish được." });
      return;
    }
    const res = await fetch("/api/admin/firmware", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_published: !item.is_published })
    });
    if (res.ok) await load();
  }

  async function remove(item: FirmwareReleaseView) {
    if (!window.confirm(`Xoá firmware ${item.version} (${item.channel}) và các file của nó?`)) return;
    const res = await fetch("/api/admin/firmware", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id })
    });
    if (res.ok) setItems((prev) => prev.filter((it) => it.id !== item.id));
  }

  return (
    <section className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Firmware robot</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Lưu bản build, sơ đồ đấu nối, publish cho trang nạp online và cho robot tự kiểm tra bản mới.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/joy/flash" target="_blank" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
            Trang nạp công khai (/joy/flash) ↗
          </Link>
          <Link href="/admin/xiaozhi" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
            Xiaozhi MCP
          </Link>
          <Link href="/admin" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
            Dashboard
          </Link>
          <button onClick={() => openEditor()} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
            + Thêm bản mới
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.type === "success" ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Chưa có bản firmware nào. Bấm “+ Thêm bản mới”.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: "var(--muted)" }}>
                <th className="py-2 pr-3">Phiên bản</th>
                <th className="py-2 pr-3">Board</th>
                <th className="py-2 pr-3">File</th>
                <th className="py-2 pr-3">Trạng thái</th>
                <th className="py-2 pr-3" title="Mở hộp thoại / bắt đầu ghi / thành công / lỗi">Lượt nạp</th>
                <th className="py-2 pr-3">Ngày</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t align-top" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2 pr-3">
                    <div className="font-semibold">{item.version}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      {item.channel}
                      {item.title ? ` · ${item.title}` : ""}
                    </div>
                  </td>
                  <td className="py-2 pr-3">{item.board}</td>
                  <td className="py-2 pr-3 text-xs">
                    <div>App (OTA): {item.app_path ? formatBytes(item.app_size) : "—"}</div>
                    <div>
                      Merged (nạp online): {item.merged_path ? formatBytes(item.merged_size) : "—"}
                      {item.merged_path && !item.flash_parts.length && <span className="text-amber-600"> · chưa tách phần, hãy chọn lại file merged</span>}
                    </div>
                    <div>Sơ đồ: {item.wiring_image ? "có" : "—"}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => togglePublish(item)}
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${item.is_published ? "bg-green-600 text-white" : "border"}`}
                      style={item.is_published ? undefined : { borderColor: "var(--border)" }}
                      title="Bấm để bật/tắt publish"
                    >
                      {item.is_published ? "Đã publish" : "Nháp"}
                    </button>
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {stats[item.id] ? (
                      <span className="whitespace-nowrap" title={`Mở hộp thoại ${stats[item.id].opened} · Bắt đầu ghi ${stats[item.id].started} · Thành công ${stats[item.id].success} · Lỗi ${stats[item.id].error}`}>
                        <b className="text-sm">{stats[item.id].success}</b> ✅ · {stats[item.id].error} ❌ · {stats[item.id].opened} mở
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>chưa có</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs">{new Date(item.created_at).toLocaleString("vi-VN")}</td>
                  <td className="py-2 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {item.app_url && (
                        <button
                          onClick={() => navigator.clipboard.writeText(item.app_url)}
                          className="rounded border px-2 py-1 text-xs"
                          style={{ borderColor: "var(--border)" }}
                          title="Dán vào WebUI robot → Cập nhật firmware → Cài từ đường link"
                        >
                          Copy link OTA
                        </button>
                      )}
                      <button onClick={() => openEditor(item)} className="rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--border)" }}>
                        Sửa
                      </button>
                      <button onClick={() => remove(item)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && setDraft(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl space-y-3 overflow-y-auto rounded-xl bg-white p-4 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{draft.id ? `Sửa firmware ${draft.version}` : "Thêm firmware"}</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Board</span>
                <input list="fw-boards" value={draft.board} onChange={(e) => setDraft({ ...draft, board: e.target.value.trim() })} className={inputClass} style={inputStyle} />
                <datalist id="fw-boards">
                  {BOARDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Chip</span>
                <select value={draft.chip} onChange={(e) => setDraft({ ...draft, chip: e.target.value })} className={inputClass} style={inputStyle}>
                  <option>ESP32-S3</option>
                  <option>ESP32-C3</option>
                  <option>ESP32</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Phiên bản (tự điền từ file)</span>
                <input value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} placeholder="2.2.7" className={inputClass} style={inputStyle} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Kênh</span>
                <select value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as Draft["channel"] })} className={inputClass} style={inputStyle}>
                  <option value="stable">stable (khách hàng)</option>
                  <option value="beta">beta (thử nghiệm)</option>
                </select>
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-semibold">Tiêu đề</span>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Robot xiaozhi 2 màn OLED + cảm biến va chạm" className={inputClass} style={inputStyle} />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-semibold">Ghi chú thay đổi</span>
                <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={4} placeholder="- Sửa lỗi…&#10;- Thêm…" className={inputClass} style={inputStyle} />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-semibold">Phần cứng & đấu nối (hiện trên trang nạp)</span>
                <textarea
                  value={draft.hardware}
                  onChange={(e) => setDraft({ ...draft, hardware: e.target.value })}
                  rows={5}
                  placeholder={"ESP32-S3 N16R8\nOLED 0.96\" SDA=41 SCL=42\nCảm biến va chạm trước: GPIO3 …"}
                  className={`${inputClass} font-mono`}
                  style={inputStyle}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <FilePicker
                label="File app (OTA)"
                hint="build/xiaozhi.bin"
                accept=".bin"
                current={appFile?.info ?? (items.find((it) => it.id === draft.id)?.app_path ? "Đã có — chọn file để thay" : "")}
                onPick={(f) => pickBinary("app", f)}
              />
              <FilePicker
                label="File merged (nạp online)"
                hint="idf.py merge-bin → merged-binary.bin"
                accept=".bin"
                current={mergedFile?.info ?? (items.find((it) => it.id === draft.id)?.merged_path ? "Đã có — chọn file để thay" : "")}
                onPick={(f) => pickBinary("merged", f)}
              />
              <FilePicker
                label="Sơ đồ đấu nối"
                hint="Ảnh PNG/JPG/SVG"
                accept="image/*"
                current={wiringFile ? `${wiringFile.name} · ${formatBytes(wiringFile.size)}` : draft.wiring_image ? "Đã có — chọn ảnh để thay" : ""}
                onPick={(f) => setWiringFile(f)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} />
              Publish (hiện trên trang nạp online và robot thấy bản mới)
            </label>

            {progress && <p className="text-sm text-brand-600">{progress}</p>}

            <div className="flex justify-end gap-2">
              <button disabled={saving} onClick={() => setDraft(null)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                Huỷ
              </button>
              <button disabled={saving} onClick={save} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function FilePicker(props: { label: string; hint: string; accept: string; current: string; onPick: (file: File) => void }) {
  return (
    <div className="space-y-1 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
      <div className="font-semibold">{props.label}</div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>
        {props.hint}
      </div>
      <label className="inline-flex cursor-pointer rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white">
        Chọn file
        <input
          type="file"
          accept={props.accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) props.onPick(file);
            e.currentTarget.value = "";
          }}
        />
      </label>
      {props.current && <div className="break-words text-xs">{props.current}</div>}
    </div>
  );
}
