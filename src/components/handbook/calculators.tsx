"use client";

import { useMemo, useState, type ReactNode } from "react";
import { StatusBadge, useT, type Status } from "@/components/smt/smt-charts";
import type { CalculatorId } from "@/lib/handbook/types";

// Máy tính nhỏ gắn kèm mục sổ tay. Tính ngay trên trình duyệt, không gửi dữ liệu đi đâu.

// Phân phối chuẩn: CDF (xấp xỉ Abramowitz–Stegun 7.1.26) và hàm ngược (thuật toán Acklam).
function normCdf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
function normInv(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

const n = (s: string) => Number(String(s).replace(",", "."));
const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString("vi-VN", { maximumFractionDigits: d, minimumFractionDigits: 0 }) : "—");
const pct = (v: number, d = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : "—");

function Input({ label, value, onChange, unit, step = "any" }: { label: string; value: string; onChange: (v: string) => void; unit?: string; step?: string }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <input type="number" step={step} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="input" />
        {unit && <span className="muted shrink-0 text-xs">{unit}</span>}
      </span>
    </label>
  );
}

function Result({ label, value, status, note }: { label: string; value: string; status?: Status; note?: string }) {
  return (
    <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)" }}>
      <p className="muted text-xs">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {status && note && (
        <div className="mt-1">
          <StatusBadge status={status}>{note}</StatusBadge>
        </div>
      )}
    </div>
  );
}

function Shell({ title, children, results }: { title: string; children: ReactNode; results: ReactNode }) {
  return (
    <section className="card smt-no-print space-y-3" aria-label={title}>
      <h2 className="flex items-center gap-2 text-lg font-semibold">🧮 {title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{results}</div>
    </section>
  );
}

function CpkCalc() {
  const t = useT();
  const [usl, setUsl] = useState("130");
  const [lsl, setLsl] = useState("70");
  const [mean, setMean] = useState("102");
  const [sigma, setSigma] = useState("6");
  const [data, setData] = useState("");
  const parsed = useMemo(() => data.split(/[\s,;]+/).map(n).filter(Number.isFinite), [data]);
  const fromData = parsed.length >= 2;
  const mu = fromData ? parsed.reduce((s, x) => s + x, 0) / parsed.length : n(mean);
  const sd = fromData ? Math.sqrt(parsed.reduce((s, x) => s + (x - mu) ** 2, 0) / (parsed.length - 1)) : n(sigma);
  const U = n(usl);
  const L = n(lsl);
  const cp = (U - L) / (6 * sd);
  const cpu = (U - mu) / (3 * sd);
  const cpl = (mu - L) / (3 * sd);
  const cpk = Math.min(cpu, cpl);
  const ppm = (normCdf(-(U - mu) / sd) + normCdf(-(mu - L) / sd)) * 1e6;
  const st: Status = cpk >= 1.33 ? "good" : cpk >= 1 ? "warning" : "critical";
  return (
    <Shell
      title={t("Tính Cp / Cpk", "Cp / Cpk calculator")}
      results={
        <>
          <Result label="Cp" value={f(cp)} />
          <Result label="Cpk" value={f(cpk)} status={st} note={st === "good" ? t("Đạt (≥ 1,33)", "Capable (≥ 1.33)") : st === "warning" ? t("Tối thiểu", "Marginal") : t("Không đạt", "Not capable")} />
          <Result label="Cpu / Cpl" value={`${f(cpu)} / ${f(cpl)}`} />
          <Result label={t("Dự đoán ngoài dung sai", "Expected out of spec")} value={`${f(ppm, 0)} ppm`} />
        </>
      }
    >
      <Input label="USL" value={usl} onChange={setUsl} />
      <Input label="LSL" value={lsl} onChange={setLsl} />
      {fromData ? (
        <div className="text-sm sm:col-span-2">
          <p className="font-medium">{t("Từ dữ liệu dán vào", "From pasted data")}</p>
          <p className="muted tabular-nums">
            n = {parsed.length} · μ = {f(mu, 3)} · s = {f(sd, 3)}
          </p>
        </div>
      ) : (
        <>
          <Input label={t("Trung bình μ", "Mean μ")} value={mean} onChange={setMean} />
          <Input label={t("Độ lệch chuẩn σ", "Std dev σ")} value={sigma} onChange={setSigma} />
        </>
      )}
      <label className="block space-y-1 text-sm sm:col-span-2 lg:col-span-4">
        <span className="font-medium">{t("Hoặc dán dãy số đo (cách nhau bởi dấu cách, xuống dòng, dấu phẩy)", "Or paste measurements (space, newline or comma separated)")}</span>
        <textarea value={data} onChange={(e) => setData(e.target.value)} className="input min-h-16 font-mono text-xs" placeholder="98.2 101.5 104 99.7 …" />
      </label>
    </Shell>
  );
}

function SigmaCalc() {
  const t = useT();
  const [dpmo, setDpmo] = useState("233");
  const [sigma, setSigma] = useState("");
  const fromSigma = sigma.trim() !== "";
  const s = fromSigma ? n(sigma) : normInv(1 - n(dpmo) / 1e6) + 1.5;
  const d = fromSigma ? (1 - normCdf(n(sigma) - 1.5)) * 1e6 : n(dpmo);
  return (
    <Shell
      title={t("Quy đổi DPMO ↔ Sigma (đã gồm dịch 1,5σ)", "DPMO ↔ Sigma (1.5σ shift)")}
      results={
        <>
          <Result label="Sigma level" value={`${f(s, 2)} σ`} />
          <Result label="DPMO" value={f(d, d < 10 ? 2 : 0)} />
          <Result label={t("Tỉ lệ đạt tương ứng", "Equivalent yield")} value={pct(1 - d / 1e6, 4)} />
        </>
      }
    >
      <Input label="DPMO" value={fromSigma ? "" : dpmo} onChange={(v) => { setDpmo(v); setSigma(""); }} />
      <Input label={t("hoặc Sigma level", "or Sigma level")} value={sigma} onChange={setSigma} />
    </Shell>
  );
}

function AreaRatioCalc() {
  const t = useT();
  const [shape, setShape] = useState<"rect" | "circle">("rect");
  const [l, setL] = useState("0.25");
  const [w, setW] = useState("0.25");
  const [th, setTh] = useState("0.12");
  const L = n(l);
  const W = shape === "circle" ? L : n(w);
  const T = n(th);
  const ar = shape === "circle" ? L / (4 * T) : (L * W) / (2 * (L + W) * T);
  const asp = Math.min(L, W) / T;
  const maxT = shape === "circle" ? L / (4 * 0.66) : (L * W) / (2 * (L + W) * 0.66);
  const st: Status = ar >= 0.66 ? "good" : ar >= 0.5 ? "warning" : "critical";
  return (
    <Shell
      title={t("Tính Area ratio / Aspect ratio stencil", "Stencil area / aspect ratio")}
      results={
        <>
          <Result label="Area ratio" value={f(ar, 3)} status={st} note={st === "good" ? "≥ 0,66 (IPC-7525)" : st === "warning" ? t("Cần stencil tốt / nano-coat", "Needs premium stencil") : t("Rủi ro thiếu kem", "Insufficient-paste risk")} />
          <Result label="Aspect ratio" value={f(asp, 2)} status={asp >= 1.5 ? "good" : "warning"} note={asp >= 1.5 ? "≥ 1,5" : "< 1,5"} />
          <Result label={t("Độ dày tối đa để AR = 0,66", "Max thickness for AR 0.66")} value={`${f(maxT, 3)} mm`} />
        </>
      }
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("Hình dạng lỗ", "Aperture shape")}</span>
        <select value={shape} onChange={(e) => setShape(e.target.value as "rect" | "circle")} className="input">
          <option value="rect">{t("Chữ nhật", "Rectangle")}</option>
          <option value="circle">{t("Tròn (BGA)", "Circle (BGA)")}</option>
        </select>
      </label>
      <Input label={shape === "circle" ? t("Đường kính D", "Diameter D") : t("Dài L", "Length L")} value={l} onChange={setL} unit="mm" />
      {shape === "rect" && <Input label={t("Rộng W", "Width W")} value={w} onChange={setW} unit="mm" />}
      <Input label={t("Độ dày stencil T", "Stencil thickness T")} value={th} onChange={setTh} unit="mm" />
    </Shell>
  );
}

function OeeCalc() {
  const t = useT();
  const [planned, setPlanned] = useState("450");
  const [down, setDown] = useState("45");
  const [ct, setCt] = useState("30");
  const [total, setTotal] = useState("750");
  const [good, setGood] = useState("735");
  const run = n(planned) - n(down);
  const A = run / n(planned);
  const P = Math.min(1, (n(ct) * n(total)) / 60 / run);
  const Q = n(good) / n(total);
  const oee = A * P * Q;
  return (
    <Shell
      title={t("Tính OEE", "OEE calculator")}
      results={
        <>
          <Result label="Availability" value={pct(A)} />
          <Result label="Performance" value={pct(P)} />
          <Result label="Quality" value={pct(Q)} />
          <Result label="OEE" value={pct(oee)} status={oee >= 0.85 ? "good" : oee >= 0.6 ? "warning" : "critical"} note={oee >= 0.85 ? "World-class" : oee >= 0.6 ? t("Phổ biến", "Typical") : t("Thấp", "Low")} />
        </>
      }
    >
      <Input label={t("Thời gian kế hoạch", "Planned time")} value={planned} onChange={setPlanned} unit={t("phút", "min")} />
      <Input label={t("Dừng máy", "Downtime")} value={down} onChange={setDown} unit={t("phút", "min")} />
      <Input label={t("CT chuẩn", "Ideal CT")} value={ct} onChange={setCt} unit="s" />
      <Input label={t("Tổng sản lượng", "Total output")} value={total} onChange={setTotal} unit="board" />
      <Input label={t("Đạt lần đầu", "Good first pass")} value={good} onChange={setGood} unit="board" />
    </Shell>
  );
}

function TaktCalc() {
  const t = useT();
  const [avail, setAvail] = useState("450");
  const [demand, setDemand] = useState("900");
  const [ct, setCt] = useState("28");
  const [perPanel, setPerPanel] = useState("1");
  const takt = (n(avail) * 60) / n(demand);
  const uph = (3600 / n(ct)) * n(perPanel);
  const ctPerBoard = n(ct) / n(perPanel);
  const ok = ctPerBoard <= takt;
  return (
    <Shell
      title={t("Tính Takt time & UPH", "Takt time & UPH")}
      results={
        <>
          <Result label="Takt" value={`${f(takt, 1)} s/board`} />
          <Result label="UPH max" value={f(uph, 0)} />
          <Result label={t("CT / board", "CT per board")} value={`${f(ctPerBoard, 1)} s`} status={ok ? "good" : "critical"} note={ok ? t("Đáp ứng nhu cầu", "Meets demand") : t("Không kịp nhu cầu", "Cannot meet demand")} />
          <Result label={t("Năng lực / ca", "Capacity / shift")} value={f((n(avail) * 60) / ctPerBoard, 0)} />
        </>
      }
    >
      <Input label={t("Thời gian có sẵn", "Available time")} value={avail} onChange={setAvail} unit={t("phút", "min")} />
      <Input label={t("Nhu cầu", "Demand")} value={demand} onChange={setDemand} unit="board" />
      <Input label={t("CT trạm chậm nhất", "Bottleneck CT")} value={ct} onChange={setCt} unit="s/panel" />
      <Input label={t("Số board / panel", "Boards per panel")} value={perPanel} onChange={setPerPanel} step="1" />
    </Shell>
  );
}

function RtyCalc() {
  const t = useT();
  const [list, setList] = useState("98, 99, 97");
  const steps = list.split(/[\s,;]+/).map(n).filter((x) => Number.isFinite(x) && x > 0);
  const rty = steps.reduce((p, x) => p * (x > 1 ? x / 100 : x), 1);
  return (
    <Shell title={t("Tính RTY", "RTY calculator")} results={<><Result label={t("Số công đoạn", "Steps")} value={String(steps.length)} /><Result label="RTY" value={pct(rty, 2)} /><Result label={t("Board phải sửa / 100", "Reworked per 100")} value={f((1 - rty) * 100, 1)} /></>}>
      <label className="block space-y-1 text-sm sm:col-span-2 lg:col-span-4">
        <span className="font-medium">{t("FPY từng công đoạn (%), cách nhau bởi dấu phẩy", "FPY of each step (%), comma separated")}</span>
        <input value={list} onChange={(e) => setList(e.target.value)} className="input" />
      </label>
    </Shell>
  );
}

function MtbfCalc() {
  const t = useT();
  const [hours, setHours] = useState("720");
  const [fails, setFails] = useState("6");
  const [repair, setRepair] = useState("270");
  const mtbf = n(hours) / n(fails);
  const mttr = n(repair) / n(fails);
  const avail = mtbf / (mtbf + mttr / 60);
  return (
    <Shell title="MTBF / MTTR" results={<><Result label="MTBF" value={`${f(mtbf, 1)} h`} /><Result label="MTTR" value={`${f(mttr, 0)} ${t("phút", "min")}`} /><Result label="Availability" value={pct(avail, 2)} /></>}>
      <Input label={t("Tổng thời gian chạy", "Operating time")} value={hours} onChange={setHours} unit="h" />
      <Input label={t("Số lần hỏng", "Failures")} value={fails} onChange={setFails} step="1" />
      <Input label={t("Tổng thời gian sửa", "Total repair time")} value={repair} onChange={setRepair} unit={t("phút", "min")} />
    </Shell>
  );
}

const MSL_HOURS: Record<string, number> = { "2": 8760, "2a": 672, "3": 168, "4": 72, "5": 48, "5a": 24 };

function MslCalc() {
  const t = useT();
  const [level, setLevel] = useState("3");
  const [opened, setOpened] = useState("");
  const [used, setUsed] = useState("0");
  const limit = MSL_HOURS[level];
  const since = opened ? (Date.now() - new Date(opened).getTime()) / 3600_000 : 0;
  const spent = Math.max(0, since) + n(used || "0");
  const left = limit - spent;
  const st: Status = left <= 0 ? "critical" : left < limit * 0.2 ? "warning" : "good";
  return (
    <Shell
      title={t("Thời gian sàn MSL còn lại", "MSL floor life remaining")}
      results={
        <>
          <Result label={t("Giới hạn", "Floor life")} value={`${f(limit, 0)} h`} />
          <Result label={t("Đã dùng", "Used")} value={`${f(spent, 1)} h`} />
          <Result label={t("Còn lại", "Remaining")} value={`${f(Math.max(0, left), 1)} h`} status={st} note={st === "critical" ? t("Hết hạn – phải sấy", "Expired – bake") : st === "warning" ? t("Sắp hết", "Almost out") : "OK"} />
        </>
      }
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">MSL</span>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="input">
          {Object.keys(MSL_HOURS).map((k) => (
            <option key={k} value={k}>
              MSL {k}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("Giờ mở túi (lần này)", "Bag opened at")}</span>
        <input type="datetime-local" value={opened} onChange={(e) => setOpened(e.target.value)} className="input" />
      </label>
      <Input label={t("Giờ đã dùng các lần trước", "Hours used before")} value={used} onChange={setUsed} unit="h" />
    </Shell>
  );
}

export function HandbookCalculator({ id }: { id: CalculatorId }) {
  switch (id) {
    case "cpk":
      return <CpkCalc />;
    case "sigma":
      return <SigmaCalc />;
    case "area-ratio":
      return <AreaRatioCalc />;
    case "oee":
      return <OeeCalc />;
    case "takt":
      return <TaktCalc />;
    case "rty":
      return <RtyCalc />;
    case "mtbf":
      return <MtbfCalc />;
    case "msl":
      return <MslCalc />;
  }
}
