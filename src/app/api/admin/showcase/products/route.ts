import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import type { ShowcaseData } from "@/lib/showcase-types";
import { writeShowcaseData } from "@/lib/showcase-store";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as ShowcaseData | null;
  if (!payload || !Array.isArray(payload.items)) {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  await writeShowcaseData(payload);
  return NextResponse.json({ ok: true });
}
