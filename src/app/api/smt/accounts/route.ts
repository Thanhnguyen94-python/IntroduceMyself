import { NextResponse } from "next/server";
import { createAccount, currentActor, deleteAccount, listAccounts, resetAccountPassword, updateAccount } from "@/lib/smt/accounts";
import { apiFail, deny } from "@/lib/smt/api-helpers";
import { can } from "@/lib/smt/permissions";

export const dynamic = "force-dynamic";

// Quản lý tài khoản Trợ lý / Kỹ sư: chỉ admin.
// POST {username, display_name, role, engineer_id} -> trả mật khẩu tạm 1 lần
// PATCH {id, display_name?, role?, engineer_id?, active?} · {id, action: "reset"} -> mật khẩu tạm mới
async function guard() {
  const actor = await currentActor();
  return can(actor, "accounts.manage") ? null : deny("Chỉ admin quản lý tài khoản.", actor ? 403 : 401);
}

export async function GET() {
  const g = await guard();
  if (g) return g;
  try {
    return NextResponse.json({ items: await listAccounts() });
  } catch (error) {
    return apiFail(error, "Không đọc được tài khoản.");
  }
}

export async function POST(request: Request) {
  const g = await guard();
  if (g) return g;
  try {
    const result = await createAccount((await request.json().catch(() => ({}))) as Record<string, unknown>);
    return NextResponse.json({ ok: true, item: result.account, password: result.password });
  } catch (error) {
    return apiFail(error, "Tạo tài khoản thất bại.");
  }
}

export async function PATCH(request: Request) {
  const g = await guard();
  if (g) return g;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown> & { id?: string; action?: string };
  if (!body.id) return deny("Missing id.", 400);
  try {
    if (body.action === "reset") return NextResponse.json({ ok: true, password: await resetAccountPassword(body.id) });
    return NextResponse.json({ ok: true, item: await updateAccount(body.id, body as Parameters<typeof updateAccount>[1]) });
  } catch (error) {
    return apiFail(error, "Cập nhật thất bại.");
  }
}

export async function DELETE(request: Request) {
  const g = await guard();
  if (g) return g;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return deny("Missing id.", 400);
  try {
    await deleteAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFail(error, "Xoá thất bại.");
  }
}
