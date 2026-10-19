import { selectRows } from "@/lib/data/table-store";

export type VisitRow = {
  id: string;
  visitor_id: string;
  session_id: string;
  path: string;
  hub: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  language: string | null;
  screen: string | null;
  is_new_visitor: boolean;
  duration_sec: number;
  created_at: string;
  last_seen_at: string;
};

export type Ranked = { label: string; value: number };

export type AnalyticsSummary = {
  days: number;
  onlineNow: number;
  totals: { views: number; visitors: number; sessions: number; newVisitors: number; avgDurationSec: number; bounceRate: number };
  today: { views: number; visitors: number };
  daily: Array<{ date: string; views: number; visitors: number }>;
  hourly: number[];
  topPages: Ranked[];
  referrers: Ranked[];
  countries: Ranked[];
  cities: Ranked[];
  devices: Ranked[];
  browsers: Ranked[];
  os: Ranked[];
  languages: Ranked[];
  hubs: Ranked[];
  recent: VisitRow[];
  truncated: boolean;
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const MAX_ROWS = 50_000;
const VN_OFFSET_MS = 7 * 3600 * 1000;

// Ngày theo giờ Việt Nam (UTC+7) để biểu đồ khớp với ngày bạn thấy.
function vnDate(iso: string) {
  return new Date(new Date(iso).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

function rank(rows: VisitRow[], pick: (r: VisitRow) => string | null | undefined, limit = 8, distinctVisitors = true): Ranked[] {
  const map = new Map<string, Set<string> | number>();
  for (const r of rows) {
    const key = pick(r);
    if (!key) continue;
    if (distinctVisitors) {
      const set = (map.get(key) as Set<string>) ?? new Set<string>();
      set.add(r.visitor_id);
      map.set(key, set);
    } else {
      map.set(key, ((map.get(key) as number) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, value: typeof v === "number" ? v : v.size }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export async function countOnlineNow() {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const rows = await selectRows<Pick<VisitRow, "visitor_id">>("analytics_visits", { gte: ["last_seen_at", since], columns: "visitor_id", limit: 5000 });
  return new Set(rows.map((r) => r.visitor_id)).size;
}

export async function getAnalyticsSummary(days: number): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const rows = await selectRows<VisitRow>("analytics_visits", { gte: ["created_at", since], order: ["created_at", "desc"], limit: MAX_ROWS });
  const onlineNow = await countOnlineNow();

  const todayKey = vnDate(new Date().toISOString());
  const todayRows = rows.filter((r) => vnDate(r.created_at) === todayKey);

  // Phiên: số trang xem và tổng thời gian để tính thời gian trung bình / tỉ lệ thoát.
  const sessions = new Map<string, { views: number; duration: number }>();
  for (const r of rows) {
    const s = sessions.get(r.session_id) ?? { views: 0, duration: 0 };
    s.views += 1;
    s.duration += r.duration_sec ?? 0;
    sessions.set(r.session_id, s);
  }
  const sessionList = [...sessions.values()];
  const avgDurationSec = sessionList.length ? Math.round(sessionList.reduce((a, s) => a + s.duration, 0) / sessionList.length) : 0;
  const bounceRate = sessionList.length ? Math.round((sessionList.filter((s) => s.views === 1).length / sessionList.length) * 100) : 0;

  const dailyMap = new Map<string, { views: number; visitors: Set<string> }>();
  for (let i = days - 1; i >= 0; i -= 1) dailyMap.set(vnDate(new Date(Date.now() - i * 86400_000).toISOString()), { views: 0, visitors: new Set() });
  const hourly = Array.from({ length: 24 }, () => 0);
  for (const r of rows) {
    const d = dailyMap.get(vnDate(r.created_at));
    if (d) {
      d.views += 1;
      d.visitors.add(r.visitor_id);
    }
    hourly[new Date(new Date(r.created_at).getTime() + VN_OFFSET_MS).getUTCHours()] += 1;
  }

  const visitorsAll = new Set(rows.map((r) => r.visitor_id));
  const newVisitors = new Set(rows.filter((r) => r.is_new_visitor).map((r) => r.visitor_id));

  return {
    days,
    onlineNow,
    totals: { views: rows.length, visitors: visitorsAll.size, sessions: sessions.size, newVisitors: newVisitors.size, avgDurationSec, bounceRate },
    today: { views: todayRows.length, visitors: new Set(todayRows.map((r) => r.visitor_id)).size },
    daily: [...dailyMap.entries()].map(([date, v]) => ({ date, views: v.views, visitors: v.visitors.size })),
    hourly,
    topPages: rank(rows, (r) => r.path, 10, false),
    referrers: rank(rows, (r) => r.referrer_host ?? (r.utm_source ? `utm: ${r.utm_source}` : "(truy cập trực tiếp)")),
    countries: rank(rows, (r) => r.country ?? "(không rõ)"),
    cities: rank(rows, (r) => (r.city ? `${r.city}${r.country ? `, ${r.country}` : ""}` : null)),
    devices: rank(rows, (r) => ({ desktop: "Máy tính", mobile: "Điện thoại", tablet: "Máy tính bảng" })[r.device ?? ""] ?? null),
    browsers: rank(rows, (r) => r.browser),
    os: rank(rows, (r) => r.os),
    languages: rank(rows, (r) => r.language?.split("-")[0] ?? null),
    hubs: rank(rows, (r) => (r.hub === "shop" ? "Cửa hàng /shop" : r.hub ? `/${r.hub}` : "Portfolio")),
    recent: rows.slice(0, 40),
    truncated: rows.length >= MAX_ROWS
  };
}

// ---------- Firmware ----------

export type FlashEventRow = {
  release_key: string;
  board: string | null;
  version: string | null;
  hub: string | null;
  event: "manifest" | "started" | "success" | "error";
  erase: boolean | null;
  error_message: string | null;
  created_at: string;
};

export type FirmwareStat = {
  releaseKey: string;
  board: string | null;
  version: string | null;
  hub: string | null;
  opened: number;
  started: number;
  success: number;
  error: number;
  erased: number;
  lastAt: string | null;
  lastErrors: string[];
};

export async function getFirmwareStats(sinceDays = 3650): Promise<FirmwareStat[]> {
  const since = new Date(Date.now() - sinceDays * 86400_000).toISOString();
  const rows = await selectRows<FlashEventRow>("firmware_flash_events", { gte: ["created_at", since], order: ["created_at", "desc"], limit: MAX_ROWS });
  const map = new Map<string, FirmwareStat>();
  for (const r of rows) {
    const s =
      map.get(r.release_key) ??
      ({ releaseKey: r.release_key, board: r.board, version: r.version, hub: r.hub, opened: 0, started: 0, success: 0, error: 0, erased: 0, lastAt: null, lastErrors: [] } as FirmwareStat);
    if (r.event === "manifest") s.opened += 1;
    if (r.event === "started") {
      s.started += 1;
      if (r.erase) s.erased += 1;
    }
    if (r.event === "success") s.success += 1;
    if (r.event === "error") {
      s.error += 1;
      if (r.error_message && s.lastErrors.length < 3) s.lastErrors.push(r.error_message);
    }
    s.lastAt = s.lastAt && s.lastAt > r.created_at ? s.lastAt : r.created_at;
    s.version ??= r.version;
    s.board ??= r.board;
    map.set(r.release_key, s);
  }
  return [...map.values()].sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
}
