import { NextResponse } from "next/server";
import { currentActor } from "@/lib/smt/accounts";
import { apiFail, deny } from "@/lib/smt/api-helpers";
import { activeGrant, cancelRequest, decideRequest, listRequests, requestDelete, type DeleteScope, type DeleteTarget } from "@/lib/smt/delete-grants";
import { can } from "@/lib/smt/permissions";
import { siteOrigin } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Xin quyền xoá: trợ lý gửi (POST), admin duyệt / từ chối (PATCH), trợ lý huỷ yêu cầu của mình (PATCH action=cancel).
export async function GET() {
  const actor = await currentActor();
  if (!actor || !(can(actor, "delete.request") || can(actor, "delete.decide"))) return deny("Unauthorized", 401);
  try {
    const grant = can(actor, "delete.request") ? await activeGrant(actor.id) : null;
    return NextResponse.json({ items: await listRequests(actor), grant });
  } catch (error) {
    return apiFail(error, "Không đọc được yêu cầu.");
  }
}

export async function POST(request: Request) {
  const actor = await currentActor();
  if (!actor) return deny("Cần đăng nhập.", 401);
  const body = (await request.json().catch(() => ({}))) as { target?: DeleteTarget; reason?: string };
  if (!body.target) return deny("Thiếu dữ liệu cần xoá.", 400);
  try {
    return NextResponse.json({ ok: true, item: await requestDelete(actor, body.target, String(body.reason ?? ""), siteOrigin(request)) });
  } catch (error) {
    return apiFail(error, "Gửi yêu cầu thất bại.");
  }
}

// PATCH {id, approve: true|false, scope: "once"|"day"|"month"}  ·  {id, action: "cancel"}
export async function PATCH(request: Request) {
  const actor = await currentActor();
  if (!actor) return deny("Cần đăng nhập.", 401);
  const body = (await request.json().catch(() => ({}))) as { id?: string; approve?: boolean; scope?: DeleteScope; action?: string };
  if (!body.id) return deny("Missing id.", 400);
  try {
    if (body.action === "cancel") await cancelRequest(actor, body.id);
    else await decideRequest(actor, body.id, Boolean(body.approve), body.scope === "day" || body.scope === "month" ? body.scope : "once");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFail(error, "Thao tác thất bại.");
  }
}
