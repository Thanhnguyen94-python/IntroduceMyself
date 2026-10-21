import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { currentActor } from "@/lib/smt/accounts";
import { can } from "@/lib/smt/permissions";
import { readSmtSettings, writeSmtSettings } from "@/lib/smt/store";
import type { SmtSettings } from "@/lib/smt/types";

export const dynamic = "force-dynamic";

// GET: admin + trợ lý (form nhập liệu cần danh sách line / mã lỗi). PUT: chỉ admin (đổi line, mục tiêu KPI).
export async function GET() {
  if (!can(await currentActor(), "data.write")) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await readSmtSettings() });
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { settings?: Partial<SmtSettings> } | null;
  if (!body?.settings) return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, settings: await writeSmtSettings(body.settings) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Lưu thất bại." }, { status: 500 });
  }
}
