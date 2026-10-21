// Kiểu dữ liệu Hệ thống báo cáo SMT. Dùng chung client + server (không import gì của Node).
// Tên trường = tên cột Supabase (snake_case) để Excel / API / DB khớp nhau 1-1.
import type { SmtModule } from "@/lib/smt/modules";

export type SmtProcess = "print" | "placement" | "reflow" | "inspection" | "manual" | "material" | "other";

export const SMT_PROCESSES: Array<{ id: SmtProcess; vi: string; en: string }> = [
  { id: "print", vi: "In kem (Printer)", en: "Solder paste printing" },
  { id: "placement", vi: "Gắn linh kiện (Mounter)", en: "Placement" },
  { id: "reflow", vi: "Lò hàn (Reflow)", en: "Reflow" },
  { id: "inspection", vi: "Kiểm tra (SPI/AOI)", en: "Inspection" },
  { id: "manual", vi: "Thao tác tay / Rework", en: "Manual / Rework" },
  { id: "material", vi: "Vật tư / PCB", en: "Material / PCB" },
  { id: "other", vi: "Khác", en: "Other" }
];

// M-AOI = AOI đặt sau Mounter, trước lò: bắt lỗi gắn linh kiện khi còn sửa dễ (chưa hàn).
export const DETECT_POINTS = ["SPI", "M-AOI", "AOI", "AXI", "ICT", "FCT", "Visual", "Customer"] as const;

export type ProductionLog = {
  id: string;
  log_date: string;
  shift: string;
  line: string;
  model: string;
  work_order: string;
  planned_min: number;
  downtime_min: number;
  downtime_reason: string;
  ideal_ct_sec: number;
  total_qty: number;
  good_qty: number;
  opportunities: number;
  note: string;
};

export type DefectLog = {
  id: string;
  log_date: string;
  shift: string;
  line: string;
  model: string;
  defect_code: string;
  process: SmtProcess;
  detected_by: string;
  location: string;
  part_no: string;
  qty: number;
  root_cause: string;
  action: string;
};

export type CycleTime = {
  id: string;
  measured_on: string;
  line: string;
  model: string;
  station: string;
  cycle_time_sec: number;
  note: string;
};

export type ChangeCategory = "man" | "machine" | "material" | "method" | "environment";

export const CHANGE_CATEGORIES: Array<{ id: ChangeCategory; short: string; vi: string; en: string }> = [
  { id: "man", short: "Man", vi: "Con người", en: "Man" },
  { id: "machine", short: "Machine", vi: "Máy móc", en: "Machine" },
  { id: "material", short: "Material", vi: "Vật liệu", en: "Material" },
  { id: "method", short: "Method", vi: "Phương pháp", en: "Method" },
  { id: "environment", short: "Environment", vi: "Môi trường", en: "Environment" }
];

export type ChangeLog = {
  id: string;
  code: string;
  change_date: string;
  category: ChangeCategory;
  line: string;
  model: string;
  item: string;
  before_state: string;
  after_state: string;
  reason: string;
  risk: "low" | "medium" | "high";
  validation: string;
  result: "pending" | "ok" | "ng";
  status: "planned" | "implemented" | "verified" | "rejected";
  owner: string;
  approved_by: string;
  is_public: boolean;
  note: string;
};

export type Asset = {
  id: string;
  asset_type: "feeder" | "nozzle";
  code: string;
  spec: string;
  machine: string;
  status: "active" | "maintenance" | "retired";
  last_pm_on: string | null;
  pm_interval_days: number;
  note: string;
};

export type AssetLog = {
  id: string;
  asset_id: string;
  log_date: string;
  event: "usage" | "pm" | "repair" | "calibration" | "inspection";
  picks: number;
  mispicks: number;
  result: "ok" | "ng";
  technician: string;
  note: string;
};

// ===== 8D (AIAG / VDA) =====
export type EightDStatus = "open" | "containment" | "analysis" | "action" | "verification" | "closed";

export const EIGHT_D_STATUS: Array<{ id: EightDStatus; vi: string; en: string }> = [
  { id: "open", vi: "Mới mở", en: "Open" },
  { id: "containment", vi: "Đang khoanh vùng (D3)", en: "Containment (D3)" },
  { id: "analysis", vi: "Phân tích gốc (D4)", en: "Root cause (D4)" },
  { id: "action", vi: "Khắc phục (D5-D6)", en: "Corrective action (D5-D6)" },
  { id: "verification", vi: "Xác nhận hiệu quả", en: "Verification" },
  { id: "closed", vi: "Đã đóng (D8)", en: "Closed (D8)" }
];

export type ActionItem = { action: string; owner: string; due: string; status: "open" | "done"; result: string };

// Fishbone 6M: Man, Machine, Material, Method, Measurement, Environment (Mother Nature).
export const FISHBONE_BRANCHES = [
  { id: "man", vi: "Con người", en: "Man" },
  { id: "machine", vi: "Máy móc", en: "Machine" },
  { id: "material", vi: "Vật liệu", en: "Material" },
  { id: "method", vi: "Phương pháp", en: "Method" },
  { id: "measurement", vi: "Đo lường", en: "Measurement" },
  { id: "environment", vi: "Môi trường", en: "Environment" }
] as const;
export type FishboneBranch = (typeof FISHBONE_BRANCHES)[number]["id"];

export type EightDContent = {
  d0: { symptom: string; emergencyAction: string; need8d: string };
  d1: { team: Array<{ name: string; role: string; dept: string }> };
  d2: { what: string; where: string; when: string; who: string; why: string; how: string; howMany: string; statement: string };
  d3: { actions: ActionItem[]; stockCheck: string };
  d4: {
    fishbone: Record<FishboneBranch, string[]>;
    // 5 Why cho 2 nhánh: vì sao lỗi xảy ra & vì sao lỗi lọt (không phát hiện được)
    whyOccur: string[];
    whyEscape: string[];
    rootOccur: string;
    rootEscape: string;
    verification: string;
  };
  d5: { actions: ActionItem[] };
  d6: { actions: ActionItem[]; effectiveness: string };
  d7: { actions: ActionItem[]; documents: string[] };
  d8: { recognition: string; lessons: string; closedBy: string };
};

export type EightDReport = {
  id: string;
  code: string;
  title: string;
  status: EightDStatus;
  severity: "minor" | "major" | "critical";
  customer: string;
  line: string;
  model: string;
  defect_code: string;
  owner: string;
  opened_on: string;
  due_on: string | null;
  closed_on: string | null;
  content: EightDContent;
  is_public: boolean;
  updated_at?: string;
};

// ===== Cài đặt (site_content['smt_settings']) =====
export type SmtLine = { code: string; name: string; stations: string[]; taktSec: number };
export type DefectType = { code: string; vi: string; en: string; process: SmtProcess };

export type SmtSettings = {
  company: string;
  lines: SmtLine[];
  shifts: string[];
  defectCatalog: DefectType[];
  targets: { oee: number; fpy: number; dpmo: number; mispickRate: number; availability: number };
  // Trang công khai dùng dữ liệu demo (mặc định) hay số liệu thật đã tổng hợp.
  publicSource: "demo" | "live";
  publicDays: number;
  // Phạm vi quản lý: nhóm nội dung hiện trên /smt (xem modules.ts). Demo luôn hiện đủ trừ khi bật modulesInDemo.
  modules: SmtModule[];
  modulesInDemo: boolean;
};

// Gói dữ liệu đưa vào các báo cáo (server -> client).
export type SmtDataBundle = {
  production: ProductionLog[];
  defects: DefectLog[];
  cycleTimes: CycleTime[];
  changes: ChangeLog[];
  assets: Asset[];
  assetLogs: AssetLog[];
  eightD: EightDReport[];
};

export type ReportSlug = "8d" | "4m1e" | "oee-line-balance" | "yield-pareto" | "feeder-nozzle";

// ===== Tiện ích =====
export const pct = (v: number, digits = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(digits)}%` : "—");
export const num = (v: number, digits = 0) => (Number.isFinite(v) ? v.toLocaleString("vi-VN", { maximumFractionDigits: digits }) : "—");
export const ddmm = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().slice(0, 2).join("/") : "");
export const dmy = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

// Ngày hôm nay theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD.
export function todayVn(offsetDays = 0) {
  return new Date(Date.now() + 7 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((new Date(`${toIso}T00:00:00Z`).getTime() - new Date(`${fromIso}T00:00:00Z`).getTime()) / 86400_000);
}

export function emptyEightDContent(): EightDContent {
  return {
    d0: { symptom: "", emergencyAction: "", need8d: "" },
    d1: { team: [] },
    d2: { what: "", where: "", when: "", who: "", why: "", how: "", howMany: "", statement: "" },
    d3: { actions: [], stockCheck: "" },
    d4: {
      fishbone: { man: [], machine: [], material: [], method: [], measurement: [], environment: [] },
      whyOccur: ["", "", "", "", ""],
      whyEscape: ["", "", "", "", ""],
      rootOccur: "",
      rootEscape: "",
      verification: ""
    },
    d5: { actions: [] },
    d6: { actions: [], effectiveness: "" },
    d7: { actions: [], documents: [] },
    d8: { recognition: "", lessons: "", closedBy: "" }
  };
}

export function newEightD(): EightDReport {
  return {
    id: "",
    code: "",
    title: "",
    status: "open",
    severity: "major",
    customer: "",
    line: "",
    model: "",
    defect_code: "",
    owner: "",
    opened_on: todayVn(),
    due_on: null,
    closed_on: null,
    content: emptyEightDContent(),
    is_public: false
  };
}
