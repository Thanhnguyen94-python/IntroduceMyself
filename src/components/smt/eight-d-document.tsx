"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { StatusBadge, useT } from "@/components/smt/smt-charts";
import { DataTable } from "@/components/smt/report-parts";
import { EIGHT_D_STATUS, FISHBONE_BRANCHES, dmy, emptyEightDContent } from "@/lib/smt/types";
import type { ActionItem, EightDReport, FishboneBranch } from "@/lib/smt/types";

// Báo cáo 8D dạng văn bản. report = null -> mẫu trống (ô kẻ sẵn để in ra điền tay).
export function EightDDocument({ report }: { report: EightDReport | null }) {
  const t = useT();
  const { lang } = useLanguage();
  const c = report?.content ?? emptyEightDContent();
  const blank = !report;
  const L = (x: { vi: string; en: string }) => (lang === "en" ? x.en : x.vi);
  const status = report ? EIGHT_D_STATUS.find((s) => s.id === report.status) : null;
  const sev = { minor: t("Nhẹ", "Minor"), major: t("Nặng", "Major"), critical: t("Nghiêm trọng", "Critical") } as const;

  return (
    <div className="space-y-4">
      <section className="card smt-block">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Meta label={t("Mã 8D", "8D No.")} value={report?.code} mono />
          <Meta label={t("Trạng thái", "Status")} value={status ? <StatusBadge status={report?.status === "closed" ? "good" : "warning"}>{L(status)}</StatusBadge> : undefined} />
          <Meta label={t("Mức độ", "Severity")} value={report ? <StatusBadge status={report.severity === "critical" ? "critical" : report.severity === "major" ? "warning" : "good"}>{sev[report.severity]}</StatusBadge> : undefined} />
          <Meta label={t("Tiêu đề", "Title")} value={report?.title} wide />
          <Meta label={t("Khách hàng", "Customer")} value={report?.customer} />
          <Meta label="Line / Model" value={report ? [report.line, report.model].filter(Boolean).join(" / ") : undefined} />
          <Meta label={t("Mã lỗi", "Defect code")} value={report?.defect_code} />
          <Meta label={t("Trưởng nhóm", "Champion")} value={report?.owner} />
          <Meta label={t("Ngày mở → hạn → đóng", "Opened → due → closed")} value={report ? `${dmy(report.opened_on)} → ${dmy(report.due_on) || "—"} → ${dmy(report.closed_on) || "—"}` : undefined} />
        </dl>
      </section>

      <Step n="D0" title={t("Chuẩn bị & hành động khẩn cấp (ERA)", "Prepare & emergency response")}>
        <Field label={t("Triệu chứng", "Symptom")} value={c.d0.symptom} blank={blank} />
        <Field label={t("Hành động khẩn cấp", "Emergency response action")} value={c.d0.emergencyAction} blank={blank} />
        <Field label={t("Có cần 8D?", "8D required?")} value={c.d0.need8d} blank={blank} lines={1} />
      </Step>

      <Step n="D1" title={t("Lập nhóm đa chức năng", "Cross-functional team")}>
        <DataTable head={[t("Họ tên", "Name"), t("Vai trò", "Role"), t("Bộ phận", "Dept.")]} rows={blank ? emptyRows(4, 3) : c.d1.team.map((m) => [<b key="n">{m.name}</b>, m.role, m.dept])} />
      </Step>

      <Step n="D2" title={t("Mô tả vấn đề (5W2H)", "Problem description (5W2H)")}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="What" value={c.d2.what} blank={blank} lines={1} />
          <Field label="Where" value={c.d2.where} blank={blank} lines={1} />
          <Field label="When" value={c.d2.when} blank={blank} lines={1} />
          <Field label="Who" value={c.d2.who} blank={blank} lines={1} />
          <Field label="Why" value={c.d2.why} blank={blank} lines={1} />
          <Field label="How" value={c.d2.how} blank={blank} lines={1} />
        </div>
        <Field label="How many" value={c.d2.howMany} blank={blank} lines={1} />
        <div className="rounded-xl border-l-4 px-4 py-3" style={{ borderColor: "var(--viz-1)", background: "var(--viz-1-wash)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide">Problem statement</p>
          <p className="mt-1 text-sm font-medium">{c.d2.statement || (blank ? <Lines n={2} /> : "—")}</p>
        </div>
      </Step>

      <Step n="D3" title={t("Khoanh vùng tạm thời (ICA)", "Interim containment (ICA)")}>
        <Field label={t("Kiểm tra tồn kho / WIP / tại khách", "Stock check (FG / WIP / at customer)")} value={c.d3.stockCheck} blank={blank} lines={1} />
        <Actions items={c.d3.actions} blank={blank} />
      </Step>

      <Step n="D4" title={t("Nguyên nhân gốc – Fishbone 6M", "Root cause – 6M fishbone")}>
        <Fishbone branches={c.d4.fishbone} problem={report?.defect_code ? `${report.defect_code} · ${report.title}` : c.d2.what} blank={blank} />
        <div className="grid gap-3 lg:grid-cols-2">
          <WhyLadder title={t("5 Why – vì sao XẢY RA", "5 Whys – why it OCCURRED")} whys={c.d4.whyOccur} root={c.d4.rootOccur} blank={blank} />
          <WhyLadder title={t("5 Why – vì sao LỌT", "5 Whys – why it ESCAPED")} whys={c.d4.whyEscape} root={c.d4.rootEscape} blank={blank} />
        </div>
        <Field label={t("Xác minh nguyên nhân (tái hiện bật / tắt lỗi)", "Root-cause verification (turn the defect on / off)")} value={c.d4.verification} blank={blank} />
      </Step>

      <Step n="D5" title={t("Chọn giải pháp khắc phục (PCA)", "Permanent corrective actions")}>
        <Actions items={c.d5.actions} blank={blank} />
      </Step>

      <Step n="D6" title={t("Triển khai & xác nhận hiệu quả", "Implement & validate")}>
        <Actions items={c.d6.actions} blank={blank} />
        <Field label={t("Hiệu quả (trước / sau)", "Effectiveness (before / after)")} value={c.d6.effectiveness} blank={blank} lines={1} />
      </Step>

      <Step n="D7" title={t("Phòng ngừa tái phát", "Prevent recurrence")}>
        <Actions items={c.d7.actions} blank={blank} />
        <div className="text-sm">
          <p className="muted text-xs font-semibold uppercase tracking-wide">{t("Tài liệu cập nhật", "Documents updated")}</p>
          {blank ? (
            <p className="mt-1 text-sm">☐ PFMEA &nbsp; ☐ Control Plan &nbsp; ☐ WI / SOP &nbsp; ☐ {t("Chương trình máy / AOI", "Machine / AOI program")} &nbsp; ☐ {t("Đào tạo", "Training")}</p>
          ) : c.d7.documents.length ? (
            <ul className="mt-1 flex flex-wrap gap-2">
              {c.d7.documents.map((d) => (
                <li key={d} className="chip">
                  📄 {d}
                </li>
              ))}
            </ul>
          ) : (
            <p>—</p>
          )}
        </div>
      </Step>

      <Step n="D8" title={t("Ghi nhận nhóm & đóng 8D", "Recognize team & close")}>
        <Field label={t("Ghi nhận", "Recognition")} value={c.d8.recognition} blank={blank} lines={1} />
        <Field label={t("Bài học kinh nghiệm", "Lessons learned")} value={c.d8.lessons} blank={blank} />
        <Field label={t("Người đóng", "Closed by")} value={c.d8.closedBy} blank={blank} lines={1} />
      </Step>
    </div>
  );
}

function Meta({ label, value, mono, wide }: { label: string; value?: ReactNode; mono?: boolean; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <dt className="muted text-xs">{label}</dt>
      <dd className={`font-medium ${mono ? "font-mono" : ""}`}>{value || <span className="inline-block h-5 w-full border-b" style={{ borderColor: "var(--border)" }} />}</dd>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="card smt-block space-y-3">
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Lines({ n }: { n: number }) {
  return (
    <span className="block">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="block h-6 border-b" style={{ borderColor: "var(--border)" }} />
      ))}
    </span>
  );
}

function Field({ label, value, blank, lines = 2 }: { label: string; value: string; blank: boolean; lines?: number }) {
  return (
    <div className="text-sm">
      <p className="muted text-xs font-semibold uppercase tracking-wide">{label}</p>
      <div className="mt-0.5 whitespace-pre-line">{value || (blank ? <Lines n={lines} /> : "—")}</div>
    </div>
  );
}

function emptyRows(n: number, cols: number) {
  return Array.from({ length: n }, () => Array.from({ length: cols }, () => <span className="block h-5" />));
}

function Actions({ items, blank }: { items: ActionItem[]; blank: boolean }) {
  const t = useT();
  return (
    <DataTable
      head={["#", t("Hành động", "Action"), t("Phụ trách", "Owner"), t("Hạn", "Due"), t("Kết quả", "Result")]}
      align={["center", "left", "left", "left", "left"]}
      rows={
        blank
          ? emptyRows(3, 5)
          : items.map((a, i) => [
              i + 1,
              a.action,
              a.owner,
              <span key="d" className="whitespace-nowrap tabular-nums">
                {dmy(a.due)}
              </span>,
              <span key="r">
                {a.status === "done" ? "✔ " : "○ "}
                {a.result}
              </span>
            ])
      }
      empty={t("Chưa có hành động.", "No actions yet.")}
    />
  );
}

// Biểu đồ xương cá: 3 nhánh trên, 3 nhánh dưới, xương sống dẫn tới "đầu cá" (vấn đề).
function Fishbone({ branches, problem, blank }: { branches: Record<FishboneBranch, string[]>; problem: string; blank: boolean }) {
  const { lang } = useLanguage();
  const top = FISHBONE_BRANCHES.slice(0, 3);
  const bottom = FISHBONE_BRANCHES.slice(3);
  const Branch = ({ b, up }: { b: (typeof FISHBONE_BRANCHES)[number]; up: boolean }) => (
    <div className={`relative flex flex-col ${up ? "justify-end" : "justify-start"} rounded-lg border p-2 text-xs`} style={{ borderColor: "var(--border)" }}>
      {!up && <p className="mb-1 font-semibold">{lang === "en" ? b.en : `${b.en} · ${b.vi}`}</p>}
      <ul className="space-y-1">
        {(blank ? ["", ""] : branches[b.id].length ? branches[b.id] : ["—"]).map((x, i) => (
          <li key={i} className="flex gap-1">
            <span className="muted">•</span>
            {x || <span className="block h-4 flex-1 border-b" style={{ borderColor: "var(--border)" }} />}
          </li>
        ))}
      </ul>
      {up && <p className="mt-1 font-semibold">{lang === "en" ? b.en : `${b.en} · ${b.vi}`}</p>}
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[620px] grid-cols-[1fr_1fr_1fr_150px] gap-x-3">
        {top.map((b) => (
          <Branch key={b.id} b={b} up />
        ))}
        <div />
        {/* Xương sống */}
        <div className="col-span-3 flex items-center py-2" aria-hidden>
          <div className="h-1 flex-1 rounded-full" style={{ background: "var(--viz-1)" }} />
          <div className="h-0 w-0 border-y-8 border-l-[14px] border-y-transparent" style={{ borderLeftColor: "var(--viz-1)" }} />
        </div>
        <div className="row-span-1 flex items-center">
          <div className="w-full rounded-lg border-2 px-2 py-2 text-center text-xs font-bold" style={{ borderColor: "var(--viz-1)" }}>
            {problem || (blank ? <Lines n={2} /> : "—")}
          </div>
        </div>
        {bottom.map((b) => (
          <Branch key={b.id} b={b} up={false} />
        ))}
        <div />
      </div>
    </div>
  );
}

function WhyLadder({ title, whys, root, blank }: { title: string; whys: string[]; root: string; blank: boolean }) {
  const t = useT();
  return (
    <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
      <p className="font-semibold">{title}</p>
      <ol className="space-y-1.5 text-sm">
        {whys.slice(0, 5).map((w, i) => (
          <li key={i} className="flex gap-2" style={{ paddingLeft: i * 10 }}>
            <span className="grid h-6 w-12 shrink-0 place-items-center rounded-md text-xs font-bold" style={{ background: "var(--viz-1-wash)" }}>
              Why {i + 1}
            </span>
            <span className="min-w-0 flex-1">{w || (blank ? <Lines n={1} /> : "—")}</span>
          </li>
        ))}
      </ol>
      <div className="rounded-lg border-l-4 px-3 py-2 text-sm" style={{ borderColor: "var(--status-critical)" }}>
        <span className="text-xs font-semibold uppercase tracking-wide">{t("Nguyên nhân gốc", "Root cause")}</span>
        <p className="font-medium">{root || (blank ? <Lines n={1} /> : "—")}</p>
      </div>
    </div>
  );
}
