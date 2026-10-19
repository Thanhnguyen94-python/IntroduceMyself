import Link from "next/link";
import { getAnalyticsSummary, getFirmwareStats, type AnalyticsSummary, type FirmwareStat } from "@/lib/analytics/summary";
import { BarList, DailyColumns, OnlineNow, StatTile } from "@/components/admin/analytics/charts";
import { compact, formatDuration } from "@/lib/format-number";

export const metadata = { title: "Thống kê truy cập" };
export const dynamic = "force-dynamic";

const RANGES = [
  { days: 1, label: "Hôm nay" },
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" }
];

const DEVICE_ICON: Record<string, string> = { desktop: "🖥", mobile: "📱", tablet: "📲" };

function timeAgo(iso: string) {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s trước`;
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ trước`;
  return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const params = await searchParams;
  const days = RANGES.some((r) => String(r.days) === params.days) ? Number(params.days) : 30;

  let summary: AnalyticsSummary | null = null;
  let firmware: FirmwareStat[] = [];
  let error = "";
  try {
    [summary, firmware] = await Promise.all([getAnalyticsSummary(days), getFirmwareStats()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Không đọc được dữ liệu thống kê.";
  }

  if (!summary) {
    return (
      <section className="card space-y-2">
        <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Thống kê truy cập</h1>
        <p className="text-sm text-red-600">{error}</p>
        <p className="muted text-sm">
          Kiểm tra migration <code>202610190001_engagement_analytics_chat.sql</code> đã chạy trên Supabase chưa.
        </p>
      </section>
    );
  }

  const s = summary;
  const peakHour = s.hourly.indexOf(Math.max(...s.hourly));
  const flashTotals = firmware.reduce(
    (acc, f) => ({ success: acc.success + f.success, error: acc.error + f.error, opened: acc.opened + f.opened }),
    { success: 0, error: 0, opened: 0 }
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Thống kê truy cập</h1>
          <p className="muted text-sm">Ẩn danh: không lưu IP, không cookie theo dõi. Bỏ qua bot và trang Admin.</p>
        </div>
        {/* Bộ lọc thời gian: 1 hàng, áp dụng cho mọi số liệu bên dưới */}
        <nav className="flex gap-1 rounded-xl border p-1" style={{ borderColor: "var(--border)" }} aria-label="Khoảng thời gian">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/admin/analytics?days=${r.days}`}
              aria-current={r.days === days ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${r.days === days ? "bg-brand-600 text-white" : "hover:bg-brand-50 dark:hover:bg-slate-800"}`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <OnlineNow initial={s.onlineNow} />
        <StatTile label="Lượt xem trang" value={compact(s.totals.views)} hint={`Hôm nay: ${s.today.views}`} />
        <StatTile label="Khách truy cập" value={compact(s.totals.visitors)} hint={`Mới: ${s.totals.newVisitors} · Hôm nay: ${s.today.visitors}`} />
        <StatTile label="Thời gian / phiên" value={formatDuration(s.totals.avgDurationSec)} hint={`${s.totals.sessions} phiên · ${s.totals.bounceRate}% chỉ xem 1 trang`} />
        <StatTile label="Nạp firmware thành công" value={compact(flashTotals.success)} hint={`${flashTotals.error} lỗi · ${flashTotals.opened} lần mở hộp thoại`} />
      </div>

      {days > 1 && (
        <div className="card">
          <DailyColumns data={s.daily} title={`Lượt xem theo ngày (${days} ngày)`} />
          <p className="muted mt-2 text-xs">
            Giờ đông khách nhất: {peakHour}h–{peakHour + 1}h (giờ Việt Nam).
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="Trang được xem nhiều" items={s.topPages} unit="lượt xem" />
        <BarList title="Đến từ đâu" items={s.referrers} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BarList title="Quốc gia" items={s.countries} empty="Chỉ có khi chạy trên Vercel" />
        <BarList title="Thành phố" items={s.cities} empty="Chỉ có khi chạy trên Vercel" />
        <BarList title="Khu vực web" items={s.hubs} />
        <BarList title="Thiết bị" items={s.devices} />
        <BarList title="Trình duyệt" items={s.browsers} />
        <BarList title="Hệ điều hành" items={s.os} />
      </div>

      <section className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Số lần nạp firmware (từ trước tới nay)</h2>
          <Link href="/admin/firmware" className="text-sm font-semibold text-brand-600 dark:text-brand-300">
            Quản lý firmware →
          </Link>
        </div>
        {firmware.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="muted text-left text-xs">
                  <th className="py-2 pr-3">Bản firmware</th>
                  <th className="py-2 pr-3 text-right">Mở hộp thoại</th>
                  <th className="py-2 pr-3 text-right">Bắt đầu ghi</th>
                  <th className="py-2 pr-3 text-right">Thành công</th>
                  <th className="py-2 pr-3 text-right">Lỗi</th>
                  <th className="py-2 pr-3 text-right">Có xoá flash</th>
                  <th className="py-2 pr-3">Lần gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {firmware.map((f) => (
                  <tr key={f.releaseKey} className="border-t align-top" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2 pr-3">
                      <b>v{f.version ?? "?"}</b> <span className="muted text-xs">{f.board ?? f.hub ?? ""}</span>
                      {f.releaseKey.startsWith("static:") && <span className="chip ml-1 text-[10px]">manifest tĩnh</span>}
                      {f.lastErrors.length > 0 && <p className="mt-1 text-xs text-red-600">Lỗi gần đây: {f.lastErrors.join(" · ")}</p>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{f.opened}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{f.started}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">✅ {f.success}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">❌ {f.error}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{f.erased}</td>
                    <td className="muted py-2 pr-3 text-xs">{f.lastAt ? timeAgo(f.lastAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted text-sm">Chưa có lượt nạp nào được ghi nhận.</p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Truy cập gần nhất</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="muted text-left text-xs">
                <th className="py-2 pr-3">Thời gian</th>
                <th className="py-2 pr-3">Trang</th>
                <th className="py-2 pr-3">Nguồn</th>
                <th className="py-2 pr-3">Vị trí</th>
                <th className="py-2 pr-3">Thiết bị</th>
                <th className="py-2 pr-3 text-right">Ở lại</th>
              </tr>
            </thead>
            <tbody>
              {s.recent.map((v) => (
                <tr key={v.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="muted whitespace-nowrap py-1.5 pr-3 text-xs">
                    {timeAgo(v.created_at)}
                    {v.is_new_visitor && <span className="chip ml-1 text-[10px]">mới</span>}
                  </td>
                  <td className="max-w-[260px] truncate py-1.5 pr-3 font-mono text-xs">{v.path}</td>
                  <td className="py-1.5 pr-3 text-xs">{v.referrer_host ?? (v.utm_source ? `utm: ${v.utm_source}` : "trực tiếp")}</td>
                  <td className="py-1.5 pr-3 text-xs">{[v.city, v.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="whitespace-nowrap py-1.5 pr-3 text-xs">
                    {DEVICE_ICON[v.device ?? ""] ?? ""} {v.browser} · {v.os}
                    {v.screen && <span className="muted"> · {v.screen}</span>}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-xs tabular-nums">{formatDuration(v.duration_sec ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!s.recent.length && <p className="muted py-3 text-sm">Chưa có lượt truy cập nào.</p>}
        </div>
        {s.truncated && <p className="muted text-xs">Đã đạt giới hạn 50.000 lượt xem cho khoảng này; số liệu có thể thấp hơn thực tế.</p>}
      </section>
    </section>
  );
}
