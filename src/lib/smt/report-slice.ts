import type { DefectLog, ProductionLog, SmtDataBundle } from "@/lib/smt/types";

// Chỉ gửi xuống trình duyệt phần dữ liệu báo cáo đó cần (trang nhẹ hơn, không lộ dữ liệu thừa).
// Bỏ các cột báo cáo không dùng (id, ca, ghi chú…) để giảm dung lượng HTML.
export function sliceBundle(slug: string, b: SmtDataBundle): SmtDataBundle {
  const empty: SmtDataBundle = { production: [], defects: [], cycleTimes: [], changes: [], assets: [], assetLogs: [], eightD: [] };
  const production = b.production.map(({ log_date, shift, line, model, planned_min, downtime_min, downtime_reason, ideal_ct_sec, total_qty, good_qty, opportunities }) => ({ log_date, shift, line, model, planned_min, downtime_min, downtime_reason, ideal_ct_sec, total_qty, good_qty, opportunities }) as ProductionLog);
  const defects = b.defects.map(({ log_date, line, model, defect_code, process, detected_by, location, qty }) => ({ log_date, line, model, defect_code, process, detected_by, location, qty }) as DefectLog);
  if (slug === "oee-line-balance") return { ...empty, production, cycleTimes: b.cycleTimes };
  if (slug === "yield-pareto") return { ...empty, production, defects };
  if (slug === "feeder-nozzle") return { ...empty, assets: b.assets, assetLogs: b.assetLogs };
  if (slug === "4m1e") return { ...empty, changes: b.changes };
  return { ...empty, eightD: b.eightD };
}
