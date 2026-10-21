import { aiComplete, aiStatus } from "@/lib/ai/provider";
import { insertRow, selectRows } from "@/lib/data/table-store";
import { listChannels, messagesBetween, openIssues } from "@/lib/smt/chat-store";
import { oeeOf } from "@/lib/smt/metrics";
import { listDataset, readSmtSettings } from "@/lib/smt/store";
import { OPEN_STATUSES, type Engineer, type Task, type TaskUpdate } from "@/lib/smt/team-types";
import { addDays, todayVn } from "@/lib/smt/types";
import type { DefectLog, ProductionLog } from "@/lib/smt/types";
import { readWorkspaceSettings, type WorkspaceSettings } from "@/lib/smt/workspace-settings";

// Báo cáo tự động của đội (chỉ dữ liệu thật). Không cần cron chính xác:
//  - Mỗi lần có người mở /smt (tối đa 5 phút / lần), hoặc khi gọi /api/smt/reports/run, hệ thống kiểm tra
//    mốc chốt gần nhất theo lịch (Cài đặt → Lịch báo cáo) và tạo báo cáo nếu chưa có.
//  - Báo cáo luôn tổng hợp đúng khoảng [mốc trước, mốc này] dù được tạo trễ.
// Tóm tắt chat bằng AI chỉ chạy khi admin bật và đã đặt AI_API_KEY.

export type AutoReport = { id: string; kind: "daily" | "weekly"; slot: string; period_from: string; period_to: string; payload: ReportPayload; ai_summary: string; created_at: string };

export type ReportPayload = {
  tasks: {
    assigned: number;
    done: Array<{ code: string; title: string; who: string; late: boolean }>;
    submitted: number;
    returned: Array<{ code: string; title: string; who: string; note: string }>;
    overdue: Array<{ code: string; title: string; who: string; due: string }>;
    awaitingReview: number;
    proposals: number;
    silent: Array<{ name: string; open: number }>;
    perEngineer: Array<{ name: string; updates: number; done: number; open: number; overdue: number }>;
  };
  chat: { messages: number; byChannel: Array<{ name: string; count: number }>; issuesOpened: number; issuesResolved: number; openIssues: Array<{ channel: string; who: string; body: string; at: string }> };
  production: { days: string[]; boards: number; oee: number; fpy: number; lines: Array<{ line: string; boards: number; oee: number; fpy: number }>; topDefects: Array<{ code: string; qty: number }>; missing: string[] } | null;
};

// "Giờ VN" -> ISO UTC
const vnIso = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();
const vnWeekday = (date: string) => ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1; // 1 = Thứ Hai

// Mốc chốt gần nhất đã qua + mốc liền trước nó.
export function latestSlots(s: WorkspaceSettings, now = new Date()) {
  const out: Array<{ kind: AutoReport["kind"]; slot: string; from: string; to: string }> = [];
  const today = todayVn();
  const nowIso = now.toISOString();
  if (s.reports.dailyTimes.length) {
    const marks: Array<{ date: string; time: string }> = [];
    for (const d of [addDays(today, -1), today]) for (const t of s.reports.dailyTimes) marks.push({ date: d, time: t });
    const past = marks.filter((m) => vnIso(m.date, m.time) <= nowIso);
    const last = past[past.length - 1];
    const prev = past[past.length - 2] ?? { date: addDays(last?.date ?? today, -1), time: s.reports.dailyTimes[s.reports.dailyTimes.length - 1] };
    if (last) out.push({ kind: "daily", slot: `${last.date} ${last.time}`, from: vnIso(prev.date, prev.time), to: vnIso(last.date, last.time) });
  }
  if (s.reports.weeklyEnabled) {
    let d = today;
    while (vnWeekday(d) !== s.reports.weeklyDay) d = addDays(d, -1);
    if (vnIso(d, s.reports.weeklyTime) > nowIso) d = addDays(d, -7);
    out.push({ kind: "weekly", slot: `${d} ${s.reports.weeklyTime}`, from: vnIso(addDays(d, -7), s.reports.weeklyTime), to: vnIso(d, s.reports.weeklyTime) });
  }
  return out;
}

const vnDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);

export async function buildPayload(from: string, to: string): Promise<ReportPayload> {
  const live = { is_demo: false };
  const [engineers, tasks, updates, settings] = await Promise.all([
    selectRows<Engineer>("smt_engineers", { eq: live, limit: 500 }),
    selectRows<Task & { created_at: string }>("smt_tasks", { eq: live, limit: 20_000 }),
    selectRows<TaskUpdate & { created_at: string }>("smt_task_updates", { eq: live, gt: ["created_at", from], lte: ["created_at", to], limit: 50_000 }),
    readSmtSettings()
  ]);
  const who = (id: string | null) => engineers.find((e) => e.id === id)?.name ?? "—";
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const today = todayVn();
  const open = tasks.filter((t) => OPEN_STATUSES.includes(t.status) && t.approved !== false);
  const doneUpd = updates.filter((u) => u.kind === "review" && u.status === "done");
  const reworkUpd = updates.filter((u) => u.kind === "rework");
  const touched = new Set(updates.map((u) => u.task_id));

  const perEngineer = engineers
    .filter((e) => e.active)
    .map((e) => {
      const mine = open.filter((t) => t.assignee_id === e.id);
      return {
        name: e.name,
        updates: updates.filter((u) => byId.get(u.task_id)?.assignee_id === e.id).length,
        done: doneUpd.filter((u) => byId.get(u.task_id)?.assignee_id === e.id).length,
        open: mine.length,
        overdue: mine.filter((t) => t.due_on && t.due_on < today).length
      };
    });

  const [messages, channels, issues] = await Promise.all([messagesBetween(from, to), listChannels(settings, true), openIssues(200)]);
  const chName = (id: string) => channels.find((c) => c.id === id)?.name ?? "?";
  const byChannel = new Map<string, number>();
  for (const m of messages) byChannel.set(chName(m.channel_id), (byChannel.get(chName(m.channel_id)) ?? 0) + 1);

  // Sản xuất: các ngày nằm trong kỳ (theo ngày VN).
  const days: string[] = [];
  for (let d = vnDate(from); d <= vnDate(to); d = addDays(d, 1)) days.push(d);
  let production: ReportPayload["production"] = null;
  if (days.length) {
    const [logs, defects] = await Promise.all([
      listDataset<ProductionLog>("production", { from: days[0], to: days[days.length - 1], limit: 50_000 }),
      listDataset<DefectLog>("defects", { from: days[0], to: days[days.length - 1], limit: 50_000 })
    ]);
    const total = oeeOf(logs);
    const codes = new Map<string, number>();
    for (const d of defects) codes.set(d.defect_code, (codes.get(d.defect_code) ?? 0) + d.qty);
    const last = days[days.length - 1];
    production = {
      days,
      boards: total.total,
      oee: total.oee,
      fpy: total.quality,
      lines: settings.lines.map((l) => {
        const o = oeeOf(logs.filter((x) => x.line === l.code));
        return { line: l.code, boards: o.total, oee: o.oee, fpy: o.quality };
      }),
      topDefects: [...codes].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code, qty]) => ({ code, qty })),
      // Line chưa có nhật ký sản xuất của ngày cuối kỳ -> nhắc trợ lý nhập.
      missing: settings.lines.filter((l) => !logs.some((x) => x.line === l.code && x.log_date === last)).map((l) => l.code)
    };
  }

  return {
    tasks: {
      assigned: tasks.filter((t) => t.created_at > from && t.created_at <= to).length,
      done: doneUpd.map((u) => byId.get(u.task_id)).filter((t): t is NonNullable<typeof t> => Boolean(t)).map((t) => ({ code: t.code, title: t.title, who: who(t.assignee_id), late: Boolean(t.due_on && t.done_on && t.done_on > t.due_on) })),
      submitted: updates.filter((u) => u.kind === "status" && u.status === "review").length,
      returned: reworkUpd.map((u) => ({ code: byId.get(u.task_id)?.code ?? "?", title: byId.get(u.task_id)?.title ?? "", who: who(byId.get(u.task_id)?.assignee_id ?? null), note: u.note })),
      overdue: open.filter((t) => t.status !== "review" && t.due_on && t.due_on < today).map((t) => ({ code: t.code, title: t.title, who: who(t.assignee_id), due: t.due_on! })),
      awaitingReview: open.filter((t) => t.status === "review").length,
      proposals: tasks.filter((t) => t.approved === false && OPEN_STATUSES.includes(t.status)).length,
      // Có việc "Đang làm" nhưng cả kỳ không cập nhật dòng nào.
      silent: engineers
        .filter((e) => e.active && open.some((t) => t.assignee_id === e.id && t.status === "doing") && !open.some((t) => t.assignee_id === e.id && touched.has(t.id)))
        .map((e) => ({ name: e.name, open: open.filter((t) => t.assignee_id === e.id).length })),
      perEngineer
    },
    chat: {
      messages: messages.length,
      byChannel: [...byChannel].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      issuesOpened: messages.filter((m) => m.is_issue).length,
      issuesResolved: messages.filter((m) => m.is_issue && m.resolved).length,
      openIssues: issues.slice(0, 15).map((m) => ({ channel: chName(m.channel_id), who: m.author_name, body: m.body.slice(0, 200), at: m.created_at }))
    },
    production
  };
}

async function aiSummary(from: string, to: string) {
  const messages = await messagesBetween(from, to);
  if (!messages.length) return "";
  const text = messages
    .slice(-400)
    .map((m) => `[${m.created_at.slice(5, 16).replace("T", " ")}] ${m.author_name}${m.is_issue ? " (VẤN ĐỀ)" : ""}${m.line ? ` [${m.line}]` : ""}: ${m.body.slice(0, 500)}`)
    .join("\n");
  return aiComplete(
    "Bạn là trợ lý tổng hợp cho trưởng bộ phận kỹ thuật SMT. Viết tiếng Việt, ngắn gọn, gạch đầu dòng. Chỉ dùng thông tin có trong tin nhắn, không suy đoán.",
    `Tóm tắt các tin nhắn nhóm kỹ sư SMT dưới đây thành 4 mục: 1) Vấn đề phát sinh (line, model, lỗi), 2) Quyết định đã chốt, 3) Việc cần làm (ai làm, hạn nếu có), 4) Việc còn treo cần quản lý xử lý.\n\n${text}`
  );
}

export async function generateReport(kind: AutoReport["kind"], slot: string, from: string, to: string, withAi: boolean) {
  const payload = await buildPayload(from, to);
  let ai = "";
  if (withAi && aiStatus().configured) {
    try {
      ai = await aiSummary(from, to);
    } catch (e) {
      ai = `(Không tạo được tóm tắt AI: ${e instanceof Error ? e.message : "lỗi"})`;
    }
  }
  try {
    return await insertRow("smt_auto_reports", { kind, slot, period_from: from, period_to: to, payload, ai_summary: ai, updated_at: new Date().toISOString() });
  } catch (e) {
    // 2 request tạo cùng mốc một lúc: bản sau gặp unique (kind, slot) -> bỏ qua.
    if (String(e).includes("duplicate")) return null;
    throw e;
  }
}

let lastCheck = 0;

// Tạo báo cáo cho các mốc đã đến hạn mà chưa có. throttle = giới hạn 5 phút / lần trên mỗi server.
export async function ensureDueReports(throttle = true) {
  if (throttle && Date.now() - lastCheck < 5 * 60_000) return 0;
  lastCheck = Date.now();
  const s = await readWorkspaceSettings();
  if (!s.reports.enabled) return 0;
  let made = 0;
  for (const slot of latestSlots(s)) {
    const exists = await selectRows("smt_auto_reports", { eq: { kind: slot.kind, slot: slot.slot }, columns: "id", limit: 1 });
    if (exists.length) continue;
    if (await generateReport(slot.kind, slot.slot, slot.from, slot.to, s.aiSummary)) made++;
  }
  return made;
}

export async function listReports(limit = 60) {
  return selectRows<AutoReport>("smt_auto_reports", { order: ["period_to", "desc"], limit });
}
