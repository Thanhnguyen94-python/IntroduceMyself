import Link from "next/link";
import { StatTile } from "@/components/admin/analytics/charts";
import { DATASETS, TABULAR_DATASETS } from "@/lib/smt/datasets";
import { buildAssetHealth, buildYieldReport, oeeOf } from "@/lib/smt/metrics";
import { loadBundle, readSmtSettings } from "@/lib/smt/store";
import { EIGHT_D_STATUS, addDays, dmy, num, pct, todayVn } from "@/lib/smt/types";
import type { SmtDataBundle } from "@/lib/smt/types";

export const metadata = { title: "Tổng quan SMT" };
export const dynamic = "force-dynamic";

const DAYS = 7;

export default async function AdminSmtOverviewPage() {
  const today = todayVn();
  const from = addDays(today, -(DAYS - 1));
  const settings = await readSmtSettings();
  let bundle: SmtDataBundle | null = null;
  let error = "";
  try {
    bundle = await loadBundle({ from: addDays(today, -59), to: today });
  } catch (e) {
    error = e instanceof Error ? e.message : "Không đọc được dữ liệu SMT.";
  }

  if (!bundle) {
    return (
      <section className="card space-y-2">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Tổng quan SMT</h1>
        <p className="text-sm text-red-600">{error}</p>
        <p className="muted text-sm">
          Kiểm tra migration <code>202610210001_smt_reports.sql</code> đã chạy trên Supabase chưa.
        </p>
      </section>
    );
  }

  const week = bundle.production.filter((p) => p.log_date >= from);
  const oee = oeeOf(week);
  const quality = buildYieldReport(bundle.production, bundle.defects, settings, { from, to: today });
  const health = buildAssetHealth(bundle.assets, bundle.assetLogs, settings, { from: addDays(today, -29), to: today });
  const critical = health.filter((a) => a.health === "critical");
  const open8d = bundle.eightD.filter((r) => r.status !== "closed");
  const late8d = open8d.filter((r) => r.due_on && r.due_on < today);
  const pending4m = bundle.changes.filter((c) => c.status !== "rejected" && c.result === "pending");

  // Nhắc nhập liệu: line nào hôm qua / hôm nay chưa có nhật ký sản xuất.
  const entry = settings.lines.map((l) => ({
    line: l,
    days: [addDays(today, -1), today].map((d) => ({ date: d, shifts: bundle!.production.filter((p) => p.line === l.code && p.log_date === d).length }))
  }));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Tổng quan SMT</h1>
          <p className="muted text-sm">Số liệu {DAYS} ngày gần nhất từ dữ liệu bạn đã nhập.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/tai-lieu-ky-thuat/smt-reports" target="_blank" rel="noreferrer" className="btn-ghost">
            ↗ Trang công khai
          </a>
          <Link href="/admin/smt/reports" className="btn-ghost">
            📊 Xuất báo cáo
          </Link>
          <Link href="/admin/smt/data/production" className="btn-primary">
            + Nhập nhật ký ca
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={`OEE ${DAYS} ngày`} value={week.length ? pct(oee.oee) : "—"} hint={`Mục tiêu ${pct(settings.targets.oee)} · A ${pct(oee.availability)} · P ${pct(oee.performance)} · Q ${pct(oee.quality)}`} />
        <StatTile label="FPY" value={quality.boards ? pct(quality.fpy, 2) : "—"} hint={`Mục tiêu ${pct(settings.targets.fpy)} · ${num(quality.boards)} board`} />
        <StatTile label="DPMO" value={quality.boards ? num(quality.dpmo) : "—"} hint={`Top lỗi: ${quality.pareto.slice(0, 3).map((p) => p.code).join(", ") || "—"}`} />
        <StatTile label="Feeder / Nozzle nguy cấp" value={String(critical.length)} hint={`${health.filter((a) => a.health === "warning").length} cảnh báo · ${bundle.assets.length} thiết bị`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="font-semibold">Tình trạng nhập liệu</h2>
          <ul className="space-y-2 text-sm">
            {entry.map((e) => (
              <li key={e.line.code} className="flex flex-wrap items-center gap-2">
                <b className="w-40 truncate">{e.line.name}</b>
                {e.days.map((d) => (
                  <span key={d.date} className={`chip ${d.shifts ? "" : "!border-amber-400 text-amber-700 dark:text-amber-300"}`}>
                    {d.shifts ? "✓" : "!"} {d.date === today ? "Hôm nay" : "Hôm qua"}: {d.shifts ? `${d.shifts} dòng` : "chưa nhập"}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 border-t pt-3 text-sm" style={{ borderColor: "var(--border)" }}>
            {TABULAR_DATASETS.map((k) => (
              <Link key={k} href={`/admin/smt/data/${k}`} className="chip hover:border-brand-400">
                {DATASETS[k].icon} {DATASETS[k].label}
              </Link>
            ))}
          </div>
        </section>

        <section className="card space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">8D đang mở ({open8d.length})</h2>
            <Link href="/admin/smt/8d" className="text-sm font-semibold text-brand-600 dark:text-brand-300">
              Tất cả 8D →
            </Link>
          </div>
          {open8d.length ? (
            <ul className="divide-y text-sm" style={{ borderColor: "var(--border)" }}>
              {open8d.slice(0, 6).map((r) => (
                <li key={r.id} className="py-2" style={{ borderColor: "var(--border)" }}>
                  <Link href={`/admin/smt/8d/${r.id}`} className="hover:text-brand-600">
                    <b className="font-mono">{r.code}</b> · {r.title}
                  </Link>
                  <span className="muted block text-xs">
                    {EIGHT_D_STATUS.find((s) => s.id === r.status)?.vi} · hạn {dmy(r.due_on) || "—"}
                    {late8d.includes(r) && <b className="ml-1 text-red-600">· QUÁ HẠN</b>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted text-sm">Không có 8D nào đang mở. 👍</p>
          )}
        </section>

        <section className="card space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Thay đổi 4M1E chờ xác nhận ({pending4m.length})</h2>
            <Link href="/admin/smt/data/changes" className="text-sm font-semibold text-brand-600 dark:text-brand-300">
              Quản lý 4M →
            </Link>
          </div>
          {pending4m.length ? (
            <ul className="space-y-1 text-sm">
              {pending4m.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <b className="font-mono">{c.code}</b> · {c.category} · {c.item} <span className="muted">({dmy(c.change_date)}, rủi ro {c.risk})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted text-sm">Không có thay đổi nào chờ xác nhận.</p>
          )}
        </section>

        <section className="card space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Feeder / Nozzle cần rút khỏi line</h2>
            <Link href="/admin/smt/reports?r=feeder-nozzle" className="text-sm font-semibold text-brand-600 dark:text-brand-300">
              Báo cáo →
            </Link>
          </div>
          {critical.length ? (
            <ul className="space-y-1 text-sm">
              {critical.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <b>{a.code}</b> <span className="muted">({a.machine})</span> – {a.reasons.join("; ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted text-sm">Không có thiết bị nguy cấp.</p>
          )}
        </section>
      </div>
    </section>
  );
}
