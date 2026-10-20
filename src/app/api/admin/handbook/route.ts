import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { HandbookValidationError, deleteEntry, getEntry, importDefaults, listEntries, saveEntry } from "@/lib/handbook/store";
import type { HandbookEntry } from "@/lib/handbook/types";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ message: "Unauthorized" }, { status: 401 });
const fail = (error: unknown, fallback: string) =>
  NextResponse.json({ message: error instanceof Error ? error.message : fallback }, { status: error instanceof HandbookValidationError ? 400 : 500 });

// GET: toàn bộ mục (kể cả nháp). source = "default" nghĩa là database còn trống, đang hiện bộ mặc định.
// GET ?id=... : 1 mục.
export async function GET(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  try {
    if (id) {
      const entry = await getEntry(id);
      return entry ? NextResponse.json({ entry }) : NextResponse.json({ message: "Không tìm thấy mục." }, { status: 404 });
    }
    return NextResponse.json(await listEntries());
  } catch (error) {
    return fail(error, "Không đọc được sổ tay.");
  }
}

// POST {entry} = thêm mục · POST {action: "import"} = chép các mục mặc định còn thiếu vào database.
export async function POST(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const body = (await request.json().catch(() => null)) as { entry?: Partial<HandbookEntry>; action?: string } | null;
  try {
    if (body?.action === "import") return NextResponse.json({ ok: true, added: await importDefaults() });
    if (!body?.entry) return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    return NextResponse.json({ ok: true, entry: await saveEntry(body.entry) });
  } catch (error) {
    return fail(error, "Lưu thất bại.");
  }
}

// PATCH {id, entry} = sửa toàn bộ · PATCH {id, status} = ẩn/hiện nhanh.
export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const body = (await request.json().catch(() => null)) as { id?: string; entry?: Partial<HandbookEntry>; status?: HandbookEntry["status"] } | null;
  if (!body?.id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  try {
    const current = await getEntry(body.id);
    if (!current) return NextResponse.json({ message: "Không tìm thấy mục." }, { status: 404 });
    const next = body.entry ?? { ...current, status: body.status === "draft" ? "draft" : "published" };
    return NextResponse.json({ ok: true, entry: await saveEntry(next, body.id) });
  } catch (error) {
    return fail(error, "Cập nhật thất bại.");
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  try {
    await deleteEntry(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "Xoá thất bại.");
  }
}
