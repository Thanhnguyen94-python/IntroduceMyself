import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import type { ExperienceData, ExperienceItem } from "@/lib/content/types";
import { deleteJourneyItem, upsertJourneyItem, writeJourneyData } from "@/lib/journey-store";

export const dynamic = "force-dynamic";

async function ensureAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(session);
}

function revalidateJourneyPages() {
  revalidatePath("/hanh-trinh");
  revalidatePath("/tong-quan");
  revalidatePath("/cv");
}

export async function PUT(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as ExperienceData | null;
    if (!payload || !Array.isArray(payload.items)) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await writeJourneyData(payload);
    revalidateJourneyPages();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot save journey data.";
    console.error("[admin-journey] save failed", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as { item?: ExperienceItem } | null;
    if (!payload?.item) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await upsertJourneyItem(payload.item);
    revalidateJourneyPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot create journey item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as { item?: ExperienceItem } | null;
    if (!payload?.item) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await upsertJourneyItem(payload.item);
    revalidateJourneyPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot update journey item.";
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

    await deleteJourneyItem(id);
    revalidateJourneyPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot delete journey item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
