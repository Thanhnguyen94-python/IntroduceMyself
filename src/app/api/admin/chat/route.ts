import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { selectRows } from "@/lib/data/table-store";
import type { ChatConversation } from "@/lib/chat/chat-store";

export const dynamic = "force-dynamic";

// Danh sách cuộc trò chuyện + số chưa đọc (dùng cho Hộp thư và huy hiệu trên menu Admin).
export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const countOnly = new URL(request.url).searchParams.get("count") === "1";
  try {
    const [conversations, pendingComments] = await Promise.all([
      selectRows<ChatConversation>("chat_conversations", { order: ["last_message_at", "desc"], limit: countOnly ? 500 : 200 }),
      selectRows<{ id: string }>("doc_comments", { eq: { status: "pending" }, columns: "id", limit: 500 })
    ]);
    const unreadChats = conversations.filter((c) => (c.unread_admin ?? 0) > 0).length;
    if (countOnly) return NextResponse.json({ unreadChats, pendingComments: pendingComments.length });
    return NextResponse.json({
      unreadChats,
      pendingComments: pendingComments.length,
      items: conversations.map(({ access_token: _secret, ...rest }) => rest)
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không đọc được hộp thư.", items: [], unreadChats: 0, pendingComments: 0 }, { status: 200 });
  }
}
