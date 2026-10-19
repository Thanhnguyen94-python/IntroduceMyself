import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { deleteRows, getRow, updateRows } from "@/lib/data/table-store";
import { cleanText } from "@/lib/rate-limit";
import { notifyVisitorReply, siteOrigin } from "@/lib/notify";
import { LIMITS, addMessage, listMessages, toPublicMessage, type ChatConversation } from "@/lib/chat/chat-store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function load(ctx: Ctx) {
  if (!(await isAdminRequest())) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: NextResponse.json({ message: "Not found" }, { status: 404 }) };
  const conv = await getRow<ChatConversation>("chat_conversations", id);
  if (!conv) return { error: NextResponse.json({ message: "Không tìm thấy cuộc trò chuyện." }, { status: 404 }) };
  return { conv };
}

// GET: tin nhắn (đánh dấu admin đã đọc). ?after=<iso> để chỉ lấy tin mới.
export async function GET(request: Request, ctx: Ctx) {
  const r = await load(ctx);
  if ("error" in r) return r.error;
  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  const messages = await listMessages(r.conv.id, after && !Number.isNaN(Date.parse(after)) ? after : undefined);
  if (r.conv.unread_admin) await updateRows("chat_conversations", { id: r.conv.id }, { unread_admin: 0 });
  const { access_token: _secret, ...conversation } = r.conv;
  return NextResponse.json({ conversation: { ...conversation, unread_admin: 0 }, messages: messages.map(toPublicMessage) });
}

// POST {body}: admin trả lời. Khách để lại email -> gửi email báo (tối đa 1 lần / cuộc trò chuyện / 10 phút).
const lastEmailed = new Map<string, number>();
export async function POST(request: Request, ctx: Ctx) {
  const r = await load(ctx);
  if ("error" in r) return r.error;
  const payload = (await request.json().catch(() => ({}))) as { body?: string };
  const body = cleanText(payload.body, LIMITS.body);
  if (!body) return NextResponse.json({ message: "Nội dung trống." }, { status: 400 });

  const saved = await addMessage(r.conv, "admin", body);
  if (r.conv.contact && Date.now() - (lastEmailed.get(r.conv.id) ?? 0) > 10 * 60_000) {
    lastEmailed.set(r.conv.id, Date.now());
    const lastQuestion = (await listMessages(r.conv.id)).filter((m) => m.sender === "visitor").pop()?.body ?? "";
    const link = `${siteOrigin(request)}${r.conv.page && r.conv.page.startsWith("/") ? r.conv.page : "/"}`;
    await notifyVisitorReply(r.conv.contact, { name: r.conv.name, question: lastQuestion, reply: body, link, context: "tin nhắn" });
  }
  return NextResponse.json({ ok: true, message: toPublicMessage(saved) });
}

// PATCH {status}: đóng / mở lại cuộc trò chuyện.
export async function PATCH(request: Request, ctx: Ctx) {
  const r = await load(ctx);
  if ("error" in r) return r.error;
  const payload = (await request.json().catch(() => ({}))) as { status?: string };
  if (payload.status !== "open" && payload.status !== "closed") return NextResponse.json({ message: "Invalid status." }, { status: 400 });
  await updateRows("chat_conversations", { id: r.conv.id }, { status: payload.status });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const r = await load(ctx);
  if ("error" in r) return r.error;
  await deleteRows("chat_conversations", { id: r.conv.id });
  return NextResponse.json({ ok: true });
}
