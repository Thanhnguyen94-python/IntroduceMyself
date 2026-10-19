import { selectRows } from "@/lib/data/table-store";

export type DocComment = {
  id: string;
  hub: string;
  doc_path: string;
  parent_id: string | null;
  author_name: string;
  contact: string | null;
  body: string;
  is_admin: boolean;
  status: "pending" | "approved" | "hidden";
  visitor_id: string | null;
  created_at: string;
};

export type PublicComment = {
  id: string;
  name: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
  replies: PublicComment[];
};

export const DOC_PATH_PATTERN = /^\/[a-z0-9-]+\/docs\/[a-z0-9-]+(\/[a-z0-9-]+)*$/;

// Không bao giờ trả `contact` ra ngoài.
function toPublic(c: DocComment, replies: PublicComment[] = []): PublicComment {
  return { id: c.id, name: c.is_admin ? "Mr Jay" : c.author_name, body: c.body, isAdmin: c.is_admin, createdAt: c.created_at, replies };
}

export async function listPublicComments(hub: string, docPath: string): Promise<PublicComment[]> {
  const rows = await selectRows<DocComment>("doc_comments", { eq: { hub, doc_path: docPath, status: "approved" }, order: ["created_at", "asc"], limit: 500 });
  const replies = new Map<string, PublicComment[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const list = replies.get(r.parent_id) ?? [];
    list.push(toPublic(r));
    replies.set(r.parent_id, list);
  }
  return rows.filter((r) => !r.parent_id).map((r) => toPublic(r, replies.get(r.id) ?? []));
}
