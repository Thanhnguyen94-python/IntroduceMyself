// Đội ngũ kỹ sư & công việc (smt_engineers, smt_tasks, smt_task_updates). Dùng chung client + server.

export type EngineerRole = "process" | "equipment" | "quality" | "npi" | "program" | "lead";
export type EngineerLevel = "junior" | "mid" | "senior" | "lead";

export const ENGINEER_ROLES: Array<{ id: EngineerRole; vi: string; en: string }> = [
  { id: "process", vi: "Kỹ sư công nghệ (Process)", en: "Process engineer" },
  { id: "equipment", vi: "Kỹ sư thiết bị", en: "Equipment engineer" },
  { id: "quality", vi: "Kỹ sư chất lượng", en: "Quality engineer" },
  { id: "npi", vi: "Kỹ sư NPI", en: "NPI engineer" },
  { id: "program", vi: "Lập trình AOI/SPI/Mounter", en: "Programmer (AOI/SPI/Mounter)" },
  { id: "lead", vi: "Trưởng nhóm", en: "Team lead" }
];

export const ENGINEER_LEVELS: Array<{ id: EngineerLevel; vi: string; en: string }> = [
  { id: "junior", vi: "Junior", en: "Junior" },
  { id: "mid", vi: "Mid", en: "Mid" },
  { id: "senior", vi: "Senior", en: "Senior" },
  { id: "lead", vi: "Lead", en: "Lead" }
];

export type Engineer = {
  id: string;
  code: string;
  name: string;
  role: EngineerRole;
  level: EngineerLevel;
  lines: string;
  capacity_h: number;
  joined_on: string | null;
  active: boolean;
  note: string;
};

export type TaskCategory = "8d" | "4m" | "improvement" | "pm" | "npi" | "program" | "training" | "report" | "other";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "doing" | "blocked" | "review" | "done" | "cancelled";

export const TASK_CATEGORIES: Array<{ id: TaskCategory; icon: string; vi: string; en: string }> = [
  { id: "8d", icon: "🧭", vi: "8D / khiếu nại", en: "8D / complaint" },
  { id: "4m", icon: "🔁", vi: "Thay đổi 4M", en: "4M change" },
  { id: "improvement", icon: "📈", vi: "Cải tiến", en: "Improvement" },
  { id: "pm", icon: "🛠️", vi: "Bảo dưỡng (PM)", en: "Maintenance (PM)" },
  { id: "npi", icon: "🚀", vi: "NPI / model mới", en: "NPI / new model" },
  { id: "program", icon: "💾", vi: "Lập trình", en: "Programming" },
  { id: "training", icon: "🎓", vi: "Đào tạo", en: "Training" },
  { id: "report", icon: "📝", vi: "Báo cáo", en: "Report" },
  { id: "other", icon: "📌", vi: "Khác", en: "Other" }
];

export const TASK_PRIORITIES: Array<{ id: TaskPriority; vi: string; en: string; weight: number }> = [
  { id: "low", vi: "Thấp", en: "Low", weight: 0.8 },
  { id: "medium", vi: "Trung bình", en: "Medium", weight: 1 },
  { id: "high", vi: "Cao", en: "High", weight: 1.3 },
  { id: "urgent", vi: "Khẩn", en: "Urgent", weight: 1.6 }
];

export const TASK_STATUSES: Array<{ id: TaskStatus; vi: string; en: string }> = [
  { id: "todo", vi: "Chưa làm", en: "To do" },
  { id: "doing", vi: "Đang làm", en: "In progress" },
  { id: "blocked", vi: "Bị chặn", en: "Blocked" },
  { id: "review", vi: "Chờ nghiệm thu", en: "Awaiting review" },
  { id: "done", vi: "Hoàn thành", en: "Done" },
  { id: "cancelled", vi: "Huỷ", en: "Cancelled" }
];

export const OPEN_STATUSES: TaskStatus[] = ["todo", "doing", "blocked", "review"];

export type Task = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  difficulty: number;
  assignee_id: string | null;
  line: string;
  ref_code: string;
  status: TaskStatus;
  progress: number;
  assigned_on: string;
  start_on: string | null;
  due_on: string | null;
  done_on: string | null;
  estimate_h: number;
  actual_h: number;
  quality_score: number | null;
  rework_count: number;
  follow_up_on: string | null;
  updated_at?: string;
};

export type TaskUpdate = {
  id: string;
  task_id: string;
  at: string;
  kind: "note" | "status" | "progress" | "review" | "rework";
  status: string;
  progress: number | null;
  hours: number;
  author: string;
  note: string;
};

export const roleLabel = (id: string) => ENGINEER_ROLES.find((r) => r.id === id);
export const categoryOf = (id: string) => TASK_CATEGORIES.find((c) => c.id === id) ?? TASK_CATEGORIES[TASK_CATEGORIES.length - 1];
export const statusOf = (id: string) => TASK_STATUSES.find((s) => s.id === id) ?? TASK_STATUSES[0];
export const priorityOf = (id: string) => TASK_PRIORITIES.find((p) => p.id === id) ?? TASK_PRIORITIES[1];
