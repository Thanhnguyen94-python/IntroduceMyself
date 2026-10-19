import { NextResponse } from "next/server";
import { getRow, insertRow, isStorageAvailable } from "@/lib/data/table-store";
import { getHub } from "@/lib/hubs/registry";
import { cleanText, clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { notifyAdmin, siteOrigin } from "@/lib/notify";
import { DOC_PATH_PATTERN, listPublicComments, type DocComment } from "@/lib/chat/comments-store";

export const dynamic = "force-dynamic";

// GET ?hub=joy&path=/joy/docs/hardware/bom -> câu hỏi đã duyệt + câu trả lời.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const hub = cleanText(url.searchParams.get("hub"), 40);
  const path = cleanText(url.searchParams.get("path"), 200);
  if (!isStorageAvailable() || !hub || !DOC_PATH_PATTERN.test(path)) return NextResponse.json({ items: [] });
  try {
    return NextResponse.json({ items: await listPublicComments(hub, path) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

// POST {hub, path, name, contact?, body, parentId?, visitorId, website(honeypot)} -> chờ admin duyệt.
export async function POST(request: Request) {
  if (!isStorageAvailable()) return NextResponse.json({ message: "Chức năng hỏi đáp tạm chưa khả dụng." }, { status: 503 });
  const fp = clientFingerprint(request);
  if (!rateLimit(`comment:${fp}`, 5, 10 * 60_000)) {
    return NextResponse.json({ message: "Bạn gửi nhiều câu hỏi quá nhanh, thử lại sau ít phút nhé." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  if (cleanText(body.website, 100)) return NextResponse.json({ ok: true, id: "ok" });

  const hub = cleanText(body.hub, 40);
  const path = cleanText(body.path, 200);
  const name = cleanText(body.name, 60);
  const text = cleanText(body.body, 3000);
  const contact = cleanText(body.contact, 120) || null;
  const parentId = cleanText(body.parentId, 64) || null;

  if (!(await getHub(hub)) || !DOC_PATH_PATTERN.test(path) || !path.startsWith(`/${hub}/docs/`)) {
    return NextResponse.json({ message: "Trang tài liệu không hợp lệ." }, { status: 400 });
  }
  if (!name || text.length < 5) return NextResponse.json({ message: "Vui lòng nhập tên và nội dung câu hỏi (ít nhất 5 ký tự)." }, { status: 400 });
  if (parentId) {
    const parent = await getRow<DocComment>("doc_comments", parentId).catch(() => null);
    if (!parent || parent.doc_path !== path || parent.status !== "approved") return NextResponse.json({ message: "Không tìm thấy câu hỏi gốc." }, { status: 400 });
  }

  try {
    const row = await insertRow("doc_comments", {
      hub,
      doc_path: path,
      parent_id: parentId,
      author_name: name,
      contact,
      body: text,
      is_admin: false,
      status: "pending",
      visitor_id: cleanText(body.visitorId, 64) || null
    });
    await notifyAdmin({
      channel: "doc-comment",
      title: `❓ Câu hỏi mới trên tài liệu ${path}`,
      fields: [
        ["Người hỏi", name],
        ["Liên hệ", contact || "(không để lại)"]
      ],
      message: text,
      link: `${siteOrigin(request)}/admin/inbox?tab=comments`,
      replyTo: contact ?? undefined
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (error) {
    console.error("[comments] post failed", error);
    return NextResponse.json({ message: "Không gửi được, thử lại sau." }, { status: 500 });
  }
}
