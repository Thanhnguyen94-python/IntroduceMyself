import { DEFAULT_SMT_SETTINGS } from "@/lib/smt/defaults";
import type { SmtLine, SmtSettings } from "@/lib/smt/types";

// Cấu hình nhà máy DEMO: 10 line chia 3 cấp để so sánh hiệu quả đầu tư thiết bị.
//  - Cơ bản (L01-L03): 3 Mounter, không M-AOI, chạy 2 ca.
//  - M-AOI  (L04-L06): 4 Mounter + AOI trước lò (bắt lỗi gắn linh kiện trước khi hàn).
//  - Pro    (L07-L10): 5-6 Mounter, SPI/AOI 3D, M-AOI, lò N2, X-ray (AXI) inline.
// Tên máy là các dòng máy phổ biến trong ngành để dễ hình dung, số liệu hoàn toàn mô phỏng.

export type LineTier = "basic" | "maoi" | "pro";

export const LINE_TIERS: Array<{ id: LineTier; vi: string; en: string; desc: { vi: string; en: string } }> = [
  { id: "basic", vi: "Cơ bản", en: "Basic", desc: { vi: "Printer · SPI · 3 Mounter · Reflow · AOI", en: "Printer · SPI · 3 mounters · Reflow · AOI" } },
  { id: "maoi", vi: "Có M-AOI", en: "With M-AOI", desc: { vi: "Thêm Mounter thứ 4 và AOI trước lò (M-AOI)", en: "4th mounter + pre-reflow AOI (M-AOI)" } },
  { id: "pro", vi: "Pro", en: "Pro", desc: { vi: "5-6 Mounter · SPI/AOI 3D · M-AOI · lò N2 · X-ray inline", en: "5-6 mounters · 3D SPI/AOI · M-AOI · N2 reflow · inline X-ray" } }
];

// Suy ra cấp line từ danh sách trạm (dùng được cho cả line thật trong Cài đặt):
// có trạm M-AOI đứng trước Reflow -> "maoi"; thêm ≥ 4 mounter và X-ray/AXI -> "pro".
export function lineTier(line: Pick<SmtLine, "stations">): LineTier {
  const st = line.stations.map((s) => s.toLowerCase());
  const reflow = st.findIndex((s) => s.includes("reflow"));
  const hasMaoi = st.some((s, i) => /m-?aoi|pre-?aoi/.test(s) && (reflow < 0 || i < reflow));
  const mounters = st.filter((s) => /mount|nxt|npm|cm\d|siplace|yrm|ysm/.test(s)).length;
  const hasAxi = st.some((s) => /axi|x-?ray/.test(s));
  if (hasMaoi && mounters >= 4 && hasAxi) return "pro";
  return hasMaoi ? "maoi" : "basic";
}

export type DemoModel = { model: string; ct: number; opp: number; share: number; bga?: boolean; desc: string };

export type DemoLine = SmtLine & {
  tier: LineTier;
  shifts: number;
  models: DemoModel[];
};

const mounters = (n: number) => Array.from({ length: n }, (_, i) => `Mounter ${i + 1}`);

const BASIC = (n: number) => ["Printer", "SPI", ...mounters(n), "Reflow", "AOI"];
const MAOI = (n: number) => ["Printer", "SPI", ...mounters(n), "M-AOI", "Reflow", "AOI"];
const PRO = (n: number) => ["Printer", "SPI 3D", ...mounters(n), "M-AOI", "Reflow N2", "AOI 3D", "AXI"];

export const DEMO_LINES: DemoLine[] = [
  {
    code: "L01", name: "L01 · Yamaha YSM20R", tier: "basic", shifts: 2, taktSec: 30, stations: BASIC(3),
    models: [
      { model: "LED-D12", ct: 21, opp: 380, share: 0.45, desc: "Driver LED 12W" },
      { model: "PSU-65W", ct: 27, opp: 640, share: 0.35, desc: "Bộ nguồn 65W" },
      { model: "RC-08", ct: 18, opp: 290, share: 0.2, desc: "Remote điều khiển" }
    ]
  },
  {
    code: "L02", name: "L02 · Juki RS-1R", tier: "basic", shifts: 2, taktSec: 32, stations: BASIC(3),
    models: [
      { model: "PSU-65W", ct: 28, opp: 640, share: 0.55, desc: "Bộ nguồn 65W" },
      { model: "CHG-20W", ct: 24, opp: 520, share: 0.45, desc: "Sạc nhanh 20W" }
    ]
  },
  {
    code: "L03", name: "L03 · Hanwha DECAN S2", tier: "basic", shifts: 2, taktSec: 28, stations: BASIC(3),
    models: [
      { model: "LED-D12", ct: 20, opp: 380, share: 0.5, desc: "Driver LED 12W" },
      { model: "SNS-T1", ct: 23, opp: 450, share: 0.5, desc: "Cảm biến nhiệt độ" }
    ]
  },
  {
    code: "L04", name: "L04 · Fuji NXT III", tier: "maoi", shifts: 3, taktSec: 36, stations: MAOI(4),
    models: [
      { model: "IOT-G4", ct: 33, opp: 1120, share: 0.6, desc: "IoT Gateway" },
      { model: "SMR-3P", ct: 30, opp: 980, share: 0.4, desc: "Công tơ điện 3 pha" }
    ]
  },
  {
    code: "L05", name: "L05 · Yamaha YRM20", tier: "maoi", shifts: 3, taktSec: 38, stations: MAOI(4),
    models: [
      { model: "MCU-M7", ct: 36, opp: 1350, share: 0.55, desc: "Bo điều khiển động cơ" },
      { model: "IOT-G4", ct: 32, opp: 1120, share: 0.45, desc: "IoT Gateway" }
    ]
  },
  {
    code: "L06", name: "L06 · Panasonic NPM-D3A", tier: "maoi", shifts: 3, taktSec: 34, stations: MAOI(4),
    models: [
      { model: "SMR-3P", ct: 29, opp: 980, share: 0.5, desc: "Công tơ điện 3 pha" },
      { model: "INV-2K", ct: 34, opp: 1240, share: 0.5, desc: "Bo inverter 2kW" }
    ]
  },
  {
    code: "L07", name: "L07 · Panasonic NPM-W2", tier: "pro", shifts: 3, taktSec: 46, stations: PRO(5),
    models: [
      { model: "ECU-A9", ct: 44, opp: 2620, share: 0.65, bga: true, desc: "ECU ô tô" },
      { model: "TBX-7", ct: 41, opp: 2280, share: 0.35, bga: true, desc: "Telematics box" }
    ]
  },
  {
    code: "L08", name: "L08 · ASM SIPLACE TX", tier: "pro", shifts: 3, taktSec: 46, stations: PRO(5),
    models: [
      { model: "ECU-A9", ct: 43, opp: 2620, share: 0.5, bga: true, desc: "ECU ô tô" },
      { model: "5G-RF1", ct: 39, opp: 2100, share: 0.5, bga: true, desc: "Module 5G" }
    ]
  },
  {
    code: "L09", name: "L09 · Fuji NXT III (high-mix)", tier: "pro", shifts: 3, taktSec: 58, stations: PRO(6),
    models: [
      { model: "SRV-MB2", ct: 55, opp: 3820, share: 0.4, bga: true, desc: "Mainboard server" },
      { model: "5G-RF1", ct: 38, opp: 2100, share: 0.3, bga: true, desc: "Module 5G" },
      { model: "TBX-7", ct: 40, opp: 2280, share: 0.3, bga: true, desc: "Telematics box" }
    ]
  },
  {
    code: "L10", name: "L10 · ASM SIPLACE TX", tier: "pro", shifts: 3, taktSec: 58, stations: PRO(6),
    models: [
      { model: "SRV-MB2", ct: 54, opp: 3820, share: 0.7, bga: true, desc: "Mainboard server" },
      { model: "ECU-A9", ct: 43, opp: 2620, share: 0.3, bga: true, desc: "ECU ô tô" }
    ]
  }
];

export const DEMO_SMT_SETTINGS: SmtSettings = {
  ...DEFAULT_SMT_SETTINGS,
  company: "SMT Demo Factory",
  lines: DEMO_LINES.map(({ code, name, stations, taktSec }) => ({ code, name, stations, taktSec })),
  publicSource: "demo",
  publicDays: 30
};
