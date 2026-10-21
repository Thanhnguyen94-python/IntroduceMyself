import { getRow, insertRow, selectRows, updateRows } from "@/lib/data/table-store";
import { SmtValidationError } from "@/lib/smt/datasets";
import { can, type SmtActor } from "@/lib/smt/permissions";
import type { SmtSettings } from "@/lib/smt/types";

// Nhóm chat của đội SMT (chỉ dữ liệu thật, chỉ người đã đăng nhập). Kênh "Chung", mỗi line 1 kênh, và kênh
// theo chuyên môn. Tin đánh dấu "Vấn đề" được theo dõi đến khi "Đã xử lý" và đưa vào báo cáo tự động.

export type ChatChannel = { id: string; slug: string; name: string; kind: "general" | "line" | "topic"; line: string; description: string; sort: number; archived: boolean };
export type ChatAttachment = { url: string; name: string; width?: number; height?: number };
export type ChatMessage = {
  id: string;
  channel_id: string;
  author_role: string;
  author_id: string;
  author_name: string;
  body: string;
  is_issue: boolean;
  resolved: boolean;
  line: string;
  defect_code: string;
  attachments: ChatAttachment[];
  reply_to: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

// Tác giả được sửa / xoá tin của mình trong 15 phút.
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

const TOPICS: Array<[string, string, string]> = [
  ["process", "Công nghệ (Process)", "In kem, profile lò, thông số máy"],
  ["thiet-bi", "Thiết bị", "Hỏng máy, PM, feeder / nozzle"],
  ["chat-luong", "Chất lượng", "Lỗi, khách hàng, 8D, audit"],
  ["npi", "NPI / Model mới", "Chạy thử, FAI, DFM"]
];

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

// Lần đầu mở chat: tự tạo kênh mặc định theo line trong Cài đặt SMT.
export async function listChannels(settings: SmtSettings, includeArchived = false): Promise<ChatChannel[]> {
  let rows = await selectRows<ChatChannel>("smt_chat_channels", { order: ["sort", "asc"], limit: 200 });
  if (!rows.length) {
    const now = new Date().toISOString();
    const seed = [
      { slug: "chung", name: "Chung", kind: "general", line: "", description: "Thông báo & trao đổi chung của đội", sort: 0 },
      ...settings.lines.map((l, i) => ({ slug: `line-${slugify(l.code)}`, name: l.name || l.code, kind: "line", line: l.code, description: `Vấn đề trên ${l.code}`, sort: 10 + i })),
      ...TOPICS.map(([slug, name, description], i) => ({ slug, name, kind: "topic", line: "", description, sort: 100 + i }))
    ];
    for (const c of seed) await insertRow("smt_chat_channels", { ...c, archived: false, updated_at: now });
    rows = await selectRows<ChatChannel>("smt_chat_channels", { order: ["sort", "asc"], limit: 200 });
  }
  return includeArchived ? rows : rows.filter((r) => !r.archived);
}

export async function saveChannel(actor: SmtActor, input: Partial<ChatChannel> & { id?: string }) {
  if (!can(actor, "channels.manage")) throw new SmtValidationError("Bạn không có quyền quản lý kênh.");
  const name = String(input.name ?? "").trim().slice(0, 60);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) {
    if (!name) throw new SmtValidationError("Nhập tên kênh.");
    patch.name = name;
  }
  if (input.description !== undefined) patch.description = String(input.description).slice(0, 200);
  if (input.archived !== undefined) patch.archived = Boolean(input.archived);
  if (input.sort !== undefined) patch.sort = Math.round(Number(input.sort) || 0);
  if (input.id) {
    await updateRows("smt_chat_channels", { id: input.id }, patch);
    return getRow<ChatChannel>("smt_chat_channels", input.id);
  }
  const slug = slugify(name) || `kenh-${Date.now()}`;
  const dup = await selectRows<ChatChannel>("smt_chat_channels", { eq: { slug }, limit: 1 });
  if (dup[0]) throw new SmtValidationError("Đã có kênh trùng tên.");
  return insertRow("smt_chat_channels", { slug, name, kind: "topic", line: String(input.line ?? "").toUpperCase(), description: String(input.description ?? "").slice(0, 200), sort: 200, archived: false, ...patch });
}

const hideDeleted = (m: ChatMessage): ChatMessage => (m.deleted_at ? { ...m, body: "", attachments: [] } : m);

export async function listMessages(channelId: string, opts: { after?: string; before?: string; limit?: number } = {}) {
  const rows = await selectRows<ChatMessage>("smt_chat_messages", {
    eq: { channel_id: channelId },
    ...(opts.after ? { gt: ["created_at", opts.after] as [string, string] } : {}),
    ...(opts.before ? { lte: ["created_at", opts.before] as [string, string] } : {}),
    order: ["created_at", "desc"],
    limit: Math.min(200, opts.limit ?? 80)
  });
  return rows.reverse().map(hideDeleted);
}

// Các "Vấn đề" chưa xử lý (mọi kênh).
export async function openIssues(limit = 100) {
  return (await selectRows<ChatMessage>("smt_chat_messages", { eq: { is_issue: true, resolved: false }, order: ["created_at", "desc"], limit })).filter((m) => !m.deleted_at);
}

function cleanAttachments(v: unknown): ChatAttachment[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 6)
    .map((a) => ({ url: String((a as ChatAttachment)?.url ?? ""), name: String((a as ChatAttachment)?.name ?? "").slice(0, 120), width: Number((a as ChatAttachment)?.width) || undefined, height: Number((a as ChatAttachment)?.height) || undefined }))
    // Chỉ nhận ảnh đã tải lên qua /api/smt/chat/upload (Supabase Storage hoặc /uploads khi chạy local).
    .filter((a) => /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\//i.test(a.url) || a.url.startsWith("/uploads/smt-chat/"));
}

export async function postMessage(actor: SmtActor, channelId: string, input: Record<string, unknown>) {
  if (!can(actor, "chat.post")) throw new SmtValidationError("Cần đăng nhập để chat.");
  const channel = await getRow<ChatChannel>("smt_chat_channels", channelId);
  if (!channel || channel.archived) throw new SmtValidationError("Kênh không tồn tại hoặc đã lưu trữ.");
  const body = String(input.body ?? "").trim().slice(0, 4000);
  const attachments = cleanAttachments(input.attachments);
  if (!body && !attachments.length) throw new SmtValidationError("Tin nhắn trống.");
  return insertRow("smt_chat_messages", {
    channel_id: channelId,
    author_role: actor.role,
    author_id: actor.id,
    author_name: actor.name,
    body,
    is_issue: Boolean(input.is_issue),
    resolved: false,
    line: String(input.line ?? channel.line ?? "").toUpperCase().slice(0, 20),
    defect_code: String(input.defect_code ?? "").toUpperCase().slice(0, 12),
    attachments,
    reply_to: input.reply_to ? String(input.reply_to) : null,
    edited_at: null,
    deleted_at: null,
    updated_at: new Date().toISOString()
  });
}

const ownFresh = (actor: SmtActor, m: ChatMessage) => m.author_id === actor.id && Date.now() - new Date(m.created_at).getTime() < EDIT_WINDOW_MS;

export async function updateMessage(actor: SmtActor, id: string, input: { body?: unknown; resolved?: unknown; is_issue?: unknown }) {
  const m = await getRow<ChatMessage>("smt_chat_messages", id);
  if (!m || m.deleted_at) throw new SmtValidationError("Không tìm thấy tin nhắn.");
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.body !== undefined) {
    if (!ownFresh(actor, m)) throw new SmtValidationError("Chỉ sửa được tin của mình trong 15 phút.");
    patch.body = String(input.body).trim().slice(0, 4000);
    patch.edited_at = new Date().toISOString();
  }
  // Đánh dấu Vấn đề / Đã xử lý: người viết hoặc admin / trợ lý.
  if (input.resolved !== undefined || input.is_issue !== undefined) {
    if (m.author_id !== actor.id && !can(actor, "channels.manage")) throw new SmtValidationError("Chỉ người viết hoặc quản lý đổi được trạng thái.");
    if (input.resolved !== undefined) patch.resolved = Boolean(input.resolved);
    if (input.is_issue !== undefined) patch.is_issue = Boolean(input.is_issue);
  }
  await updateRows("smt_chat_messages", { id }, patch);
  return hideDeleted((await getRow<ChatMessage>("smt_chat_messages", id))!);
}

// Xoá mềm: giữ dòng (để luồng trả lời không gãy) nhưng bỏ nội dung.
export async function softDeleteMessage(id: string) {
  await updateRows("smt_chat_messages", { id }, { deleted_at: new Date().toISOString(), body: "", attachments: [], updated_at: new Date().toISOString() });
}

export async function canDeleteOwnMessage(actor: SmtActor, id: string) {
  const m = await getRow<ChatMessage>("smt_chat_messages", id);
  return Boolean(m && ownFresh(actor, m));
}

// Tin nhắn trong một khoảng thời gian (cho báo cáo tự động / AI).
export async function messagesBetween(from: string, to: string) {
  return (await selectRows<ChatMessage>("smt_chat_messages", { gt: ["created_at", from], lte: ["created_at", to], order: ["created_at", "asc"], limit: 20_000 })).filter((m) => !m.deleted_at);
}
