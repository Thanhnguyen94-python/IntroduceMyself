import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { parseDate } from "@/lib/smt/datasets";
import { clearDemo, finishDemo, readDemoMeta, readStorageStats, runDemoStep, startDemo } from "@/lib/smt/demo-store";

export const dynamic = "force-dynamic";
// Mỗi bước ghi ~1 tháng dữ liệu (~9.000 dòng), thường xong trong vài giây.
export const maxDuration = 60;

// GET: trạng thái demo + dung lượng database.
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const meta = await readDemoMeta();
  try {
    return NextResponse.json({ meta, storage: await readStorageStats() });
  } catch (error) {
    return NextResponse.json({ meta, storage: null, storageError: error instanceof Error ? error.message : "Không đọc được dung lượng." });
  }
}

// POST {action: "start"} -> xoá demo cũ, trả danh sách bước
//      {action: "step", step, from, to} -> ghi 1 bước
//      {action: "finish", from, to} -> đếm số dòng, đánh dấu hoàn tất
//      {action: "clear"} -> xoá toàn bộ demo
export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { action?: string; step?: string; from?: string; to?: string } | null;
  const win = { from: parseDate(body?.from ?? "") ?? "", to: parseDate(body?.to ?? "") ?? "" };
  try {
    if (body?.action === "start") return NextResponse.json(await startDemo());
    if (body?.action === "clear") {
      await clearDemo();
      return NextResponse.json({ ok: true });
    }
    if (!win.from || !win.to || win.from > win.to) return NextResponse.json({ message: "Thiếu kỳ dữ liệu." }, { status: 400 });
    if (body?.action === "step" && body.step) return NextResponse.json({ ok: true, rows: await runDemoStep(win, body.step) });
    if (body?.action === "finish") return NextResponse.json({ ok: true, meta: await finishDemo(win) });
    return NextResponse.json({ message: "Hành động không hợp lệ." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Thất bại." }, { status: 500 });
  }
}
