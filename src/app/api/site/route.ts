import { NextResponse } from "next/server";
import { readSiteData } from "@/lib/site-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readSiteData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load site data.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
