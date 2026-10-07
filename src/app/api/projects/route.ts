import { NextResponse } from "next/server";
import { readProjectsData } from "@/lib/projects-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readProjectsData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load projects data.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
