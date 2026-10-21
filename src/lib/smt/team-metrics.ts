import { addDays, daysBetween } from "@/lib/smt/types";
import { OPEN_STATUSES, priorityOf, type Engineer, type Task, type TaskUpdate } from "@/lib/smt/team-types";

// Chỉ số đánh giá kỹ sư (thuần, không I/O). Công thức hiển thị công khai trên trang Đội ngũ để
// mọi người hiểu vì sao có điểm đó.
//
//  Điểm việc        = Độ khó (1-5) × Hệ số ưu tiên (Thấp 0.8 · TB 1 · Cao 1.3 · Khẩn 1.6)
//  Đúng hạn         = Việc xong đúng hạn / (Việc xong có hạn + Việc đang mở đã quá hạn)
//                     -> giữ việc quá hạn không đóng cũng bị tính là trễ.
//  Chất lượng       = (Điểm nghiệm thu TB − 1) / 4          (thang 1-5 -> 0-100%)
//  Làm đúng lần đầu = Việc xong không bị trả lại / Việc xong
//  Khối lượng       = Điểm việc xong / (giờ cam kết tuần / 40) so với trung vị của nhóm (tối đa 100%)
//
//  Điểm tổng (0-100) = 35% Đúng hạn + 25% Chất lượng + 15% Làm đúng lần đầu + 25% Khối lượng
//  Ít hơn 3 việc xong trong kỳ -> đánh dấu "chưa đủ dữ liệu", không nên dùng để xếp hạng.

export const SCORE_WEIGHTS = { onTime: 0.35, quality: 0.25, firstPass: 0.15, output: 0.25 };
export const MIN_DONE = 3;

export const taskPoints = (t: Pick<Task, "difficulty" | "priority">) => Math.max(1, Math.min(5, t.difficulty || 1)) * priorityOf(t.priority).weight;

const isOpen = (t: Task) => OPEN_STATUSES.includes(t.status);
const safe = (a: number, b: number) => (b > 0 ? a / b : 0);

export type EngineerScore = {
  engineer: Engineer;
  done: number;
  points: number;
  onTime: number;
  late: number;
  avgDelay: number;
  quality: number;
  qualityAvg: number;
  firstPass: number;
  output: number;
  estimateRatio: number;
  open: number;
  openPoints: number;
  overdue: number;
  blocked: number;
  score: number;
  enough: boolean;
  byCategory: Array<{ category: string; points: number }>;
};

export function scoreTeam(engineers: Engineer[], tasks: Task[], from: string, to: string): EngineerScore[] {
  const inPeriod = (d: string | null) => Boolean(d && d >= from && d <= to);
  const rows = engineers
    .filter((e) => e.active)
    .map((engineer) => {
      const mine = tasks.filter((t) => t.assignee_id === engineer.id && t.status !== "cancelled");
      const done = mine.filter((t) => t.status === "done" && inPeriod(t.done_on));
      const open = mine.filter(isOpen);
      const overdue = open.filter((t) => t.due_on && t.due_on < to);
      const withDue = done.filter((t) => t.due_on);
      const onTimeDone = withDue.filter((t) => t.done_on! <= t.due_on!);
      const lateDone = withDue.filter((t) => t.done_on! > t.due_on!);
      const scored = done.filter((t) => t.quality_score);
      const qualityAvg = safe(scored.reduce((s, t) => s + (t.quality_score ?? 0), 0), scored.length);
      const points = done.reduce((s, t) => s + taskPoints(t), 0);
      const est = done.reduce((s, t) => s + t.estimate_h, 0);
      const act = done.reduce((s, t) => s + t.actual_h, 0);
      const cat = new Map<string, number>();
      for (const t of done) cat.set(t.category, (cat.get(t.category) ?? 0) + taskPoints(t));
      return {
        engineer,
        done: done.length,
        points,
        onTime: safe(onTimeDone.length, withDue.length + overdue.length),
        late: lateDone.length + overdue.length,
        avgDelay: safe(lateDone.reduce((s, t) => s + daysBetween(t.due_on!, t.done_on!), 0), lateDone.length),
        quality: scored.length ? (qualityAvg - 1) / 4 : 0,
        qualityAvg,
        firstPass: safe(done.filter((t) => t.rework_count === 0).length, done.length),
        // Chuẩn hoá theo giờ cam kết: người làm bán thời gian cho dự án không bị thiệt.
        output: points / Math.max(0.25, (engineer.capacity_h || 40) / 40),
        estimateRatio: safe(est, act),
        open: open.length,
        openPoints: open.reduce((s, t) => s + taskPoints(t), 0),
        overdue: overdue.length,
        blocked: open.filter((t) => t.status === "blocked").length,
        score: 0,
        enough: done.length >= MIN_DONE,
        byCategory: [...cat].map(([category, p]) => ({ category, points: p })).sort((a, b) => b.points - a.points)
      };
    });

  const outputs = rows.filter((r) => r.done > 0).map((r) => r.output).sort((a, b) => a - b);
  const median = outputs.length ? outputs[Math.floor((outputs.length - 1) / 2)] : 0;
  for (const r of rows) {
    const outputIdx = median > 0 ? Math.min(1, r.output / median) : 0;
    r.score = Math.round(100 * (SCORE_WEIGHTS.onTime * r.onTime + SCORE_WEIGHTS.quality * r.quality + SCORE_WEIGHTS.firstPass * r.firstPass + SCORE_WEIGHTS.output * outputIdx));
  }
  return rows.sort((a, b) => Number(b.enough) - Number(a.enough) || b.score - a.score);
}

// Danh sách "không được quên" của người quản lý.
export function followUps(tasks: Task[], updates: TaskUpdate[], today: string) {
  const open = tasks.filter(isOpen);
  const lastTouch = new Map<string, string>();
  for (const u of updates) if ((lastTouch.get(u.task_id) ?? "") < u.at) lastTouch.set(u.task_id, u.at);
  const touched = (t: Task) => lastTouch.get(t.id) ?? t.start_on ?? t.assigned_on;
  const byDue = (a: Task, b: Task) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999");
  return {
    overdue: open.filter((t) => t.status !== "review" && t.due_on && t.due_on < today).sort(byDue),
    review: open.filter((t) => t.status === "review").sort(byDue),
    blocked: open.filter((t) => t.status === "blocked").sort(byDue),
    followUp: open.filter((t) => t.follow_up_on && t.follow_up_on <= today).sort(byDue),
    dueSoon: open.filter((t) => t.status !== "review" && t.due_on && t.due_on >= today && t.due_on <= addDays(today, 7)).sort(byDue),
    // Việc đang làm mà 7 ngày không có cập nhật nào -> nên hỏi lại.
    stale: open.filter((t) => t.status === "doing" && daysBetween(touched(t), today) >= 7).sort(byDue)
  };
}

// Số việc giao / hoàn thành theo tuần (để xem nhịp làm việc của nhóm).
export function weeklyFlow(tasks: Task[], from: string, to: string) {
  const weeks: Array<{ week: string; assigned: number; done: number; late: number }> = [];
  for (let w = from; w <= to; w = addDays(w, 7)) {
    const end = addDays(w, 6);
    const inW = (d: string | null) => Boolean(d && d >= w && d <= end);
    const done = tasks.filter((t) => t.status === "done" && inW(t.done_on));
    weeks.push({ week: w, assigned: tasks.filter((t) => inW(t.assigned_on)).length, done: done.length, late: done.filter((t) => t.due_on && t.done_on! > t.due_on).length });
  }
  return weeks;
}
