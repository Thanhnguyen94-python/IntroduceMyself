import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { readSmtSettings, writeSmtSettings } from "@/lib/smt/store";
import type { SmtSettings } from "@/lib/smt/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
