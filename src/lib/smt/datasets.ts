import { CHANGE_CATEGORIES, DETECT_POINTS, EIGHT_D_STATUS, SMT_PROCESSES, todayVn } from "@/lib/smt/types";

// Mô tả các bộ dữ liệu nhập tay. Một nguồn duy nhất cho: form nhập Admin, kiểm tra ở API,
// cột bảng, mẫu Excel trống và "Dán từ Excel" (thứ tự cột = thứ tự fields).

export type DatasetKey = "production" | "defects" | "cycle-times" | "changes" | "assets" | "asset-logs" | "8d";

export type SmtTable =
  | "smt_production_logs"
  | "smt_defect_logs"
  | "smt_cycle_times"
  | "smt_4m_changes"
  | "smt_assets"
  | "smt_asset_logs"
  | "smt_8d_reports";

// "line" / "shift" / "defect" / "asset": danh sách lấy từ cài đặt hoặc dữ liệu hiện có.
export type OptionSource = "line" | "shift" | "defect" | "asset";

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "int" | "date" | "select" | "bool" | "json";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  source?: OptionSource;
  min?: number;
  max?: number;
  hint?: string;
  // Hiện thành cột trong bảng danh sách Admin
  list?: boolean;
  defaultValue?: () => unknown;
};

export type DatasetDef = {
  key: DatasetKey;
  table: SmtTable;
  label: string;
  icon: string;
  description: string;
  dateField: string;
  fields: FieldDef[];
};

const opt = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
const today = () => todayVn();

export const DATASETS: Record<DatasetKey, DatasetDef> = {
  production: {
    key: "production",
    table: "smt_production_logs",
    label: "Nhật ký sản xuất",
    icon: "🏭",
    description: "Mỗi dòng = 1 line × 1 ca × 1 model. Nguồn tính OEE, FPY, DPMO.",
    dateField: "log_date",
    fields: [
      { key: "log_date", label: "Ngày", type: "date", required: true, list: true, defaultValue: today },
      { key: "shift", label: "Ca", type: "select", source: "shift", list: true },
      { key: "line", label: "Line", type: "select", source: "line", required: true, list: true },
      { key: "model", label: "Model", type: "text", list: true },
      { key: "work_order", label: "Work order", type: "text" },
      { key: "planned_min", label: "Thời gian kế hoạch (phút)", type: "number", min: 0, max: 1440, required: true, list: true, hint: "Thời gian ca trừ nghỉ có kế hoạch (ăn, họp)." },
      { key: "downtime_min", label: "Dừng máy (phút)", type: "number", min: 0, max: 1440, list: true },
      { key: "downtime_reason", label: "Lý do dừng chính", type: "text", hint: "VD: Đổi model, Thiếu vật tư, Lỗi máy, Chờ kỹ thuật." },
      { key: "ideal_ct_sec", label: "Cycle time chuẩn (giây/board)", type: "number", min: 0, max: 3600, required: true, hint: "CT lý tưởng của trạm chậm nhất (theo chương trình máy)." },
      { key: "total_qty", label: "Tổng sản lượng (board)", type: "int", min: 0, required: true, list: true },
      { key: "good_qty", label: "Đạt lần đầu (board)", type: "int", min: 0, required: true, list: true, hint: "Board qua AOI/kiểm tra lần đầu không cần sửa (First Pass)." },
      { key: "opportunities", label: "Cơ hội lỗi / board", type: "int", min: 0, hint: "Thường = tổng số mối hàn trên 1 board. Dùng tính DPMO." },
      { key: "note", label: "Ghi chú", type: "textarea" }
    ]
  },
  defects: {
    key: "defects",
    table: "smt_defect_logs",
    label: "Nhật ký lỗi",
    icon: "🐞",
    description: "Mỗi dòng = 1 loại lỗi tại 1 vị trí. Nguồn cho Pareto, PPM, phân tích theo công đoạn.",
    dateField: "log_date",
    fields: [
      { key: "log_date", label: "Ngày", type: "date", required: true, list: true, defaultValue: today },
      { key: "shift", label: "Ca", type: "select", source: "shift" },
      { key: "line", label: "Line", type: "select", source: "line", required: true, list: true },
      { key: "model", label: "Model", type: "text", list: true },
      { key: "defect_code", label: "Mã lỗi", type: "select", source: "defect", required: true, list: true },
      { key: "process", label: "Công đoạn gây lỗi", type: "select", options: SMT_PROCESSES.map((p) => ({ value: p.id, label: p.vi })), list: true, hint: "Bỏ trống: lấy theo danh mục lỗi." },
      { key: "detected_by", label: "Phát hiện tại", type: "select", options: opt(DETECT_POINTS), list: true, defaultValue: () => "AOI" },
      { key: "location", label: "Vị trí (RefDes)", type: "text", list: true, hint: "VD: C12, U3" },
      { key: "part_no", label: "Mã linh kiện", type: "text" },
      { key: "qty", label: "Số lượng", type: "int", min: 0, required: true, list: true, defaultValue: () => 1 },
      { key: "root_cause", label: "Nguyên nhân sơ bộ", type: "text" },
      { key: "action", label: "Hành động", type: "text" }
    ]
  },
  "cycle-times": {
    key: "cycle-times",
    table: "smt_cycle_times",
    label: "Cycle time trạm",
    icon: "⏱️",
    description: "Đo CT từng trạm cho 1 model. Nguồn cho Line Balance & Bottleneck.",
    dateField: "measured_on",
    fields: [
      { key: "measured_on", label: "Ngày đo", type: "date", required: true, list: true, defaultValue: today },
      { key: "line", label: "Line", type: "select", source: "line", required: true, list: true },
      { key: "model", label: "Model", type: "text", required: true, list: true },
      { key: "station", label: "Trạm", type: "text", required: true, list: true, hint: "Đặt đúng tên trạm trong Cài đặt → Line." },
      { key: "cycle_time_sec", label: "Cycle time (giây)", type: "number", min: 0, max: 3600, required: true, list: true },
      { key: "note", label: "Ghi chú", type: "text" }
    ]
  },
  changes: {
    key: "changes",
    table: "smt_4m_changes",
    label: "Thay đổi 4M1E",
    icon: "🔁",
    description: "Mọi thay đổi Man / Machine / Material / Method / Environment kèm đánh giá rủi ro & xác nhận.",
    dateField: "change_date",
    fields: [
      { key: "code", label: "Mã thay đổi", type: "text", list: true, hint: "Bỏ trống: tự sinh dạng 4M-yyMM-xx." },
      { key: "change_date", label: "Ngày áp dụng", type: "date", required: true, list: true, defaultValue: today },
      { key: "category", label: "Hạng mục", type: "select", required: true, list: true, options: CHANGE_CATEGORIES.map((c) => ({ value: c.id, label: `${c.short} – ${c.vi}` })) },
      { key: "line", label: "Line", type: "select", source: "line", list: true },
      { key: "model", label: "Model", type: "text" },
      { key: "item", label: "Nội dung thay đổi", type: "text", required: true, list: true },
      { key: "before_state", label: "Trước thay đổi", type: "textarea" },
      { key: "after_state", label: "Sau thay đổi", type: "textarea" },
      { key: "reason", label: "Lý do", type: "textarea" },
      {
        key: "risk",
        label: "Mức rủi ro",
        type: "select",
        defaultValue: () => "low",
        list: true,
        options: [
          { value: "low", label: "Thấp" },
          { value: "medium", label: "Trung bình" },
          { value: "high", label: "Cao" }
        ]
      },
      { key: "validation", label: "Kế hoạch xác nhận", type: "textarea", hint: "VD: FAI 5 board, SPI Cpk ≥ 1.33, AOI 100% lô đầu." },
      {
        key: "result",
        label: "Kết quả xác nhận",
        type: "select",
        defaultValue: () => "pending",
        list: true,
        options: [
          { value: "pending", label: "Chờ" },
          { value: "ok", label: "OK" },
          { value: "ng", label: "NG" }
        ]
      },
      {
        key: "status",
        label: "Trạng thái",
        type: "select",
        list: true,
        defaultValue: () => "planned",
        options: [
          { value: "planned", label: "Kế hoạch" },
          { value: "implemented", label: "Đã áp dụng" },
          { value: "verified", label: "Đã xác nhận" },
          { value: "rejected", label: "Từ chối" }
        ]
      },
      { key: "owner", label: "Người phụ trách", type: "text" },
      { key: "approved_by", label: "Người duyệt", type: "text" },
      { key: "is_public", label: "Công khai trên trang Tài liệu", type: "bool", list: true, hint: "Chỉ bật cho bản ghi đã ẩn thông tin khách hàng." },
      { key: "note", label: "Ghi chú", type: "text" }
    ]
  },
  assets: {
    key: "assets",
    table: "smt_assets",
    label: "Danh mục Feeder / Nozzle",
    icon: "🧰",
    description: "Mỗi feeder / nozzle 1 dòng, kèm chu kỳ bảo dưỡng (PM).",
    dateField: "last_pm_on",
    fields: [
      {
        key: "asset_type",
        label: "Loại",
        type: "select",
        required: true,
        list: true,
        options: [
          { value: "feeder", label: "Feeder" },
          { value: "nozzle", label: "Nozzle" }
        ]
      },
      { key: "code", label: "Mã (S/N)", type: "text", required: true, list: true },
      { key: "spec", label: "Quy cách", type: "text", list: true, hint: "Feeder: 8mm / 12mm / 16mm… Nozzle: 1002, 1003, CN040…" },
      { key: "machine", label: "Máy / vị trí", type: "text", list: true },
      {
        key: "status",
        label: "Trạng thái",
        type: "select",
        list: true,
        defaultValue: () => "active",
        options: [
          { value: "active", label: "Đang dùng" },
          { value: "maintenance", label: "Đang bảo dưỡng" },
          { value: "retired", label: "Thanh lý" }
        ]
      },
      { key: "last_pm_on", label: "PM gần nhất", type: "date", list: true },
      { key: "pm_interval_days", label: "Chu kỳ PM (ngày)", type: "int", min: 1, max: 3650, list: true, defaultValue: () => 90 },
      { key: "note", label: "Ghi chú", type: "text" }
    ]
  },
  "asset-logs": {
    key: "asset-logs",
    table: "smt_asset_logs",
    label: "Nhật ký Feeder / Nozzle",
    icon: "🛠️",
    description: "Số lần hút / hút hỏng theo ngày (từ log máy) và các lần PM, sửa chữa.",
    dateField: "log_date",
    fields: [
      { key: "asset_id", label: "Feeder / Nozzle", type: "select", source: "asset", required: true, list: true },
      { key: "log_date", label: "Ngày", type: "date", required: true, list: true, defaultValue: today },
      {
        key: "event",
        label: "Sự kiện",
        type: "select",
        defaultValue: () => "usage",
        list: true,
        options: [
          { value: "usage", label: "Sử dụng (số liệu hút)" },
          { value: "pm", label: "Bảo dưỡng PM" },
          { value: "repair", label: "Sửa chữa" },
          { value: "calibration", label: "Hiệu chuẩn" },
          { value: "inspection", label: "Kiểm tra" }
        ]
      },
      { key: "picks", label: "Số lần hút", type: "int", min: 0, list: true },
      { key: "mispicks", label: "Hút hỏng (mispick)", type: "int", min: 0, list: true },
      {
        key: "result",
        label: "Kết quả",
        type: "select",
        defaultValue: () => "ok",
        list: true,
        options: [
          { value: "ok", label: "OK" },
          { value: "ng", label: "NG" }
        ]
      },
      { key: "technician", label: "Kỹ thuật viên", type: "text" },
      { key: "note", label: "Ghi chú", type: "text" }
    ]
  },
  "8d": {
    key: "8d",
    table: "smt_8d_reports",
    label: "Báo cáo 8D",
    icon: "🧭",
    description: "Giải quyết vấn đề theo 8 bước (AIAG): khoanh vùng, Fishbone, 5 Why, khắc phục, phòng ngừa.",
    dateField: "opened_on",
    fields: [
      { key: "code", label: "Mã 8D", type: "text", list: true, hint: "Bỏ trống: tự sinh dạng 8D-yyMM-xx." },
      { key: "title", label: "Tiêu đề vấn đề", type: "text", required: true, list: true },
      { key: "status", label: "Trạng thái", type: "select", list: true, options: EIGHT_D_STATUS.map((st) => ({ value: st.id, label: st.vi })), defaultValue: () => "open" },
      {
        key: "severity",
        label: "Mức độ",
        type: "select",
        list: true,
        defaultValue: () => "major",
        options: [
          { value: "minor", label: "Nhẹ" },
          { value: "major", label: "Nặng" },
          { value: "critical", label: "Nghiêm trọng" }
        ]
      },
      { key: "customer", label: "Khách hàng", type: "text" },
      { key: "line", label: "Line", type: "select", source: "line", list: true },
      { key: "model", label: "Model", type: "text" },
      { key: "defect_code", label: "Mã lỗi", type: "select", source: "defect" },
      { key: "owner", label: "Trưởng nhóm", type: "text", list: true },
      { key: "opened_on", label: "Ngày mở", type: "date", required: true, list: true, defaultValue: today },
      { key: "due_on", label: "Hạn đóng", type: "date" },
      { key: "closed_on", label: "Ngày đóng", type: "date" },
      { key: "content", label: "Nội dung D0-D8", type: "json" },
      { key: "is_public", label: "Công khai", type: "bool", list: true }
    ]
  }
};

// Bộ dữ liệu nhập dạng bảng (8D có trình soạn riêng).
export const TABULAR_DATASETS: DatasetKey[] = ["production", "defects", "cycle-times", "changes", "assets", "asset-logs"];

export function isDatasetKey(value: string): value is DatasetKey {
  return Object.prototype.hasOwnProperty.call(DATASETS, value);
}

export class SmtValidationError extends Error {}

// Chuẩn hoá 1 dòng theo định nghĩa field. `partial` = PATCH: chỉ xử lý field có gửi lên.
export function normalizeRow(def: DatasetDef, input: Record<string, unknown>, partial = false): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    const has = Object.prototype.hasOwnProperty.call(input, f.key);
    if (partial && !has) continue;
    let raw = has ? input[f.key] : f.defaultValue?.();
    if (typeof raw === "string") raw = raw.trim();
    if ((raw === undefined || raw === null || raw === "") && f.defaultValue) raw = f.defaultValue();
    const blank = raw === undefined || raw === null || raw === "";

    if (f.type === "json") {
      out[f.key] = raw && typeof raw === "object" ? raw : {};
      continue;
    }
    if (f.type === "bool") {
      out[f.key] = raw === true || raw === "true" || raw === 1 || raw === "1" || String(raw).toLowerCase() === "x" || String(raw).toLowerCase() === "yes";
      continue;
    }
    if (blank) {
      if (f.required) throw new SmtValidationError(`Thiếu "${f.label}".`);
      out[f.key] = f.type === "number" || f.type === "int" ? 0 : f.type === "date" ? null : "";
      continue;
    }
    if (f.type === "number" || f.type === "int") {
      const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(n)) throw new SmtValidationError(`"${f.label}" phải là số (nhận được "${raw}").`);
      const v = f.type === "int" ? Math.round(n) : Math.round(n * 1000) / 1000;
      if (f.min !== undefined && v < f.min) throw new SmtValidationError(`"${f.label}" phải ≥ ${f.min}.`);
      if (f.max !== undefined && v > f.max) throw new SmtValidationError(`"${f.label}" phải ≤ ${f.max}.`);
      out[f.key] = v;
      continue;
    }
    if (f.type === "date") {
      const iso = parseDate(String(raw));
      if (!iso) throw new SmtValidationError(`"${f.label}" không đúng định dạng ngày (YYYY-MM-DD hoặc DD/MM/YYYY).`);
      out[f.key] = iso;
      continue;
    }
    const s = String(raw).slice(0, f.type === "textarea" ? 4000 : 300);
    if (f.options && !f.options.some((o) => o.value === s)) {
      // Cho phép dán nhãn hiển thị (VD "Cao") thay vì giá trị ("high").
      const byLabel = f.options.find((o) => o.label.toLowerCase() === s.toLowerCase() || o.value.toLowerCase() === s.toLowerCase());
      if (!byLabel) throw new SmtValidationError(`"${f.label}" không hợp lệ: "${s}". Chọn: ${f.options.map((o) => o.value).join(", ")}.`);
      out[f.key] = byLabel.value;
      continue;
    }
    out[f.key] = s;
  }
  return out;
}

// Nhận YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY hoặc số ngày serial của Excel.
export function parseDate(value: string): string | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return valid(+m[3], +m[2], +m[1]);
  if (/^\d{5}(\.\d+)?$/.test(v)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(v)) * 86400_000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function valid(y: number, mo: number, d: number) {
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}
