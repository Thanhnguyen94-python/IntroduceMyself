"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/admin/fields";
import { ReportViewer } from "@/components/smt/report-viewer";
import { REPORT_TEMPLATES } from "@/lib/smt/catalog";
import { DEFAULT_SMT_SETTINGS } from "@/lib/smt/defaults";
import { addDays, todayVn } from "@/lib/smt/types";
import type { ReportSlug, SmtDataBundle, SmtSettings } from "@/lib/smt/types";

// Admin → Xuất báo cáo: chọn mẫu + kỳ, xem bằng dữ liệu thật (hoặc demo), xuất Excel / In PDF.
export function ReportWorkbench({ initialSlug }: { initialSlug: ReportSlug }) {
  const [slug, setSlug] = useState<ReportSlug>(initialSlug);
  const [from, setFrom] = useState(addDays(todayVn(), -29));
  const [to, setTo] = useState(todayVn());
  const [demo, setDemo] = useState(false);
  const [settings, setSettings] = useState<SmtSettings>(DEFAULT_SMT_SETTINGS);
  const [data, setData] = useState<{ bundle: SmtDataBundle; from: string; to: string; settings?: SmtSettings } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/smt/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { settings?: SmtSettings }) => d.settings && setSettings(d.settings))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetch(`/api/admin/smt/bundle?from=${from}&to=${to}${demo ? "&demo=1" : ""}`, { cache: "no-store" })
      .then(async (r) => {
        const d = (await r.json()) as { bundle?: SmtDataBundle; from?: string; to?: string; settings?: SmtSettings; message?: string };
        if (!r.ok || !d.bundle) throw new Error(d.message ?? "Không đọc được dữ liệu.");
        // Demo có cấu hình 10 line riêng -> dùng settings đi kèm thay vì cài đặt line thật.
        if (alive) setData({ bundle: d.bundle, from: d.from!, to: d.to!, settings: d.settings });
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [from, to, demo]);

  // Giữ ?r=<mẫu> trên URL để F5 / chia sẻ link vẫn mở đúng báo cáo.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("r", slug);
    window.history.replaceState(null, "", url);
  }, [slug]);

  return (
    <section className="space-y-4">
      <div className="smt-no-print space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">📊 Xuất báo cáo SMT</h1>
          <p className="muted text-sm">Chọn mẫu và kỳ báo cáo. Bấm “Excel (số liệu)” để tải file, “In / Lưu PDF” để in hoặc lưu PDF (chọn máy in “Save as PDF”).</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          {REPORT_TEMPLATES.map((t) => (
            <button key={t.slug} type="button" role="tab" aria-selected={slug === t.slug} onClick={() => setSlug(t.slug)} className={`chip !px-3 !py-1.5 text-sm ${slug === t.slug ? "!border-brand-500 bg-brand-600 font-semibold text-white" : ""}`}>
              {t.icon} {t.title.vi}
            </button>
          ))}
        </div>
        <div className="card flex flex-wrap items-end gap-3">
          <Field label="Từ ngày">
            <input type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Đến ngày">
            <input type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                className="chip"
                onClick={() => {
                  setTo(todayVn());
                  setFrom(addDays(todayVn(), -(d - 1)));
                }}
              >
                {d} ngày
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
            Xem bằng dữ liệu demo
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {loading && !data ? (
        <p className="card muted text-sm">Đang tải dữ liệu…</p>
      ) : data ? (
        <div className={loading ? "opacity-60" : ""}>
          <ReportViewer key={`${slug}-${data.from}-${data.to}-${demo}`} slug={slug} bundle={data.bundle} settings={data.settings ?? settings} from={data.from} to={data.to} source={demo ? "demo" : "live"} fixedRange />
        </div>
      ) : null}
    </section>
  );
}
