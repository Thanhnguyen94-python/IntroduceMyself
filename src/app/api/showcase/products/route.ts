import { NextResponse } from "next/server";
import { readShowcaseData } from "@/lib/showcase-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readShowcaseData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load showcase data.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
