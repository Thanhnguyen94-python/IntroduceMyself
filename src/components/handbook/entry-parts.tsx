"use client";

import { StatusBadge, useT } from "@/components/smt/smt-charts";
import type { Threshold } from "@/lib/handbook/types";

// Bảng ngưỡng tham khảo: trạng thái luôn có icon + chữ, không chỉ dựa vào màu.
export function ThresholdTable({ items }: { items: Threshold[] }) {
  const t = useT();
  const label = { good: t("Tốt", "Good"), warning: t("Lưu ý", "Caution"), critical: t("Nguy cơ", "Risk"), info: t("Tham khảo", "Reference") };
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs" style={{ background: "color-mix(in srgb, var(--border) 40%, transparent)" }}>
            <th className="px-3 py-2 font-semibold">{t("Mức", "Level")}</th>
            <th className="px-3 py-2 font-semibold">{t("Giá trị / khoảng", "Value / range")}</th>
            <th className="px-3 py-2 font-semibold">{t("Ý nghĩa", "Meaning")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((x, i) => (
            <tr key={i} className="border-t align-top" style={{ borderColor: "var(--border)" }}>
              <td className="whitespace-nowrap px-3 py-2">
                {x.level === "info" ? <span className="chip">ℹ {label.info}</span> : <StatusBadge status={x.level}>{label[x.level]}</StatusBadge>}
              </td>
              <td className="px-3 py-2 font-semibold">{x.range}</td>
              <td className="muted px-3 py-2">{x.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" onClick={() => window.print()} className="btn-ghost smt-no-print">
      🖨 {t("In / Lưu PDF", "Print / PDF")}
    </button>
  );
}
