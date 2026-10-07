import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import type { ProjectsData } from "@/lib/content/types";
import { writeProjectsData } from "@/lib/projects-store";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!verifyAdminSessionToken(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as ProjectsData | null;
    if (!payload || !Array.isArray(payload.items)) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await writeProjectsData(payload);
    revalidatePath("/du-an");
    revalidatePath("/du-an/[slug]", "page");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot save projects data.";
    console.error("[admin-projects] save failed", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
