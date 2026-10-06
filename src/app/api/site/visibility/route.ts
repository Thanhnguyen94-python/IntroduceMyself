import { NextResponse } from "next/server";
import { readSiteVisibility } from "@/lib/site-visibility-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readSiteVisibility();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load site visibility.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
