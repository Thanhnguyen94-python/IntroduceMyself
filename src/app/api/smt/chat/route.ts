import { NextResponse } from "next/server";
import { currentActor } from "@/lib/smt/accounts";
import { apiFail, deny } from "@/lib/smt/api-helpers";
import { canDeleteOwnMessage, listChannels, listMessages, openIssues, postMessage, softDeleteMessage, updateMessage } from "@/lib/smt/chat-store";
import { assertCanDelete } from "@/lib/smt/delete-grants";
import { readSmtSettings } from "@/lib/smt/store";

export const dynamic = "force-dynamic";

// Nhóm chat SMT (chỉ người đã đăng nhập: admin / trợ lý / kỹ sư).
// GET ?channel=<id>&after=<iso>  -> tin mới (trình duyệt gọi lại vài giây / lần)
// GET ?channel=<id>&before=<iso> -> tin cũ hơn (cuộn lên)
// GET (không channel)            -> danh sách kênh + các "Vấn đề" chưa xử lý
export async function GET(request: Request) {
  const actor = await currentActor();
  if (!actor) return deny("Cần đăng nhập.", 401);
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  try {
    if (!channel) {
      const [channels, issues] = await Promise.all([listChannels(await readSmtSettings()), openIssues()]);
      return NextResponse.json({ channels, issues });
    }
    const after = url.searchParams.get("after") ?? undefined;
    const before = url.searchParams.get("before") ?? undefined;
    return NextResponse.json({ items: await listMessages(channel, { after, before }) });
  } catch (error) {
    return apiFail(error, "Không đọc được tin nhắn.");
  }
}

export async function POST(request: Request) {
  const actor = await currentActor();
  if (!actor) return deny("Cần đăng nhập.", 401);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.channel_id) return deny("Thiếu kênh.", 400);
  try {
    return NextResponse.json({ ok: true, item: await postMessage(actor, String(body.channel_id), body) });
  } catch (error) {
    return apiFail(error, "Gửi tin thất bại.");
  }
}

// PATCH {id, body?} (sửa tin của mình trong 15 phút) · {id, resolved?, is_issue?}
export async function PATCH(request: Request) {
  const actor = await currentActor();
  if (!actor) return deny("Cần đăng nhập.", 401);
  const body = (await request.json().catch(() => null)) as (Record<string, unknown> & { id?: string }) | null;
  if (!body?.id) return deny("Missing id.", 400);
  try {
    return NextResponse.json({ ok: true, item: await updateMessage(actor, body.id, body as Parameters<typeof updateMessage>[2]) });
  } catch (error) {
    return apiFail(error, "Cập nhật thất bại.");
  }
}

// Xoá: người viết trong 15 phút; admin bất cứ lúc nào; trợ lý cần xin quyền.
export async function DELETE(request: Request) {
  const actor = await currentActor();
  if (!actor) return deny("Cần đăng nhập.", 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return deny("Missing id.", 400);
  try {
    if (!(await canDeleteOwnMessage(actor, id))) await assertCanDelete(actor);
    await softDeleteMessage(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFail(error, "Xoá thất bại.");
  }
}
