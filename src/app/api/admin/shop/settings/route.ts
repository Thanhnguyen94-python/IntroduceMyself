import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { readShopSettings, writeShopSettings } from "@/lib/shop/store";
import type { ShopSettings } from "@/lib/shop/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await readShopSettings() });
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { settings?: Partial<ShopSettings> } | null;
  if (!body?.settings) return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, settings: await writeShopSettings(body.settings) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Lưu thất bại." }, { status: 500 });
  }
}
