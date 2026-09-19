import { NextResponse } from "next/server";
import { readShowcaseData } from "@/lib/showcase-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readShowcaseData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Cannot load showcase data." }, { status: 500 });
  }
}
