"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AutoTextarea, Field } from "@/components/admin/fields";
import { EightDDocument } from "@/components/smt/eight-d-document";
import { ReportDocument } from "@/components/smt/report-parts";
import { findTemplate } from "@/lib/smt/catalog";
import { DEFAULT_SMT_SETTINGS } from "@/lib/smt/defaults";
import { EIGHT_D_STATUS, FISHBONE_BRANCHES, todayVn } from "@/lib/smt/types";
import type { ActionItem, EightDContent, EightDReport, SmtSettings } from "@/lib/smt/types";
import { eightDSheet } from "@/lib/smt/workbooks";
import { downloadXlsx } from "@/lib/smt/xlsx";

const STEPS = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;
type StepKey = (typeof STEPS)[number];
const STEP_TITLE: Record<StepKey, string> = {
  D0: "Chuẩn bị & ERA",
  D1: "Lập nhóm",
  D2: "Mô tả 5W2H",
  D3: "Khoanh vùng",
  D4: "Fishbone & 5 Why",
  D5: "Chọn giải pháp",
  D6: "Triển khai & xác nhận",
  D7: "Phòng ngừa",
  D8: "Ghi nhận & đóng"
};

// Bước đã có nội dung (để tô xanh trên thanh tiến trình).
function filled(c: EightDContent, step: StepKey) {
  const any = (o: object) => JSON.stringify(o).replace(/"[^"]*":/g, "").replace(/[^\p{L}\p{N}]/gu, "").length > 0;
  const map: Record<StepKey, object> = { D0: c.d0, D1: c.d1.team, D2: c.d2, D3: c.d3, D4: c.d4, D5: c.d5, D6: c.d6, D7: c.d7, D8: c.d8 };
  return any(map[step]);
}

export function EightDEditor({ initial, base = "/admin/smt/8d" }: { initial: EightDReport; base?: string }) {
  const router = useRouter();
  const [r, setR] = useState<EightDReport>(initial);
  const [step, setStep] = useState<StepKey>("D0");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [settings, setSettings] = useState<SmtSettings>(DEFAULT_SMT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/smt/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((d: { settings?: SmtSettings }) => d.settings && setSettings(d.settings))
      .catch(() => undefined);
  }, []);

  // Cảnh báo khi rời trang mà chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const set = (patch: Partial<EightDReport>) => {
    setR((cur) => ({ ...cur, ...patch }));
    setDirty(true);
  };
  const setC = <K extends keyof EightDContent>(key: K, value: EightDContent[K]) => set({ content: { ...r.content, [key]: value } });

  async function save() {
    if (!r.title.trim()) return setMessage({ ok: false, text: "Cần nhập tiêu đề vấn đề." });
    setSaving(true);
    setMessage(null);
    try {
      const { id, updated_at: _u, ...data } = r;
      const res = await fetch("/api/admin/smt/data/8d", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id, ...data } : { row: data })
      });
      const payload = (await res.json()) as { message?: string; item?: EightDReport; items?: EightDReport[] };
      if (!res.ok) throw new Error(payload.message ?? "Lưu thất bại.");
      const saved = payload.item ?? payload.items?.[0];
      if (saved) setR(saved);
      setDirty(false);
      setMessage({ ok: true, text: `Đã lưu ${saved?.code ?? ""}.` });
      if (!id && saved) router.replace(`${base}/${saved.id}`);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Lưu thất bại." });
    } finally {
      setSaving(false);
    }
  }

  const c = r.content;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href={base} className="text-sm text-brand-600 dark:text-brand-300">
            ← Danh sách 8D
          </Link>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">{r.id ? `${r.code} · ${r.title || "(chưa có tiêu đề)"}` : "Báo cáo 8D mới"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-xl border p-0.5" style={{ borderColor: "var(--border)" }} role="tablist">
            {(["edit", "preview"] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${mode === m ? "bg-brand-600 text-white" : ""}`}>
                {m === "edit" ? "✏️ Soạn thảo" : "👁 Xem / In"}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Đang lưu…" : dirty ? "💾 Lưu *" : "💾 Lưu"}
          </button>
        </div>
      </div>

      {message && (
        <p className={`rounded-xl border px-3 py-2 text-sm ${message.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200"}`} role="status">
          {message.text}
        </p>
      )}

      {mode === "preview" ? (
        <ReportDocument
          template={findTemplate("8d")!}
          company={settings.company}
          toolbar={
            <div className="card flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => downloadXlsx(`${r.code || "8D"}_8D`, [eightDSheet(r, settings)])}>
                ⬇ Excel
              </button>
              <button type="button" className="btn-primary" onClick={() => window.print()}>
                🖨 In / Lưu PDF
              </button>
            </div>
          }
        >
          <EightDDocument report={r} />
        </ReportDocument>
      ) : (
        <>
          <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tiêu đề vấn đề *" className="sm:col-span-2">
              <input className="input" value={r.title} onChange={(e) => set({ title: e.target.value })} placeholder="VD: Chập thiếc IC U5 – model A (khách hàng phàn nàn)" />
            </Field>
            <Field label="Mã 8D" hint="Bỏ trống: tự sinh 8D-yyMM-xx">
              <input className="input font-mono" value={r.code} onChange={(e) => set({ code: e.target.value })} />
            </Field>
            <Field label="Trạng thái">
              <select className="input" value={r.status} onChange={(e) => set({ status: e.target.value as EightDReport["status"], closed_on: e.target.value === "closed" ? r.closed_on ?? todayVn() : r.closed_on })}>
                {EIGHT_D_STATUS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.vi}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mức độ">
              <select className="input" value={r.severity} onChange={(e) => set({ severity: e.target.value as EightDReport["severity"] })}>
                <option value="minor">Nhẹ</option>
                <option value="major">Nặng</option>
                <option value="critical">Nghiêm trọng</option>
              </select>
            </Field>
            <Field label="Khách hàng">
              <input className="input" value={r.customer} onChange={(e) => set({ customer: e.target.value })} />
            </Field>
            <Field label="Line">
              <select className="input" value={r.line} onChange={(e) => set({ line: e.target.value })}>
                <option value="">—</option>
                {settings.lines.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} – {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model">
              <input className="input" value={r.model} onChange={(e) => set({ model: e.target.value })} />
            </Field>
            <Field label="Mã lỗi">
              <select className="input" value={r.defect_code} onChange={(e) => set({ defect_code: e.target.value })}>
                <option value="">—</option>
                {settings.defectCatalog.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} – {d.vi}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trưởng nhóm">
              <input className="input" value={r.owner} onChange={(e) => set({ owner: e.target.value })} />
            </Field>
            <Field label="Ngày mở">
              <input type="date" className="input" value={r.opened_on} onChange={(e) => set({ opened_on: e.target.value })} />
            </Field>
            <Field label="Hạn đóng">
              <input type="date" className="input" value={r.due_on ?? ""} onChange={(e) => set({ due_on: e.target.value || null })} />
            </Field>
            <Field label="Ngày đóng">
              <input type="date" className="input" value={r.closed_on ?? ""} onChange={(e) => set({ closed_on: e.target.value || null })} />
            </Field>
            <label className="flex items-center gap-2 self-end text-sm sm:col-span-2">
              <input type="checkbox" className="h-5 w-5" checked={r.is_public} onChange={(e) => set({ is_public: e.target.checked })} />
              <span>
                <b>Công khai</b> trên trang Tài liệu (chỉ bật khi đã ẩn tên khách hàng / thông tin mật)
              </span>
            </label>
          </div>

          <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Các bước 8D">
            {STEPS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => setStep(s)}
                  aria-current={step === s ? "step" : undefined}
                  className={`flex min-w-[96px] flex-col rounded-xl border px-3 py-2 text-left text-xs transition ${step === s ? "border-brand-500 bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
                  style={step === s ? undefined : { borderColor: "var(--border)" }}
                >
                  <span className="flex items-center gap-1 font-bold">
                    {s} {filled(c, s) && <span aria-label="đã có nội dung">✓</span>}
                  </span>
                  <span className="truncate">{STEP_TITLE[s]}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="card space-y-4">
            <h2 className="text-lg font-semibold">
              {step} – {STEP_TITLE[step]}
            </h2>

            {step === "D0" && (
              <>
                <Area label="Triệu chứng (khách hàng / nội bộ thấy gì?)" value={c.d0.symptom} onChange={(v) => setC("d0", { ...c.d0, symptom: v })} />
                <Area label="Hành động khẩn cấp (ERA)" hint="Dừng giao hàng, tăng kiểm tra… trong 24h" value={c.d0.emergencyAction} onChange={(v) => setC("d0", { ...c.d0, emergencyAction: v })} />
                <Area label="Có cần 8D? Vì sao?" value={c.d0.need8d} onChange={(v) => setC("d0", { ...c.d0, need8d: v })} />
              </>
            )}

            {step === "D1" && (
              <ListEditor
                items={c.d1.team}
                onChange={(team) => setC("d1", { team })}
                make={() => ({ name: "", role: "", dept: "" })}
                addLabel="+ Thêm thành viên"
                render={(m, update) => (
                  <div className="grid flex-1 gap-2 sm:grid-cols-3">
                    <input className="input" placeholder="Họ tên" value={m.name} onChange={(e) => update({ ...m, name: e.target.value })} />
                    <input className="input" placeholder="Vai trò (Trưởng nhóm, QA…)" value={m.role} onChange={(e) => update({ ...m, role: e.target.value })} />
                    <input className="input" placeholder="Bộ phận" value={m.dept} onChange={(e) => update({ ...m, dept: e.target.value })} />
                  </div>
                )}
              />
            )}

            {step === "D2" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["what", "What – Lỗi gì?"],
                      ["where", "Where – Ở đâu (line, trạm, vị trí)?"],
                      ["when", "When – Khi nào (lô, ca, ngày)?"],
                      ["who", "Who – Ai phát hiện?"],
                      ["why", "Why – Vì sao là vấn đề?"],
                      ["how", "How – Biểu hiện thế nào?"],
                      ["howMany", "How many – Bao nhiêu (số lượng, PPM)?"]
                    ] as const
                  ).map(([k, label]) => (
                    <Area key={k} label={label} value={c.d2[k]} onChange={(v) => setC("d2", { ...c.d2, [k]: v })} min={44} />
                  ))}
                </div>
                <Area label="Problem statement (1 câu tóm tắt)" value={c.d2.statement} onChange={(v) => setC("d2", { ...c.d2, statement: v })} />
              </>
            )}

            {step === "D3" && (
              <>
                <Area label="Kiểm tra tồn kho (thành phẩm / WIP / đang vận chuyển / tại khách)" value={c.d3.stockCheck} onChange={(v) => setC("d3", { ...c.d3, stockCheck: v })} min={44} />
                <ActionsEditor items={c.d3.actions} onChange={(actions) => setC("d3", { ...c.d3, actions })} />
              </>
            )}

            {step === "D4" && (
              <>
                <div>
                  <p className="font-medium">Fishbone 6M</p>
                  <p className="muted text-xs">Mỗi nhánh liệt kê các nguyên nhân có thể. Sau đó dùng 5 Why cho nguyên nhân khả nghi nhất.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FISHBONE_BRANCHES.map((b) => (
                    <div key={b.id} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                      <p className="mb-2 text-sm font-semibold">
                        {b.en} · {b.vi}
                      </p>
                      <ListEditor
                        items={c.d4.fishbone[b.id]}
                        onChange={(list) => setC("d4", { ...c.d4, fishbone: { ...c.d4.fishbone, [b.id]: list } })}
                        make={() => ""}
                        addLabel="+ Nguyên nhân"
                        render={(x, update) => <input className="input flex-1" value={x} onChange={(e) => update(e.target.value)} />}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <WhyEditor title="5 Why – vì sao XẢY RA" whys={c.d4.whyOccur} root={c.d4.rootOccur} onChange={(whyOccur, rootOccur) => setC("d4", { ...c.d4, whyOccur, rootOccur })} />
                  <WhyEditor title="5 Why – vì sao LỌT (không phát hiện)" whys={c.d4.whyEscape} root={c.d4.rootEscape} onChange={(whyEscape, rootEscape) => setC("d4", { ...c.d4, whyEscape, rootEscape })} />
                </div>
                <Area label="Xác minh nguyên nhân (tái hiện bật / tắt lỗi)" value={c.d4.verification} onChange={(v) => setC("d4", { ...c.d4, verification: v })} />
              </>
            )}

            {step === "D5" && <ActionsEditor items={c.d5.actions} onChange={(actions) => setC("d5", { actions })} />}

            {step === "D6" && (
              <>
                <ActionsEditor items={c.d6.actions} onChange={(actions) => setC("d6", { ...c.d6, actions })} />
                <Area label="Hiệu quả (PPM trước / sau, thời gian theo dõi)" value={c.d6.effectiveness} onChange={(v) => setC("d6", { ...c.d6, effectiveness: v })} min={44} />
              </>
            )}

            {step === "D7" && (
              <>
                <ActionsEditor items={c.d7.actions} onChange={(actions) => setC("d7", { ...c.d7, actions })} />
                <div>
                  <p className="mb-2 text-sm font-medium">Tài liệu đã cập nhật</p>
                  <ListEditor items={c.d7.documents} onChange={(documents) => setC("d7", { ...c.d7, documents })} make={() => ""} addLabel="+ Tài liệu (PFMEA, Control Plan, WI…)" render={(x, update) => <input className="input flex-1" value={x} onChange={(e) => update(e.target.value)} />} />
                </div>
              </>
            )}

            {step === "D8" && (
              <>
                <Area label="Ghi nhận nhóm" value={c.d8.recognition} onChange={(v) => setC("d8", { ...c.d8, recognition: v })} min={44} />
                <Area label="Bài học kinh nghiệm" value={c.d8.lessons} onChange={(v) => setC("d8", { ...c.d8, lessons: v })} />
                <Field label="Người đóng">
                  <input className="input" value={c.d8.closedBy} onChange={(e) => setC("d8", { ...c.d8, closedBy: e.target.value })} />
                </Field>
              </>
            )}

            <div className="flex justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <button type="button" className="btn-ghost" disabled={step === "D0"} onClick={() => setStep(STEPS[STEPS.indexOf(step) - 1])}>
                ← Bước trước
              </button>
              <button type="button" className="btn-ghost" disabled={step === "D8"} onClick={() => setStep(STEPS[STEPS.indexOf(step) + 1])}>
                Bước sau →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Area({ label, hint, value, onChange, min = 70 }: { label: string; hint?: string; value: string; onChange: (v: string) => void; min?: number }) {
  return (
    <Field label={label} hint={hint}>
      <AutoTextarea value={value} onChange={(e) => onChange(e.target.value)} minHeight={min} />
    </Field>
  );
}

function ListEditor<T>({ items, onChange, make, render, addLabel }: { items: T[]; onChange: (next: T[]) => void; make: () => T; render: (item: T, update: (v: T) => void) => ReactNode; addLabel: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          {render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}
          <button type="button" className="mt-2 text-sm text-red-600" aria-label="Xoá dòng" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="text-sm font-semibold text-brand-600 dark:text-brand-300" onClick={() => onChange([...items, make()])}>
        {addLabel}
      </button>
    </div>
  );
}

function ActionsEditor({ items, onChange }: { items: ActionItem[]; onChange: (next: ActionItem[]) => void }) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      make={(): ActionItem => ({ action: "", owner: "", due: "", status: "open", result: "" })}
      addLabel="+ Thêm hành động"
      render={(a, update) => (
        <div className="grid flex-1 gap-2 rounded-xl border p-2 sm:grid-cols-[2fr_1fr_140px_110px]" style={{ borderColor: "var(--border)" }}>
          <input className="input" placeholder="Hành động" value={a.action} onChange={(e) => update({ ...a, action: e.target.value })} />
          <input className="input" placeholder="Phụ trách" value={a.owner} onChange={(e) => update({ ...a, owner: e.target.value })} />
          <input type="date" className="input" value={a.due} onChange={(e) => update({ ...a, due: e.target.value })} aria-label="Hạn" />
          <select className="input" value={a.status} onChange={(e) => update({ ...a, status: e.target.value as ActionItem["status"] })} aria-label="Trạng thái">
            <option value="open">○ Đang làm</option>
            <option value="done">✔ Xong</option>
          </select>
          <input className="input sm:col-span-4" placeholder="Kết quả / bằng chứng" value={a.result} onChange={(e) => update({ ...a, result: e.target.value })} />
        </div>
      )}
    />
  );
}

function WhyEditor({ title, whys, root, onChange }: { title: string; whys: string[]; root: string; onChange: (whys: string[], root: string) => void }) {
  return (
    <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
      <p className="font-medium">{title}</p>
      {whys.slice(0, 5).map((w, i) => (
        <label key={i} className="flex items-center gap-2 text-sm" style={{ paddingLeft: i * 8 }}>
          <span className="w-14 shrink-0 font-semibold">Why {i + 1}</span>
          <input className="input" value={w} onChange={(e) => onChange(whys.map((x, j) => (j === i ? e.target.value : x)), root)} placeholder={i === 0 ? "Vì sao lỗi xảy ra? →" : "Vì sao? →"} />
        </label>
      ))}
      <Field label="⇒ Nguyên nhân gốc">
        <input className="input" value={root} onChange={(e) => onChange(whys, e.target.value)} />
      </Field>
    </div>
  );
}
