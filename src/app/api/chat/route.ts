import { NextResponse } from "next/server";
import { insertRow, isStorageAvailable, updateRows } from "@/lib/data/table-store";
import { getRequestInfo } from "@/lib/analytics/request-info";
import { cleanText, clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { notifyAdmin, siteOrigin } from "@/lib/notify";
import { LIMITS, addMessage, getConversationForVisitor, listMessages, newAccessToken, shouldNotify, toPublicMessage, type ChatConversation } from "@/lib/chat/chat-store";

export const dynamic = "force-dynamic";

const unavailable = () => NextResponse.json({ message: "Chat tạm thời chưa khả dụng." }, { status: 503 });

// GET ?c=<id>&t=<token>[&after=<iso>][&peek=1]
//   peek=1: chỉ trả số tin admin chưa đọc (khi khung chat đang thu gọn).
//   còn lại: trả tin nhắn mới và đánh dấu khách đã đọc.
export async function GET(request: Request) {
  if (!isStorageAvailable()) return unavailable();
  const url = new URL(request.url);
  const conv = await getConversationForVisitor(url.searchParams.get("c") ?? "", url.searchParams.get("t") ?? "").catch(() => null);
  if (!conv) return NextResponse.json({ message: "Không tìm thấy cuộc trò chuyện." }, { status: 404 });

  if (url.searchParams.get("peek") === "1") {
    return NextResponse.json({ unread: conv.unread_visitor ?? 0, status: conv.status });
  }

  const after = url.searchParams.get("after") ?? undefined;
  const messages = await listMessages(conv.id, after && !Number.isNaN(Date.parse(after)) ? after : undefined);
  if (conv.unread_visitor) await updateRows("chat_conversations", { id: conv.id }, { unread_visitor: 0 });
  return NextResponse.json({ status: conv.status, name: conv.name, messages: messages.map(toPublicMessage) });
}

// POST: bắt đầu cuộc trò chuyện {name, contact?, message, page, hub, visitorId, website(honeypot)}
//       hoặc gửi tiếp {c, t, message}
export async function POST(request: Request) {
  if (!isStorageAvailable()) return unavailable();
  const fp = clientFingerprint(request);
  if (!rateLimit(`chat:${fp}`, 12, 60_000) || !rateLimit(`chat-h:${fp}`, 80, 3600_000)) {
    return NextResponse.json({ message: "Bạn gửi hơi nhanh, đợi một chút rồi gửi tiếp nhé." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  // Ô ẩn "website": người không nhìn thấy nên không điền; bot điền -> giả vờ thành công.
  if (cleanText(body.website, 100)) return NextResponse.json({ ok: true });

  const message = cleanText(body.message, LIMITS.body);
  if (!message) return NextResponse.json({ message: "Vui lòng nhập nội dung." }, { status: 400 });
  const origin = siteOrigin(request);

  try {
    // Gửi tiếp trong cuộc trò chuyện đã có
    if (body.c) {
      const conv = await getConversationForVisitor(cleanText(body.c, 64), cleanText(body.t, 100));
      if (!conv) return NextResponse.json({ message: "Không tìm thấy cuộc trò chuyện." }, { status: 404 });
      const saved = await addMessage(conv, "visitor", message);
      if (shouldNotify(conv.id)) {
        await notifyAdmin({
          channel: "chat",
          title: `Tin nhắn mới từ ${conv.name}`,
          fields: [
            ["Liên hệ", conv.contact || "(không để lại)"],
            ["Trang", conv.page || "-"]
          ],
          message,
          link: `${origin}/admin/inbox?c=${conv.id}`,
          replyTo: conv.contact ?? undefined
        });
      }
      return NextResponse.json({ ok: true, message: toPublicMessage(saved) });
    }

    // Bắt đầu cuộc trò chuyện mới
    const name = cleanText(body.name, LIMITS.name);
    if (!name) return NextResponse.json({ message: "Vui lòng nhập tên để Jay biết cách xưng hô." }, { status: 400 });
    const contact = cleanText(body.contact, LIMITS.contact) || null;
    const page = cleanText(body.page, LIMITS.page) || null;
    const hub = cleanText(body.hub, 40) || null;
    const info = getRequestInfo(request);
    const { token, hash } = newAccessToken();

    const conv = (await insertRow("chat_conversations", {
      access_token: hash,
      visitor_id: cleanText(body.visitorId, 64) || null,
      name,
      contact,
      page,
      hub,
      country: info.country,
      device: `${info.device} · ${info.browser} · ${info.os}`,
      status: "open",
      unread_admin: 0,
      unread_visitor: 0,
      last_message_at: new Date().toISOString(),
      last_message_preview: message.slice(0, 140)
    })) as ChatConversation;
    const saved = await addMessage(conv, "visitor", message);
    shouldNotify(conv.id);
    await notifyAdmin({
      channel: "chat",
      title: `💬 Chat mới từ ${name}${hub ? ` (Hub /${hub})` : ""}`,
      fields: [
        ["Liên hệ", contact || "(không để lại)"],
        ["Trang", page || "-"],
        ["Vị trí", info.city ? `${info.city}, ${info.country}` : info.country || "-"]
      ],
      message,
      link: `${origin}/admin/inbox?c=${conv.id}`,
      replyTo: contact ?? undefined
    });

    return NextResponse.json({ ok: true, conversationId: conv.id, token, message: toPublicMessage(saved) });
  } catch (error) {
    console.error("[chat] post failed", error);
    return NextResponse.json({ message: "Không gửi được tin nhắn, thử lại sau." }, { status: 500 });
  }
}
