import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { getHubEntry, listHubEntries } from "@/lib/hubs/registry";
import { createHubFromTemplate, validateHubSlug } from "@/lib/hubs/store";
import { isFileStorageMode } from "@/lib/hubs/db";

export const dynamic = "force-dynamic";

// GET: danh sách hub kèm nguồn dữ liệu. POST {slug, name}: tạo hub mới từ mẫu.
export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listHubEntries();
  return NextResponse.json({
    storage: isFileStorageMode() ? "file" : "database",
    items: entries.map((it) => ({ slug: it.config.slug, name: it.config.name, emoji: it.config.emoji, status: it.config.status, source: it.source, hasFile: it.hasFile }))
  });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { slug?: string; name?: string };
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim() || slug;

  const invalid = validateHubSlug(slug);
  if (invalid) return NextResponse.json({ message: invalid }, { status: 400 });
  if (await getHubEntry(slug)) return NextResponse.json({ message: `Hub "${slug}" đã tồn tại.` }, { status: 409 });

  try {
    const config = await createHubFromTemplate(slug, name);
    return NextResponse.json({ ok: true, slug: config.slug });
  } catch (error) {
    console.error("[admin-hubs] create failed", error);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không tạo được hub." }, { status: 500 });
  }
}
