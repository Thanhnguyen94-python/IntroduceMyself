import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { parseDate } from "@/lib/smt/datasets";
import { buildDemoBundle } from "@/lib/smt/demo";
import { DEMO_SMT_SETTINGS } from "@/lib/smt/demo-config";
import { readDemoMeta } from "@/lib/smt/demo-meta";
import { loadBundle } from "@/lib/smt/store";
import { addDays, daysBetween, todayVn } from "@/lib/smt/types";

export const dynamic = "force-dynamic";

// GET ?from&to[&demo=1]: toàn bộ dữ liệu của kỳ báo cáo cho trang "Báo cáo" trong Admin.
// demo=1: bản demo trong database (nếu đã tạo) hoặc tính tạm; trả kèm settings 10 line demo.
export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const to = parseDate(url.searchParams.get("to") ?? "") ?? todayVn();
  let from = parseDate(url.searchParams.get("from") ?? "") ?? addDays(to, -29);
  if (from > to || daysBetween(from, to) > 366) from = addDays(to, -29);
  try {
    if (url.searchParams.get("demo") !== "1") return NextResponse.json({ from, to, bundle: await loadBundle({ from, to }) });
    const bundle = (await readDemoMeta()) ? await loadBundle({ from, to, demo: true }) : buildDemoBundle(daysBetween(from, to) + 1, to);
    return NextResponse.json({ from, to, bundle, settings: DEMO_SMT_SETTINGS });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không đọc được dữ liệu." }, { status: 500 });
  }
}
