"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Field } from "@/components/admin/fields";
import { DATASETS, TABULAR_DATASETS, type DatasetKey, type FieldDef } from "@/lib/smt/datasets";
import { oeeOf } from "@/lib/smt/metrics";
import { addDays, dmy, pct, todayVn } from "@/lib/smt/types";
import type { ProductionLog, SmtSettings } from "@/lib/smt/types";
import { datasetSheet } from "@/lib/smt/workbooks";
import { downloadXlsx } from "@/lib/smt/xlsx";

type Row = Record<string, unknown> & { id: string };
type Option = { value: string; label: string };

// Nhập / sửa / xoá dữ liệu 1 bộ (nhật ký sản xuất, lỗi, cycle time, 4M, feeder...).
// Định nghĩa cột lấy từ lib/smt/datasets.ts nên form, bảng, mẫu Excel và API luôn khớp nhau.
export function DatasetManager({ dataset }: { dataset: DatasetKey }) {
  const def = DATASETS[dataset];
  const fields = def.fields.filter((f) => f.type !== "json");
  const hasDate = dataset !== "assets";
  const hasLine = fields.some((f) => f.key === "line");

  const [settings, setSettings] = useState<SmtSettings | null>(null);
  const [assets, setAssets] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [from, setFrom] = useState(addDays(todayVn(), -29));
  const [to, setTo] = useState(todayVn());
  const [line, setLine] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [paste, setPaste] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/smt/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { settings?: SmtSettings }) => d.settings && setSettings(d.settings))
      .catch(() => undefined);
    if (dataset === "asset-logs")
      fetch("/api/admin/smt/data/assets", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { items?: Row[] }) => setAssets(d.items ?? []))
        .catch(() => undefined);
  }, [dataset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams();
    if (hasDate) {
      qs.set("from", from);
      qs.set("to", to);
    }
    if (line) qs.set("line", line);
    try {
      const res = await fetch(`/api/admin/smt/data/${dataset}?${qs}`, { cache: "no-store" });
      const data = (await res.json()) as { items?: Row[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không đọc được dữ liệu.");
      setRows(data.items ?? []);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [dataset, from, to, line, hasDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const options = useCallback(
    (f: FieldDef): Option[] => {
      if (f.options) return f.options;
      if (f.source === "line") return (settings?.lines ?? []).map((l) => ({ value: l.code, label: `${l.code} – ${l.name}` }));
      if (f.source === "shift") return (settings?.shifts ?? []).map((s) => ({ value: s, label: s }));
      if (f.source === "defect") return (settings?.defectCatalog ?? []).map((d) => ({ value: d.code, label: `${d.code} – ${d.vi}` }));
      if (f.source === "asset") return assets.map((a) => ({ value: a.id, label: `${a.code} (${a.asset_type} ${a.spec})` }));
      return [];
    },
    [settings, assets]
  );

  const display = (f: FieldDef, value: unknown) => {
    if (f.type === "bool") return value ? "✔" : "";
    if (f.type === "date") return dmy(String(value ?? ""));
    if (f.type === "number" || f.type === "int") return Number(value ?? 0).toLocaleString("vi-VN");
    if (f.source === "asset") return String(assets.find((a) => a.id === value)?.code ?? value ?? "");
    const opt = f.options?.find((o) => o.value === value);
    return opt ? opt.label : String(value ?? "");
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => fields.some((f) => display(f, r[f.key]).toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, assets]);

  function blankForm(keep?: Record<string, unknown>) {
    const next: Record<string, unknown> = {};
    for (const f of fields) next[f.key] = f.defaultValue ? f.defaultValue() : f.type === "bool" ? false : "";
    // "Lưu & nhập tiếp": giữ lại ngày / ca / line / model để nhập nhanh nhiều dòng.
    if (keep) for (const k of ["log_date", "measured_on", "change_date", "shift", "line", "model", "asset_id", "station"]) if (k in keep && k in next) next[k] = keep[k];
    return next;
  }

  async function save(again: boolean) {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const { id, ...data } = form as Row;
      const res = await fetch(`/api/admin/smt/data/${dataset}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id, ...data } : { row: data })
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(payload.message ?? "Lưu thất bại.");
      setNotice(id ? "Đã cập nhật." : "Đã thêm 1 dòng.");
      setForm(again && !id ? blankForm(form) : null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(ids: string[]) {
    if (!ids.length || !window.confirm(`Xoá ${ids.length} dòng? Không hoàn tác được.`)) return;
    const qs = new URLSearchParams();
    ids.forEach((id) => qs.append("id", id));
    const res = await fetch(`/api/admin/smt/data/${dataset}?${qs}`, { method: "DELETE" });
    const payload = (await res.json()) as { message?: string };
    if (!res.ok) return setError(payload.message ?? "Xoá thất bại.");
    setNotice(`Đã xoá ${ids.length} dòng.`);
    await load();
  }

  // Dán từ Excel: nhận diện dòng tiêu đề (tên cột hoặc nhãn), không có thì theo thứ tự cột của mẫu.
  const parsed = useMemo(() => {
    if (paste === null) return null;
    const lines = paste.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (!lines.length) return { rows: [] as Array<Record<string, string>>, mapped: [] as string[] };
    const cells = lines.map((l) => l.split("\t"));
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s*\*$/, "");
    const byHeader = (cell: string) => fields.find((f) => norm(cell) === f.key || norm(cell) === norm(f.label));
    let order = fields.map((f) => f.key);
    let body = cells;
    const headerHits = cells[0].filter((c) => byHeader(c)).length;
    if (headerHits >= Math.min(2, cells[0].length)) {
      order = cells[0].map((c) => byHeader(c)?.key ?? "");
      body = cells.slice(1);
      // Bỏ dòng nhãn tiếng Việt của mẫu Excel nếu có.
      if (body[0] && body[0].filter((c) => byHeader(c)).length >= Math.min(2, body[0].length)) body = body.slice(1);
    }
    const out = body.map((r) => {
      const obj: Record<string, string> = {};
      order.forEach((k, i) => k && r[i] !== undefined && (obj[k] = r[i].trim()));
      return obj;
    });
    return { rows: out, mapped: order.filter(Boolean) };
  }, [paste, fields]);

  async function importPaste() {
    if (!parsed?.rows.length) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/smt/data/${dataset}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: parsed.rows }) });
      const payload = (await res.json()) as { message?: string; count?: number };
      if (!res.ok) throw new Error(payload.message ?? "Nhập thất bại.");
      setNotice(`Đã nhập ${payload.count} dòng.`);
      setPaste(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nhập thất bại.");
    } finally {
      setSaving(false);
    }
  }

  function exportRows() {
    const out = visible.map((r) => (dataset === "asset-logs" ? { ...r, asset_id: assets.find((a) => a.id === r.asset_id)?.code ?? r.asset_id } : r));
    downloadXlsx(`SMT_${dataset}_${hasDate ? `${from}_${to}` : todayVn()}`, [datasetSheet(dataset, out)]);
  }

  const listFields = fields.filter((f) => f.list);
  // Cột tính sẵn để kiểm tra nhanh khi nhập.
  const computed: Array<{ label: string; value: (r: Row) => string }> =
    dataset === "production"
      ? [
          { label: "FPY", value: (r) => pct(Number(r.total_qty) ? Number(r.good_qty) / Number(r.total_qty) : 0) },
          { label: "OEE", value: (r) => pct(oeeOf([r as unknown as ProductionLog]).oee) }
        ]
      : dataset === "asset-logs"
        ? [{ label: "Mispick", value: (r) => (Number(r.picks) ? pct(Number(r.mispicks) / Number(r.picks), 2) : "") }]
        : [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">
            {def.icon} {def.label}
          </h1>
          <p className="muted text-sm">{def.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={() => downloadXlsx(`SMT_${dataset}_mau_nhap`, [datasetSheet(dataset)])}>
            ⬇ Mẫu nhập .xlsx
          </button>
          <button type="button" className="btn-ghost" onClick={() => setPaste((v) => (v === null ? "" : null))}>
            📋 Dán từ Excel
          </button>
          <button type="button" className="btn-primary" onClick={() => setForm(blankForm())}>
            + Thêm dòng
          </button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Bộ dữ liệu">
        {TABULAR_DATASETS.map((k) => (
          <Link key={k} href={`/admin/smt/data/${k}`} aria-current={k === dataset ? "page" : undefined} className={`chip ${k === dataset ? "!border-brand-500 bg-brand-50 font-semibold text-brand-700 dark:bg-slate-800 dark:text-brand-200" : ""}`}>
            {DATASETS[k].icon} {DATASETS[k].label}
          </Link>
        ))}
      </nav>

      {notice && (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200" role="status">
          {notice}{" "}
          <button type="button" className="underline" onClick={() => setNotice("")}>
            Ẩn
          </button>
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200" role="alert">
          {error}
        </p>
      )}

      {paste !== null && (
        <div className="card space-y-3">
          <div>
            <h2 className="font-semibold">Dán dữ liệu từ Excel</h2>
            <p className="muted text-xs">
              Copy vùng ô trong Excel (kể cả dòng tiêu đề nếu có) rồi dán vào đây. Có tiêu đề: tự khớp theo tên cột. Không có tiêu đề: thứ tự cột phải giống <b>Mẫu nhập .xlsx</b>:{" "}
              <span className="font-mono">{fields.map((f) => f.key).join(" · ")}</span>. Ngày nhận YYYY-MM-DD hoặc DD/MM/YYYY. Có 1 dòng lỗi thì không ghi dòng nào.
            </p>
          </div>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} className="input min-h-40 font-mono text-xs" placeholder="Dán (Ctrl+V) vào đây…" />
          {parsed && parsed.rows.length > 0 && (
            <p className="text-sm">
              Nhận được <b>{parsed.rows.length}</b> dòng · cột: <span className="font-mono text-xs">{parsed.mapped.join(", ")}</span>
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={!parsed?.rows.length || saving} onClick={importPaste}>
              {saving ? "Đang nhập…" : `Nhập ${parsed?.rows.length ?? 0} dòng`}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPaste(null)}>
              Huỷ
            </button>
          </div>
        </div>
      )}

      {form && (
        <form
          className="card space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          <h2 className="font-semibold">{form.id ? "Sửa dòng" : "Thêm dòng mới"}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {fields.map((f) => (
              <Field key={f.key} label={`${f.label}${f.required ? " *" : ""}`} hint={f.hint} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <FieldInput field={f} value={form[f.key]} options={options(f)} onChange={(v) => setForm({ ...form, [f.key]: v })} />
              </Field>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu"}
            </button>
            {!form.id && (
              <button type="button" className="btn-ghost" disabled={saving} onClick={() => void save(true)}>
                Lưu &amp; nhập tiếp
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>
              Huỷ
            </button>
          </div>
        </form>
      )}

      <div className="card space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          {hasDate && (
            <>
              <Field label="Từ ngày">
                <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="input" />
              </Field>
              <Field label="Đến ngày">
                <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="input" />
              </Field>
            </>
          )}
          {hasLine && (
            <Field label="Line">
              <select value={line} onChange={(e) => setLine(e.target.value)} className="input">
                <option value="">Tất cả</option>
                {(settings?.lines ?? []).map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Tìm trong bảng" className="min-w-[180px] flex-1">
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} className="input" placeholder="Model, mã lỗi, vị trí…" />
          </Field>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={exportRows} disabled={!visible.length}>
              ⬇ Xuất .xlsx
            </button>
            {selected.size > 0 && (
              <button type="button" className="btn-ghost text-red-600" onClick={() => void remove([...selected])}>
                Xoá {selected.size} dòng
              </button>
            )}
          </div>
        </div>

        <p className="muted text-xs">{loading ? "Đang tải…" : `${visible.length} dòng${visible.length !== rows.length ? ` (lọc từ ${rows.length})` : ""}`}</p>

        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ background: "color-mix(in srgb, var(--border) 40%, transparent)" }}>
                <th className="w-8 px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả"
                    checked={visible.length > 0 && selected.size === visible.length}
                    onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((r) => r.id)) : new Set())}
                  />
                </th>
                {listFields.map((f) => (
                  <th key={f.key} className={`whitespace-nowrap px-3 py-2 font-semibold ${f.type === "number" || f.type === "int" ? "text-right" : ""}`}>
                    {f.label}
                  </th>
                ))}
                {computed.map((c) => (
                  <th key={c.label} className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, 500).map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      aria-label="Chọn dòng"
                      checked={selected.has(r.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(r.id);
                        else next.delete(r.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  {listFields.map((f) => (
                    <td key={f.key} className={`max-w-[260px] truncate px-3 py-1.5 ${f.type === "number" || f.type === "int" ? "text-right tabular-nums" : ""}`} title={display(f, r[f.key])}>
                      {display(f, r[f.key])}
                    </td>
                  ))}
                  {computed.map((c) => (
                    <td key={c.label} className="px-3 py-1.5 text-right font-medium tabular-nums">
                      {c.value(r)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-xs font-semibold">
                    <button type="button" className="text-brand-600 dark:text-brand-300" onClick={() => setForm({ ...r })}>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="ml-3 text-brand-600 dark:text-brand-300"
                      onClick={() => {
                        const { id: _id, created_at: _c, updated_at: _u, ...copy } = r;
                        setForm(copy);
                      }}
                    >
                      Nhân bản
                    </button>
                    <button type="button" className="ml-3 text-red-600" onClick={() => void remove([r.id])}>
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !visible.length && (
                <tr>
                  <td colSpan={listFields.length + computed.length + 2} className="muted px-3 py-6 text-center">
                    Chưa có dữ liệu trong khoảng này. Bấm “+ Thêm dòng” hoặc “Dán từ Excel”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {visible.length > 500 && <p className="muted text-xs">Đang hiện 500 dòng đầu. Thu hẹp khoảng ngày hoặc dùng “Xuất .xlsx” để xem đủ.</p>}
      </div>
    </section>
  );
}

function FieldInput({ field, value, options, onChange }: { field: FieldDef; value: unknown; options: Option[]; onChange: (v: unknown) => void }) {
  const v = value === null || value === undefined ? "" : value;
  if (field.type === "bool") return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5" />;
  if (field.type === "textarea") return <textarea value={String(v)} onChange={(e) => onChange(e.target.value)} className="input min-h-20" />;
  if (field.type === "select" || options.length)
    return (
      <select value={String(v)} onChange={(e) => onChange(e.target.value)} className="input" required={field.required}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {/* Giữ được giá trị cũ không còn trong danh sách (VD line đã đổi tên) */}
        {v !== "" && !options.some((o) => o.value === v) && <option value={String(v)}>{String(v)}</option>}
      </select>
    );
  return (
    <input
      type={field.type === "date" ? "date" : field.type === "number" || field.type === "int" ? "number" : "text"}
      step={field.type === "int" ? 1 : field.type === "number" ? "any" : undefined}
      min={field.min}
      max={field.max}
      value={String(v)}
      onChange={(e) => onChange(e.target.value)}
      className="input"
      required={field.required}
    />
  );
}
