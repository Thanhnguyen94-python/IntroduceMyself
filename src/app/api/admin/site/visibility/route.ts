import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import { writeSiteVisibility } from "@/lib/site-visibility-store";
import type { SiteVisibilityConfig } from "@/lib/site-visibility-types";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!verifyAdminSessionToken(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as SiteVisibilityConfig | null;
    if (!payload?.pages) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    const saved = await writeSiteVisibility(payload);
    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    console.error("[admin-site-visibility] save failed", error);
    return NextResponse.json({ message: "Cannot save site visibility now." }, { status: 500 });
  }
}
