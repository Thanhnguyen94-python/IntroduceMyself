import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { getHubEntry } from "@/lib/hubs/registry";
import { loadDocRecords } from "@/lib/hubs/docs";
import { deleteLocalHub, resetHubToFile, saveHubConfig, saveHubDocs } from "@/lib/hubs/store";
import { isFileStorageMode } from "@/lib/hubs/db";
import type { HubConfig, HubDocRecord } from "@/lib/hubs/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

async function guard(ctx: Ctx) {
  if (!(await isAdminRequest())) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  const { slug } = await ctx.params;
  const entry = await getHubEntry(slug);
  if (!entry) return { error: NextResponse.json({ message: "Không tìm thấy hub." }, { status: 404 }) };
  return { slug, entry };
}

// GET: cấu hình + toàn bộ tài liệu (kèm nội dung Markdown) để chỉnh sửa.
export async function GET(_request: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const docs = await loadDocRecords(g.slug);
  return NextResponse.json({
    storage: isFileStorageMode() ? "file" : "database",
    source: g.entry.source,
    hasFile: g.entry.hasFile,
    docsSource: docs.source,
    config: g.entry.config,
    docs: docs.records
  });
}

// PUT {config?, docs?}: lưu. Có Supabase -> hiệu lực ngay; local -> ghi file trong repo.
export async function PUT(request: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  const body = (await request.json().catch(() => null)) as { config?: Partial<HubConfig>; docs?: HubDocRecord[] } | null;
  if (!body || (!body.config && !body.docs)) return NextResponse.json({ message: "Invalid payload." }, { status: 400 });

  try {
    const config = body.config ? await saveHubConfig(g.slug, body.config) : g.entry.config;
    const docs = body.docs ? await saveHubDocs(g.slug, body.docs) : undefined;
    return NextResponse.json({ ok: true, config, docs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không lưu được.";
    const status = /không hợp lệ|Trùng/.test(message) ? 400 : 500;
    if (status === 500) console.error("[admin-hubs] save failed", error);
    return NextResponse.json({ message }, { status });
  }
}

// DELETE: bỏ bản đã sửa trong database (quay về file trong repo); hub chỉ có trong DB sẽ bị xoá hẳn.
// Local: xoá thư mục hub (khôi phục được bằng git).
export async function DELETE(_request: Request, ctx: Ctx) {
  const g = await guard(ctx);
  if ("error" in g) return g.error;
  try {
    if (isFileStorageMode()) await deleteLocalHub(g.slug);
    else await resetHubToFile(g.slug);
    return NextResponse.json({ ok: true, removed: isFileStorageMode() || !g.entry.hasFile });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không xoá được." }, { status: 500 });
  }
}
