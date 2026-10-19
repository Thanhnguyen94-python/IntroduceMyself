import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { getFirmwareStats } from "@/lib/analytics/summary";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ items: await getFirmwareStats() });
  } catch (error) {
    return NextResponse.json({ items: [], message: error instanceof Error ? error.message : "Không đọc được thống kê." }, { status: 200 });
  }
}
