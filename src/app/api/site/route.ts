import { NextResponse } from "next/server";
import { readSiteData } from "@/lib/site-store";
import { isAdminRequest } from "@/lib/admin-guard";
import { toPublicSite } from "@/lib/site-public";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readSiteData();
    // Admin cần bản đầy đủ để sửa; khách chỉ nhận trường công khai.
    return NextResponse.json((await isAdminRequest()) ? data : toPublicSite(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load site data.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
