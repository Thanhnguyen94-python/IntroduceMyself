import type { SmtSettings } from "@/lib/smt/types";

// Cài đặt mặc định: 2 line SMT điển hình + danh mục lỗi theo thuật ngữ IPC-A-610.
// Sửa trong Admin → SMT → Cài đặt (lưu site_content['smt_settings']).
export const DEFAULT_SMT_SETTINGS: SmtSettings = {
  company: "SMT Engineering",
  lines: [
    { code: "L1", name: "Line 1 (Panasonic NPM)", stations: ["Printer", "SPI", "Mounter 1", "Mounter 2", "Mounter 3", "Reflow", "AOI"], taktSec: 32 },
    { code: "L2", name: "Line 2 (Fuji NXT)", stations: ["Printer", "SPI", "NXT M3 #1", "NXT M3 #2", "NXT M6", "Reflow", "AOI"], taktSec: 40 }
  ],
  shifts: ["Ca 1", "Ca 2", "Ca 3"],
  defectCatalog: [
    { code: "BRG", vi: "Chập thiếc (Bridge)", en: "Solder bridge", process: "print" },
    { code: "INS", vi: "Thiếu thiếc", en: "Insufficient solder", process: "print" },
    { code: "EXS", vi: "Thừa thiếc", en: "Excess solder", process: "print" },
    { code: "MIS", vi: "Thiếu linh kiện", en: "Missing component", process: "placement" },
    { code: "SHF", vi: "Lệch linh kiện", en: "Component shift", process: "placement" },
    { code: "POL", vi: "Ngược cực tính", en: "Wrong polarity", process: "placement" },
    { code: "BIL", vi: "Linh kiện dựng đứng / lật", en: "Billboarding / flipped", process: "placement" },
    { code: "WRG", vi: "Sai linh kiện", en: "Wrong component", process: "material" },
    { code: "TMB", vi: "Bia mộ (Tombstone)", en: "Tombstone", process: "reflow" },
    { code: "OPN", vi: "Hở mối hàn / không ăn thiếc", en: "Open / non-wetting", process: "reflow" },
    { code: "SBL", vi: "Bi thiếc", en: "Solder ball", process: "reflow" },
    { code: "VOD", vi: "Rỗ khí BGA (Void)", en: "BGA voiding", process: "reflow" },
    { code: "LFT", vi: "Chân bị nhấc", en: "Lifted lead", process: "reflow" },
    { code: "DMG", vi: "Vỡ / hư linh kiện", en: "Damaged component", process: "manual" },
    { code: "CON", vi: "Bẩn / dư flux", en: "Contamination / flux residue", process: "manual" }
  ],
  targets: { oee: 0.85, fpy: 0.98, dpmo: 100, mispickRate: 0.003, availability: 0.9 },
  publicSource: "demo",
  publicDays: 30
};
