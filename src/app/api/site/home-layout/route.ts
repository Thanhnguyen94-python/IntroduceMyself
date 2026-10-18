import { NextResponse } from "next/server";
import { readHomeLayout } from "@/lib/home-layout-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await readHomeLayout());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load home layout.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
