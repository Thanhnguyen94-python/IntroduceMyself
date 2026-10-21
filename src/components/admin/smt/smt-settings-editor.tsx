"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/admin/fields";
import { MODULE_PRESETS, SMT_MODULES, presetOf, type SmtModule } from "@/lib/smt/modules";
import { SMT_PROCESSES } from "@/lib/smt/types";
import type { SmtSettings } from "@/lib/smt/types";

const pctIn = (v: number) => String(Math.round(v * 10000) / 100);
const pctOut = (s: string) => Math.max(0, Math.min(100, Number(s) || 0)) / 100;

export function SmtSettingsEditor() {
  const [s, setS] = useState<SmtSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/smt/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { settings?: SmtSettings }) => d.settings && setS(d.settings))
      .catch(() => setMessage({ ok: false, text: "Không đọc được cài đặt." }));
  }, []);

  if (!s) return <p className="card muted text-sm">Đang tải…</p>;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/smt/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: s }) });
      const data = (await res.json()) as { settings?: SmtSettings; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Lưu thất bại.");
      if (data.settings) setS(data.settings);
      setMessage({ ok: true, text: "Đã lưu cài đặt." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Lưu thất bại." });
    } finally {
      setSaving(false);
    }
  }

  const setTarget = (k: keyof SmtSettings["targets"], v: number) => setS({ ...s, targets: { ...s.targets, [k]: v } });
  const preset = presetOf(s.modules);
  // Giữ ít nhất 1 nhóm (bỏ hết thì /smt không còn gì để hiện).
  const toggleModule = (id: SmtModule) => {
    const next = s.modules.includes(id) ? s.modules.filter((x) => x !== id) : [...s.modules, id];
    if (next.length) setS({ ...s, modules: next });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">⚙️ Cài đặt SMT</h1>
          <p className="muted text-sm">Line & trạm, ca, danh mục lỗi, mục tiêu KPI và dữ liệu hiển thị công khai.</p>
        </div>
        <button type="button" className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Đang lưu…" : "💾 Lưu cài đặt"}
        </button>
      </div>
      {message && <p className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>}

      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <h2 className="font-semibold sm:col-span-2 lg:col-span-3">Chung & trang công khai</h2>
        <Field label="Tên đơn vị (in trên báo cáo)">
          <input className="input" value={s.company} onChange={(e) => setS({ ...s, company: e.target.value })} />
        </Field>
        <Field label="Dữ liệu trên trang công khai" hint="Demo = số liệu mô phỏng. Thực tế = số liệu thật đã bỏ ghi chú / work order; 8D & 4M chỉ hiện bản ghi bật “Công khai”.">
          <select className="input" value={s.publicSource} onChange={(e) => setS({ ...s, publicSource: e.target.value as SmtSettings["publicSource"] })}>
            <option value="demo">Demo (an toàn, mặc định)</option>
            <option value="live">Thực tế (đã ẩn thông tin nhạy cảm)</option>
          </select>
        </Field>
        <Field label="Số ngày hiển thị công khai">
          <input type="number" min={7} max={180} className="input" value={s.publicDays} onChange={(e) => setS({ ...s, publicDays: Number(e.target.value) })} />
        </Field>
        <Field label="Ca làm việc" hint="Cách nhau bởi dấu phẩy">
          <input className="input" value={s.shifts.join(", ")} onChange={(e) => setS({ ...s, shifts: e.target.value.split(",").map((x) => x.trim()) })} />
        </Field>
      </div>

      <div id="pham-vi" className="card scroll-mt-24 space-y-3">
        <div>
          <h2 className="font-semibold">Phạm vi quản lý (nội dung hiện trên /smt)</h2>
          <p className="muted text-sm">Chỉ hiện nhóm số liệu bạn thực sự có, để báo cáo không bị trống / lủng. Ẩn chỉ là ẩn hiển thị: dữ liệu đã nhập vẫn giữ, bật lại là thấy đủ. Áp dụng cho mọi người xem /smt.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mẫu chọn nhanh">
          {MODULE_PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => setS({ ...s, modules: p.modules })} className={`chip ${preset === p.id ? "!border-brand-500 bg-brand-50 font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-200" : ""}`}>
              {p.vi}
            </button>
          ))}
          {preset === "custom" && <span className="chip !border-brand-500 font-semibold">Tuỳ chỉnh</span>}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {SMT_MODULES.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
              <input type="checkbox" className="mt-1" checked={s.modules.includes(m.id)} onChange={() => toggleModule(m.id)} />
              <span>
                <b>
                  {m.icon} {m.vi}
                </b>
                <span className="muted block text-xs">{m.desc}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={s.modulesInDemo} onChange={(e) => setS({ ...s, modulesInDemo: e.target.checked })} />
          <span>
            Áp dụng cả khi xem <b>Demo</b>
            <span className="muted block text-xs">Tắt (mặc định): Demo luôn hiện đầy đủ để giới thiệu. Bật: xem trước trang thật của bạn trông thế nào với dữ liệu demo.</span>
          </span>
        </label>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <h2 className="font-semibold sm:col-span-2 lg:col-span-5">Mục tiêu KPI</h2>
        <Field label="OEE (%)">
          <input type="number" step="0.1" className="input" value={pctIn(s.targets.oee)} onChange={(e) => setTarget("oee", pctOut(e.target.value))} />
        </Field>
        <Field label="Availability (%)">
          <input type="number" step="0.1" className="input" value={pctIn(s.targets.availability)} onChange={(e) => setTarget("availability", pctOut(e.target.value))} />
        </Field>
        <Field label="FPY (%)">
          <input type="number" step="0.1" className="input" value={pctIn(s.targets.fpy)} onChange={(e) => setTarget("fpy", pctOut(e.target.value))} />
        </Field>
        <Field label="DPMO tối đa">
          <input type="number" className="input" value={s.targets.dpmo} onChange={(e) => setTarget("dpmo", Number(e.target.value))} />
        </Field>
        <Field label="Mispick tối đa (%)">
          <input type="number" step="0.01" className="input" value={pctIn(s.targets.mispickRate)} onChange={(e) => setTarget("mispickRate", pctOut(e.target.value))} />
        </Field>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Line, trạm & takt time</h2>
          <button type="button" className="text-sm font-semibold text-brand-600 dark:text-brand-300" onClick={() => setS({ ...s, lines: [...s.lines, { code: `L${s.lines.length + 1}`, name: "", stations: ["Printer", "SPI", "Mounter", "Reflow", "AOI"], taktSec: 30 }] })}>
            + Thêm line
          </button>
        </div>
        {s.lines.map((l, i) => {
          const update = (patch: Partial<typeof l>) => setS({ ...s, lines: s.lines.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[90px_1fr_100px_auto] sm:items-end" style={{ borderColor: "var(--border)" }}>
              <Field label="Mã">
                <input className="input font-mono" value={l.code} onChange={(e) => update({ code: e.target.value })} />
              </Field>
              <Field label="Tên line">
                <input className="input" value={l.name} onChange={(e) => update({ name: e.target.value })} />
              </Field>
              <Field label="Takt (s)">
                <input type="number" step="0.1" className="input" value={l.taktSec} onChange={(e) => update({ taktSec: Number(e.target.value) })} />
              </Field>
              <button type="button" className="mb-2 text-sm text-red-600" onClick={() => window.confirm(`Xoá line ${l.code}? Dữ liệu cũ vẫn giữ nguyên.`) && setS({ ...s, lines: s.lines.filter((_, j) => j !== i) })}>
                Xoá
              </button>
              <Field label="Các trạm theo thứ tự (cách nhau bởi dấu phẩy)" className="sm:col-span-4" hint="Tên trạm phải khớp với cột “Trạm” trong Cycle time trạm.">
                <input className="input" value={l.stations.join(", ")} onChange={(e) => update({ stations: e.target.value.split(",").map((x) => x.trim()) })} />
              </Field>
            </div>
          );
        })}
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Danh mục lỗi ({s.defectCatalog.length})</h2>
          <button type="button" className="text-sm font-semibold text-brand-600 dark:text-brand-300" onClick={() => setS({ ...s, defectCatalog: [...s.defectCatalog, { code: "", vi: "", en: "", process: "other" }] })}>
            + Thêm mã lỗi
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="muted text-left text-xs">
                <th className="py-1 pr-2">Mã</th>
                <th className="py-1 pr-2">Tên (VI)</th>
                <th className="py-1 pr-2">Name (EN)</th>
                <th className="py-1 pr-2">Công đoạn</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {s.defectCatalog.map((d, i) => {
                const update = (patch: Partial<typeof d>) => setS({ ...s, defectCatalog: s.defectCatalog.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <input className="input w-24 font-mono" value={d.code} onChange={(e) => update({ code: e.target.value.toUpperCase() })} />
                    </td>
                    <td className="py-1 pr-2">
                      <input className="input" value={d.vi} onChange={(e) => update({ vi: e.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <input className="input" value={d.en} onChange={(e) => update({ en: e.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <select className="input" value={d.process} onChange={(e) => update({ process: e.target.value as typeof d.process })}>
                        {SMT_PROCESSES.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.vi}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <button type="button" className="text-sm text-red-600" aria-label={`Xoá ${d.code}`} onClick={() => setS({ ...s, defectCatalog: s.defectCatalog.filter((_, j) => j !== i) })}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
