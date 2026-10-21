import type { DatasetKey } from "@/lib/smt/datasets";
import type { ReportSlug } from "@/lib/smt/types";

// Phạm vi quản lý: chọn nhóm nội dung hiện trên /smt để báo cáo không bị "lủng" khi chưa có dữ liệu.
// Ví dụ quản lý kỹ sư chưa nhập sản lượng -> tắt "Sản lượng" để không hiện ô / cột trống.
// Chỉ ẩn phần hiển thị: dữ liệu và quyền nhập vẫn giữ nguyên, bật lại là thấy đủ.
// Admin chọn ở Admin → Cài đặt SMT (lưu cùng smt_settings).

export type SmtModule = "team" | "equipment" | "quality" | "production" | "strategy";

export const SMT_MODULES: Array<{ id: SmtModule; icon: string; vi: string; en: string; desc: string }> = [
  { id: "team", icon: "👥", vi: "Đội ngũ & công việc", en: "Team & tasks", desc: "Giao việc, nghiệm thu, điểm KPI kỹ sư, việc trong báo cáo ngày/tuần." },
  { id: "equipment", icon: "⚙️", vi: "Hiệu suất & thiết bị", en: "Performance & equipment", desc: "OEE (A·P·Q), dừng máy, cycle time / cân bằng line, feeder–nozzle, thay đổi 4M." },
  { id: "quality", icon: "🎯", vi: "Chất lượng", en: "Quality", desc: "FPY, DPMO, Pareto lỗi, lỗi lọt khách hàng, 8D." },
  { id: "production", icon: "📦", vi: "Sản lượng", en: "Output", desc: "Số board, board/ngày, sản lượng theo line và theo quý." },
  { id: "strategy", icon: "📊", vi: "So sánh cấp line & theo quý", en: "Tier & quarter comparison", desc: "Đầu tư thiết bị có đáng không (3 cấp line), bảng so sánh theo quý." }
];

export const ALL_MODULES: SmtModule[] = SMT_MODULES.map((m) => m.id);

// Mẫu chọn nhanh theo vị trí; chọn xong vẫn tick / bỏ tick từng nhóm được.
export const MODULE_PRESETS: Array<{ id: string; vi: string; modules: SmtModule[] }> = [
  { id: "engineer", vi: "Quản lý kỹ sư", modules: ["team", "equipment", "quality"] },
  { id: "production", vi: "Quản lý sản xuất", modules: ["team", "equipment", "quality", "production"] },
  { id: "director", vi: "Giám đốc bộ phận (đầy đủ)", modules: ALL_MODULES }
];

export function normalizeModules(v: unknown): SmtModule[] {
  const list = Array.isArray(v) ? ALL_MODULES.filter((m) => v.includes(m)) : [];
  // Không bật nhóm nào -> coi như chưa cấu hình, hiện đủ.
  return list.length ? list : ALL_MODULES;
}

export function presetOf(modules: SmtModule[]) {
  return MODULE_PRESETS.find((p) => p.modules.length === modules.length && p.modules.every((m) => modules.includes(m)))?.id ?? "custom";
}

export type ModuleSet = Record<SmtModule, boolean>;

export const moduleSet = (modules: SmtModule[]): ModuleSet => Object.fromEntries(ALL_MODULES.map((m) => [m, modules.includes(m)])) as ModuleSet;

// Có nhóm nào dùng số liệu sản xuất (Tổng quan, Line, Báo cáo chuẩn)?
export const hasFactoryData = (m: ModuleSet) => m.equipment || m.quality || m.production;

export const REPORT_MODULE: Record<ReportSlug, SmtModule> = {
  "8d": "quality",
  "4m1e": "equipment",
  "oee-line-balance": "equipment",
  "yield-pareto": "quality",
  "feeder-nozzle": "equipment"
};

// Nhật ký sản xuất là nguồn của cả OEE, FPY và sản lượng -> hiện khi bật 1 trong 3 nhóm.
export const DATASET_MODULES: Record<DatasetKey, SmtModule[]> = {
  production: ["equipment", "quality", "production"],
  defects: ["quality"],
  "cycle-times": ["equipment"],
  changes: ["equipment"],
  assets: ["equipment"],
  "asset-logs": ["equipment"],
  "8d": ["quality"]
};

export const datasetVisible = (m: ModuleSet, key: DatasetKey) => DATASET_MODULES[key].some((x) => m[x]);

export const hiddenLabels = (m: ModuleSet) => SMT_MODULES.filter((x) => !m[x.id]).map((x) => x.vi);
