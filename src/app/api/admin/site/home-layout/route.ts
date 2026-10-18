import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/lib/admin-guard";
import { writeHomeLayout } from "@/lib/home-layout-store";
import type { HomeLayoutConfig } from "@/lib/home-layout-types";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as HomeLayoutConfig | null;
    if (!Array.isArray(payload?.sections)) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }

    const saved = await writeHomeLayout(payload);
    revalidatePath("/");
    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    console.error("[admin-home-layout] save failed", error);
    const message = error instanceof Error ? error.message : "Cannot save home layout now.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
