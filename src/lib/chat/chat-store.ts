import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { getRow, insertRow, selectRows, updateRows } from "@/lib/data/table-store";

export type ChatConversation = {
  id: string;
  access_token: string; // sha256 của mã bí mật (không lưu mã gốc)
  visitor_id: string | null;
  name: string;
  contact: string | null;
  page: string | null;
  hub: string | null;
  country: string | null;
  device: string | null;
  status: "open" | "closed";
  unread_admin: number;
  unread_visitor: number;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender: "visitor" | "admin";
  body: string;
  created_at: string;
};

export const LIMITS = { name: 60, contact: 120, body: 2000, page: 200 };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function newAccessToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

// Lấy cuộc trò chuyện nếu mã bí mật khớp (so sánh an toàn thời gian).
export async function getConversationForVisitor(id: string, token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !token) return null;
  const conv = await getRow<ChatConversation>("chat_conversations", id);
  if (!conv) return null;
  const a = Buffer.from(conv.access_token);
  const b = Buffer.from(hashToken(token));
  return a.length === b.length && timingSafeEqual(a, b) ? conv : null;
}

export async function listMessages(conversationId: string, after?: string) {
  return selectRows<ChatMessage>("chat_messages", {
    eq: { conversation_id: conversationId },
    ...(after ? { gt: ["created_at", after] as [string, string] } : {}),
    order: ["created_at", "asc"],
    limit: 500
  });
}

export async function addMessage(conv: ChatConversation, sender: "visitor" | "admin", body: string) {
  const message = await insertRow("chat_messages", { conversation_id: conv.id, sender, body });
  await updateRows(
    "chat_conversations",
    { id: conv.id },
    {
      last_message_at: message.created_at,
      last_message_preview: body.slice(0, 140),
      status: "open",
      ...(sender === "visitor" ? { unread_admin: (conv.unread_admin ?? 0) + 1 } : { unread_visitor: (conv.unread_visitor ?? 0) + 1 })
    }
  );
  return message as ChatMessage;
}

export function toPublicMessage(m: ChatMessage) {
  return { id: m.id, sender: m.sender, body: m.body, createdAt: m.created_at };
}

// Không gửi email/Zalo dồn dập: tối đa 1 thông báo / cuộc trò chuyện / 10 phút.
const lastNotified = new Map<string, number>();
export function shouldNotify(conversationId: string, windowMs = 10 * 60_000) {
  const now = Date.now();
  const last = lastNotified.get(conversationId) ?? 0;
  if (now - last < windowMs) return false;
  lastNotified.set(conversationId, now);
  return true;
}
