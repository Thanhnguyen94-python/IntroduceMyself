import { NextResponse } from "next/server";
import { currentActor } from "@/lib/smt/accounts";
import { apiFail, deny } from "@/lib/smt/api-helpers";
import { listChannels, saveChannel } from "@/lib/smt/chat-store";
import { can } from "@/lib/smt/permissions";
import { readSmtSettings } from "@/lib/smt/store";

export const dynamic = "force-dynamic";

// Quản lý kênh chat (admin + trợ lý): thêm, đổi tên, lưu trữ (ẩn). Không xoá hẳn để giữ lịch sử.
export async function GET() {
  const actor = await currentActor();
  if (!can(actor, "channels.manage")) return deny("Unauthorized", 401);
  return NextResponse.json({ items: await listChannels(await readSmtSettings(), true) });
}

export async function POST(request: Request) {
  const actor = await currentActor();
  if (!actor) return deny("Cần đăng nhập.", 401);
  try {
    return NextResponse.json({ ok: true, item: await saveChannel(actor, (await request.json().catch(() => ({}))) as Record<string, unknown>) });
  } catch (error) {
    return apiFail(error, "Lưu kênh thất bại.");
  }
}

export const PATCH = POST;
