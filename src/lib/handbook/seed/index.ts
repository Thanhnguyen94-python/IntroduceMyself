import type { HandbookEntry } from "@/lib/handbook/types";
import { QUALITY } from "@/lib/handbook/seed/quality";
import { PRODUCTIVITY } from "@/lib/handbook/seed/productivity";
import { PRINTING } from "@/lib/handbook/seed/printing";
import { PLACEMENT } from "@/lib/handbook/seed/placement";
import { REFLOW } from "@/lib/handbook/seed/reflow";
import { MATERIALS } from "@/lib/handbook/seed/materials";
import { INSPECTION } from "@/lib/handbook/seed/inspection";
import { PROBLEM } from "@/lib/handbook/seed/problem";

// Bộ mục sổ tay mặc định (nội dung viết sẵn). Admin → Sổ tay SMT → "Nạp bộ mặc định" để chép vào database rồi sửa.
export const HANDBOOK_SEED: HandbookEntry[] = [...QUALITY, ...PRODUCTIVITY, ...PRINTING, ...PLACEMENT, ...REFLOW, ...MATERIALS, ...INSPECTION, ...PROBLEM];
