import { NextResponse } from "next/server";
import { readJourneyData } from "@/lib/journey-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readJourneyData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load journey data.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
