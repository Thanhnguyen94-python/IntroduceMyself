import { NextResponse } from "next/server";
import { readSiteVisibility } from "@/lib/site-visibility-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readSiteVisibility();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Cannot load site visibility." }, { status: 500 });
  }
}
