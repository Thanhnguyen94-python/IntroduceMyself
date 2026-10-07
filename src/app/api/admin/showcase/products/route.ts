import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import type { ShowcaseData, ShowcaseItem } from "@/lib/showcase-types";
import { deleteShowcaseItem, upsertShowcaseItem, writeShowcaseData } from "@/lib/showcase-store";

export const dynamic = "force-dynamic";

async function ensureAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(session);
}

function revalidateShowcasePage() {
  revalidatePath("/san-pham-trung-bay");
}

export async function PUT(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as ShowcaseData | null;
    if (!payload || !Array.isArray(payload.items)) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await writeShowcaseData(payload);
    revalidateShowcasePage();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot save showcase data.";
    console.error("[admin-showcase] save failed", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as { item?: ShowcaseItem } | null;
    if (!payload?.item) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await upsertShowcaseItem(payload.item);
    revalidateShowcasePage();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot create showcase item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as { item?: ShowcaseItem } | null;
    if (!payload?.item) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await upsertShowcaseItem(payload.item);
    revalidateShowcasePage();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot update showcase item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as { id?: string } | null;
    const id = payload?.id?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ message: "Missing id." }, { status: 400 });
    }

    await deleteShowcaseItem(id);
    revalidateShowcasePage();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot delete showcase item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
