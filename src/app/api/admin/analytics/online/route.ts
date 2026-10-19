import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { countOnlineNow } from "@/lib/analytics/summary";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ online: await countOnlineNow() });
  } catch {
    return NextResponse.json({ online: null });
  }
}
