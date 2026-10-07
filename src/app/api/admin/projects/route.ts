import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import type { ProjectItem, ProjectsData } from "@/lib/content/types";
import { deleteProjectItem, upsertProjectItem, writeProjectsData } from "@/lib/projects-store";

export const dynamic = "force-dynamic";

async function ensureAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(session);
}

function revalidateProjectPages() {
  revalidatePath("/du-an");
  revalidatePath("/du-an/[slug]", "page");
}

export async function PUT(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as ProjectsData | null;
    if (!payload || !Array.isArray(payload.items)) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await writeProjectsData(payload);
    revalidateProjectPages();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot save projects data.";
    console.error("[admin-projects] save failed", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as { item?: ProjectItem } | null;
    if (!payload?.item) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await upsertProjectItem(payload.item);
    revalidateProjectPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot create project item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as { item?: ProjectItem } | null;
    if (!payload?.item) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await upsertProjectItem(payload.item);
    revalidateProjectPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot update project item.";
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

    await deleteProjectItem(id);
    revalidateProjectPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot delete project item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
