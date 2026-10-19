import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { deleteRows, getRow, insertRow, selectRows, updateRows } from "@/lib/data/table-store";
import { cleanText } from "@/lib/rate-limit";
import { notifyVisitorReply, siteOrigin } from "@/lib/notify";
import type { DocComment } from "@/lib/chat/comments-store";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["pending", "approved", "hidden"]);

async function guard() {
  return (await isAdminRequest()) ? null : NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

// GET ?status=pending|approved|hidden|all
export async function GET(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const rows = await selectRows<DocComment>("doc_comments", {
    ...(STATUSES.has(status) ? { eq: { status } } : {}),
    order: ["created_at", "desc"],
    limit: 300
  }).catch(() => []);
  // Kèm câu hỏi gốc để admin biết trả lời cho ai.
  const parentIds = [...new Set(rows.map((r) => r.parent_id).filter((id): id is string => Boolean(id)))];
  const parents = parentIds.length ? await selectRows<DocComment>("doc_comments", { in: ["id", parentIds], limit: 300 }).catch(() => []) : [];
  const replies = await selectRows<DocComment>("doc_comments", { eq: { is_admin: true }, order: ["created_at", "asc"], limit: 1000 }).catch(() => []);
  return NextResponse.json({
    items: rows.map((r) => ({
      ...r,
      parent: parents.find((p) => p.id === r.parent_id) ?? null,
      adminReplies: replies.filter((rep) => rep.parent_id === r.id)
    }))
  });
}

// PATCH {id, status}: duyệt / ẩn.
export async function PATCH(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!body.id || !STATUSES.has(body.status ?? "")) return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  await updateRows("doc_comments", { id: body.id }, { status: body.status });
  return NextResponse.json({ ok: true });
}

// POST {parentId, body}: admin trả lời -> câu trả lời và câu hỏi gốc cùng được hiển thị công khai.
export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const payload = (await request.json().catch(() => ({}))) as { parentId?: string; body?: string };
  const text = cleanText(payload.body, 3000);
  const parent = payload.parentId ? await getRow<DocComment>("doc_comments", payload.parentId) : null;
  if (!parent || !text) return NextResponse.json({ message: "Thiếu câu hỏi gốc hoặc nội dung." }, { status: 400 });

  // Trả lời theo luồng: luôn gắn vào câu hỏi cấp 1.
  const rootId = parent.parent_id ?? parent.id;
  const reply = await insertRow("doc_comments", {
    hub: parent.hub,
    doc_path: parent.doc_path,
    parent_id: rootId,
    author_name: "Mr Jay",
    contact: null,
    body: text,
    is_admin: true,
    status: "approved",
    visitor_id: null
  });
  await updateRows("doc_comments", { id: parent.id }, { status: "approved" });
  if (rootId !== parent.id) await updateRows("doc_comments", { id: rootId }, { status: "approved" });

  if (parent.contact) {
    await notifyVisitorReply(parent.contact, {
      name: parent.author_name,
      question: parent.body,
      reply: text,
      link: `${siteOrigin(request)}${parent.doc_path}#hoi-dap`,
      context: "câu hỏi trên tài liệu"
    });
  }
  return NextResponse.json({ ok: true, id: reply.id });
}

export async function DELETE(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  await deleteRows("doc_comments", { id });
  return NextResponse.json({ ok: true });
}
