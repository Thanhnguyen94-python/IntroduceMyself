import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import type { SiteData } from "@/lib/content/types";
import { writeSiteData } from "@/lib/site-store";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!verifyAdminSessionToken(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as SiteData | null;
    if (!payload?.profile) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    const saved = await writeSiteData(payload);

    revalidatePath("/");
    revalidatePath("/tong-quan");
    revalidatePath("/cv");

    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    console.error("[admin-site] save failed", error);
    const message = error instanceof Error ? error.message : "Cannot save site profile now.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
