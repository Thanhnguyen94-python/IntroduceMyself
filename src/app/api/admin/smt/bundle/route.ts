import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { parseDate } from "@/lib/smt/datasets";
import { buildDemoBundle } from "@/lib/smt/demo";
import { loadBundle } from "@/lib/smt/store";
import { addDays, daysBetween, todayVn } from "@/lib/smt/types";

export const dynamic = "force-dynamic";

// GET ?from&to[&demo=1]: toàn bộ dữ liệu của kỳ báo cáo cho trang "Báo cáo" trong Admin.
export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const to = parseDate(url.searchParams.get("to") ?? "") ?? todayVn();
  let from = parseDate(url.searchParams.get("from") ?? "") ?? addDays(to, -29);
  if (from > to || daysBetween(from, to) > 366) from = addDays(to, -29);
  try {
    const bundle = url.searchParams.get("demo") === "1" ? buildDemoBundle(daysBetween(from, to) + 1, to) : await loadBundle({ from, to });
    return NextResponse.json({ from, to, bundle });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không đọc được dữ liệu." }, { status: 500 });
  }
}
