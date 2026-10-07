import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import type { ExperienceData } from "@/lib/content/types";
import { writeJourneyData } from "@/lib/journey-store";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!verifyAdminSessionToken(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as ExperienceData | null;
    if (!payload || !Array.isArray(payload.items)) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    await writeJourneyData(payload);
    revalidatePath("/hanh-trinh");
    revalidatePath("/tong-quan");
    revalidatePath("/cv");

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot save journey data.";
    console.error("[admin-journey] save failed", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
