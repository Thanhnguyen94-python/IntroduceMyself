import { DEMO_EVENTS, BALANCE_DAY, demoUuid, eventRange, pickWeighted, rng, type DemoWindow } from "@/lib/smt/demo";
import { DEMO_LINES } from "@/lib/smt/demo-config";
import { addDays, daysBetween } from "@/lib/smt/types";
import type { Engineer, EngineerLevel, EngineerRole, Task, TaskCategory, TaskPriority, TaskUpdate } from "@/lib/smt/team-types";

// Đội 8 kỹ sư DEMO (tên giả) với "tính cách" khác nhau để thấy cách chấm điểm công bằng:
// người nhận việc khó nhưng hay trễ, người làm nhiều việc dễ đúng hạn, junior hay bị trả lại...

type Profile = { onTime: number; quality: [number, number]; rework: number; diff: [number, number]; load: number };

const TEAM: Array<{ code: string; name: string; role: EngineerRole; level: EngineerLevel; lines: string; capacity: number; joined: string; p: Profile }> = [
  { code: "KS01", name: "Nguyễn Hoàng Nam", role: "process", level: "senior", lines: "L07,L08,L09,L10", capacity: 40, joined: "2019-03-01", p: { onTime: 0.82, quality: [4, 5], rework: 0.06, diff: [3, 5], load: 1 } },
  { code: "KS02", name: "Trần Thị Mai", role: "process", level: "mid", lines: "L01,L02,L03", capacity: 40, joined: "2021-06-15", p: { onTime: 0.92, quality: [3.5, 5], rework: 0.08, diff: [2, 4], load: 1 } },
  { code: "KS03", name: "Phạm Đức Huy", role: "equipment", level: "mid", lines: "L01,L02,L03,L04,L05,L06", capacity: 40, joined: "2020-09-01", p: { onTime: 0.95, quality: [3, 4.5], rework: 0.14, diff: [1, 3], load: 1.4 } },
  { code: "KS04", name: "Lê Văn Tài", role: "equipment", level: "senior", lines: "L07,L08,L09,L10", capacity: 40, joined: "2018-04-10", p: { onTime: 0.68, quality: [4, 5], rework: 0.04, diff: [3, 5], load: 1.3 } },
  { code: "KS05", name: "Võ Thu Hà", role: "quality", level: "mid", lines: "", capacity: 40, joined: "2022-02-14", p: { onTime: 0.88, quality: [3.5, 5], rework: 0.06, diff: [2, 4], load: 0.9 } },
  { code: "KS06", name: "Đặng Quốc Bảo", role: "program", level: "junior", lines: "", capacity: 40, joined: "2025-03-03", p: { onTime: 0.85, quality: [2.5, 4.5], rework: 0.24, diff: [1, 3], load: 1.1 } },
  { code: "KS07", name: "Bùi Thanh Tùng", role: "npi", level: "senior", lines: "L07,L08,L09,L10", capacity: 32, joined: "2017-11-20", p: { onTime: 0.84, quality: [3.5, 5], rework: 0.08, diff: [3, 5], load: 0.7 } },
  { code: "KS08", name: "Huỳnh Ngọc Lan", role: "process", level: "junior", lines: "L04,L05,L06", capacity: 40, joined: "2025-11-01", p: { onTime: 0.9, quality: [3, 4.5], rework: 0.12, diff: [1, 3], load: 1 } }
];

type Template = [category: TaskCategory, title: string, hours: number];

const TEMPLATES: Record<EngineerRole, Template[]> = {
  process: [
    ["improvement", "Giảm lỗi {defect} trên {line} model {model}", 16],
    ["program", "Tối ưu thông số Printer {line}: tốc độ & áp lực dao gạt", 6],
    ["4m", "Xác nhận thay đổi stencil {model} ({line})", 4],
    ["report", "Báo cáo chất lượng tuần {week} – {line}", 3],
    ["training", "Đào tạo operator Printer/SPI {line}", 4],
    ["improvement", "Phân tích Pareto lỗi tháng {month} – {line}", 6]
  ],
  equipment: [
    ["pm", "PM định kỳ feeder {line} Mounter {n}", 6],
    ["pm", "Hiệu chuẩn đầu hút & camera {line} Mounter {n}", 5],
    ["pm", "PM lò Reflow {line}: vệ sinh flux, đo profile KIC", 8],
    ["improvement", "Giảm dừng máy do feeder trên {line}", 12],
    ["report", "Báo cáo MTBF / MTTR tháng {month}", 3]
  ],
  quality: [
    ["report", "Báo cáo FPY / DPMO tháng {month}", 4],
    ["4m", "Audit hồ sơ 4M tháng {month}", 4],
    ["training", "Đào tạo IPC-A-610 cho QC {line}", 6],
    ["other", "Kiểm tra quản lý linh kiện MSL & tủ ẩm", 3]
  ],
  program: [
    ["program", "Lập chương trình AOI model {model}", 8],
    ["program", "Giảm false call AOI {line} model {model}", 6],
    ["program", "Chuyển chương trình Mounter {model} sang {line}", 5],
    ["program", "Tối ưu thư viện linh kiện AOI {line}", 6]
  ],
  npi: [
    ["npi", "Chạy thử NPI {model} rev {rev} trên {line}", 20],
    ["npi", "FAI lô đầu {model} ({line})", 6],
    ["npi", "Đánh giá DFM bo mạch {model} rev {rev}", 10],
    ["4m", "Xác nhận thay đổi PCB {model}", 6]
  ],
  lead: [["report", "Báo cáo tuần {week}", 3]]
};

const NOTES_PROGRESS = ["Đã thu thập dữ liệu, đang phân tích", "Đã chạy thử 50 board, kết quả tốt", "Chờ vật tư / máy rảnh để thử", "Đã làm xong 1/2 hạng mục", "Đang viết báo cáo kết quả"];
const NOTES_REWORK = ["Trả lại: thiếu dữ liệu xác nhận trước/sau", "Trả lại: chưa cập nhật tài liệu (WI/PFMEA)", "Trả lại: cần thử thêm trên model còn lại"];
const DEFECTS = ["BRG", "INS", "SHF", "TMB", "SBL"];

type Seed = {
  eng: string;
  category: TaskCategory;
  priority: TaskPriority;
  difficulty: number;
  title: string;
  line: string;
  ref?: string;
  assigned: string;
  hours: number;
  forceStatus?: Task["status"];
  doneOffset?: number; // số ngày sau ngày giao mà việc xong (ghi đè mô phỏng)
};

export function demoTeam(win: DemoWindow, refs: { eightD: Array<{ code: string; line: string; opened_on: string }>; changes: Array<{ code: string; line: string; change_date: string }> }) {
  const engineers: Engineer[] = TEAM.map((t) => ({ id: demoUuid(`eng|${t.code}`), code: t.code, name: t.name, role: t.role, level: t.level, lines: t.lines, capacity_h: t.capacity, joined_on: t.joined, active: true, note: "" }));
  const idOf = (code: string) => engineers.find((e) => e.code === code)!.id;
  const seeds: Seed[] = [];

  // 1) Việc định kỳ theo tuần cho từng người.
  for (const t of TEAM) {
    const lines = t.lines ? t.lines.split(",") : DEMO_LINES.map((l) => l.code);
    for (let w = win.from, wi = 0; w <= win.to; w = addDays(w, 7), wi++) {
      const r = rng(`tasks|${t.code}|${w}`);
      const count = (r() < 0.55 * t.p.load ? 1 : 0) + (r() < 0.18 * t.p.load ? 1 : 0);
      for (let k = 0; k < count; k++) {
        const [category, tpl, hours] = TEMPLATES[t.role][Math.floor(r() * TEMPLATES[t.role].length)];
        const lineCode = lines[Math.floor(r() * lines.length)];
        const line = DEMO_LINES.find((l) => l.code === lineCode)!;
        const model = line.models[Math.floor(r() * line.models.length)].model;
        const assigned = addDays(w, Math.floor(r() * 5));
        const title = tpl
          .replace("{line}", line.code)
          .replace("{model}", model)
          .replace("{defect}", DEFECTS[Math.floor(r() * DEFECTS.length)])
          .replace("{n}", String(1 + Math.floor(r() * line.stations.filter((s) => s.startsWith("Mounter")).length)))
          .replace("{week}", String(wi + 1))
          .replace("{month}", assigned.slice(5, 7) + "/" + assigned.slice(0, 4))
          .replace("{rev}", "ABCD"[Math.floor(r() * 4)]);
        const difficulty = Math.round(t.p.diff[0] + r() * (t.p.diff[1] - t.p.diff[0]));
        const priority = pickWeighted<TaskPriority>([["low", 2], ["medium", 5], ["high", 2.5], ["urgent", 0.5]], r());
        seeds.push({ eng: t.code, category, priority, difficulty, title, line: line.code, assigned, hours: Math.round(hours * (0.7 + difficulty * 0.15)) });
      }
    }
  }

  // 2) Việc gắn với sự kiện / 8D / 4M (có thật trong dữ liệu sản xuất demo).
  const ev = (id: string) => eventRange(DEMO_EVENTS.find((e) => e.id === id)!, win);
  const eightD = (line: string) => refs.eightD.find((r) => r.line === line)?.code ?? "";
  const event = (id: string, eng: string, category: TaskCategory, priority: TaskPriority, difficulty: number, title: string, line: string, dayOffset: number, hours: number, extra: Partial<Seed> = {}) => {
    const r = ev(id);
    const assigned = addDays(r.from, dayOffset);
    if (assigned > win.to) return;
    seeds.push({ eng, category, priority, difficulty, title, line, assigned, hours, ref: eightD(line), ...extra });
  };
  event("paste", "KS02", "8d", "urgent", 4, "8D thiếu thiếc L02: khoanh vùng & phân tích gốc (D3-D4)", "L02", 2, 16, { doneOffset: 9 });
  event("paste", "KS05", "8d", "high", 3, "Làm việc với NCC kem hàn về lot lỗi", "L02", 3, 6, { doneOffset: 12 });
  event("head", "KS03", "pm", "urgent", 4, "Sửa servo đầu hút Mounter 3 L05", "L05", 0, 14, { doneOffset: 11, ref: "" });
  event("head", "KS08", "improvement", "high", 4, "Cân bằng line L05 MCU-M7 (giảm CT nút thắt 36 → 33s)", "L05", 6, 18, { doneOffset: BALANCE_DAY - 96 - 6, ref: "" });
  event("npi", "KS07", "8d", "urgent", 5, "NPI ECU-A9 rev C: xử lý void BGA (8D khách hàng)", "L08", 3, 24, { doneOffset: 22 });
  event("npi", "KS01", "improvement", "high", 4, "Tối ưu profile Reflow N2 cho ECU-A9 rev C", "L08", 4, 12, { doneOffset: 7 });
  event("escape", "KS02", "8d", "urgent", 5, "8D khách hàng: chập thiếc U5 PSU-65W (L01)", "L01", 8, 28, { doneOffset: 21 });
  event("escape", "KS06", "program", "urgent", 3, "Siết ngưỡng AOI bridge QFN + khoá chương trình", "L01", 8, 4, { doneOffset: 3 });
  event("escape", "KS05", "4m", "high", 3, "D7: đưa thay đổi chương trình AOI vào quy trình 4M", "L01", 10, 6, { doneOffset: 10 });
  event("escape", "KS01", "improvement", "medium", 3, "Dự toán & đề xuất lắp M-AOI cho L01-L03", "L01", 12, 10, { forceStatus: "review" });
  event("highmix", "KS04", "improvement", "high", 4, "SMED L09: giảm thời gian đổi model 14 → 8 phút", "L09", 3, 24, { forceStatus: "doing", ref: "" });
  event("polarity", "KS08", "8d", "urgent", 3, "8D ngược cực diode D7 – INV-2K (L06)", "L06", 2, 16, { forceStatus: "doing" });
  event("polarity", "KS06", "program", "urgent", 2, "Rà M-AOI 100% D7 các lô INV-2K đã chạy", "L06", 2, 6, { forceStatus: "doing" });
  event("polarity", "KS05", "4m", "high", 2, "Đánh giá lại NCC cuộn diode (audit 4M Material)", "L06", 3, 6, { forceStatus: "todo" });
  // Việc xác nhận 4M: lấy vài thay đổi rủi ro cao.
  for (const c of refs.changes.filter((_, i) => i % 4 === 1)) {
    if (c.change_date > win.to) continue;
    seeds.push({ eng: c.line >= "L07" ? "KS01" : c.line >= "L04" ? "KS08" : "KS02", category: "4m", priority: "medium", difficulty: 2, title: `Xác nhận hiệu quả thay đổi ${c.code}`, line: c.line, ref: c.code, assigned: c.change_date, hours: 4 });
  }

  seeds.sort((a, b) => a.assigned.localeCompare(b.assigned));

  // 3) Mô phỏng tiến độ thực hiện theo "tính cách" từng người.
  const tasks: Task[] = [];
  const updates: TaskUpdate[] = [];
  const monthSeq = new Map<string, number>();
  for (const s of seeds) {
    const prof = TEAM.find((t) => t.code === s.eng)!;
    const r = rng(`task|${s.eng}|${s.assigned}|${s.title}`);
    const ym = s.assigned.slice(2, 4) + s.assigned.slice(5, 7);
    const n = (monthSeq.get(ym) ?? 0) + 1;
    monthSeq.set(ym, n);
    const code = `T-${ym}-${String(n).padStart(3, "0")}`;
    const id = demoUuid(`task|${code}`);
    const workDays = Math.ceil(s.hours / 3); // ~3 giờ / ngày dành cho mỗi việc
    const slack = 2 + Math.floor(r() * 4);
    // Việc sự kiện có ngày xong cố định -> hạn = ngày xong + 2 (đã thống nhất lại hạn khi giao).
    const due = s.doneOffset !== undefined ? addDays(s.assigned, s.doneOffset + 2) : addDays(s.assigned, workDays + slack + (s.priority === "urgent" ? -1 : 1));
    const start = addDays(s.assigned, Math.floor(r() * 2));
    const onTime = r() < prof.p.onTime + (s.difficulty <= 2 ? 0.05 : -0.04);
    let doneOn = s.doneOffset !== undefined ? addDays(s.assigned, s.doneOffset) : onTime ? addDays(due, -Math.floor(r() * slack)) : addDays(due, 1 + Math.floor(r() * (2 + s.difficulty * 1.5)));
    const rework = r() < prof.p.rework ? (r() < 0.2 ? 2 : 1) : 0;
    if (rework) doneOn = addDays(doneOn, 2 * rework);
    const quality = Math.max(1, Math.min(5, Math.round(prof.p.quality[0] + r() * (prof.p.quality[1] - prof.p.quality[0]) - rework * 0.5)));
    const actual = Math.round(s.hours * (onTime ? 0.8 + r() * 0.4 : 1.15 + r() * 0.45) * 2) / 2;

    let status: Task["status"] = "done";
    if (s.forceStatus) status = s.forceStatus;
    else if (doneOn > win.to) {
      if (start > win.to) status = "todo";
      else if (addDays(doneOn, -2) <= win.to) status = "review";
      else status = r() < 0.08 ? "blocked" : "doing";
    } else if (r() < 0.015) status = "cancelled";
    const span = Math.max(1, daysBetween(start, doneOn));
    const progress = status === "done" || status === "review" ? 100 : status === "todo" ? 0 : Math.min(90, Math.round((daysBetween(start, win.to) / span) * 100));
    const isDone = status === "done";

    tasks.push({
      id,
      code,
      title: s.title,
      description: "",
      category: s.category,
      priority: s.priority,
      difficulty: s.difficulty,
      assignee_id: idOf(s.eng),
      line: s.line,
      ref_code: s.ref ?? "",
      status,
      progress: Math.max(0, progress),
      assigned_on: s.assigned,
      start_on: status === "todo" ? null : start,
      due_on: due,
      done_on: isDone ? doneOn : null,
      estimate_h: s.hours,
      actual_h: isDone || status === "review" ? actual : Math.round(actual * (progress / 100) * 2) / 2,
      quality_score: isDone ? quality : null,
      rework_count: isDone ? rework : 0,
      follow_up_on: !isDone && status !== "todo" && r() < 0.35 ? addDays(due, -2) : null
    });

    // Nhật ký: giao việc -> bắt đầu -> tiến độ -> (trả lại) -> chờ nghiệm thu -> nghiệm thu.
    let u = 0;
    const log = (at: string, kind: TaskUpdate["kind"], note: string, extra: Partial<TaskUpdate> = {}) => {
      if (at > win.to) return;
      updates.push({ id: demoUuid(`upd|${code}|${u++}`), task_id: id, at, kind, status: "", progress: null, hours: 0, author: prof.name, note, ...extra });
    };
    log(s.assigned, "status", "Giao việc", { status: "todo", author: "Mr Jay" });
    if (status === "todo" || status === "cancelled") continue;
    log(start, "status", "Bắt đầu thực hiện", { status: "doing", progress: 10 });
    const mid = addDays(start, Math.floor(span / 2));
    log(mid, "progress", NOTES_PROGRESS[Math.floor(r() * NOTES_PROGRESS.length)], { progress: 50, hours: Math.round(actual * 0.4) });
    if (status === "blocked") log(addDays(mid, 1), "status", "Chờ phụ tùng / chờ máy rảnh để thử", { status: "blocked" });
    for (let k = 0; k < (isDone ? rework : 0); k++) {
      log(addDays(doneOn, -2 * (rework - k) - 1), "status", "Gửi nghiệm thu", { status: "review", progress: 100 });
      log(addDays(doneOn, -2 * (rework - k)), "rework", NOTES_REWORK[k % NOTES_REWORK.length], { status: "doing", author: "Mr Jay" });
    }
    if (isDone || status === "review") log(isDone ? addDays(doneOn, -1) : addDays(doneOn, -2), "status", "Gửi nghiệm thu", { status: "review", progress: 100, hours: Math.round(actual * 0.6) });
    if (isDone) log(doneOn, "review", `Nghiệm thu: ${quality}/5`, { status: "done", author: "Mr Jay" });
  }

  return { engineers, tasks, updates };
}
