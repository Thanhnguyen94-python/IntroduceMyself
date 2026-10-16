import { NextResponse } from "next/server";
import { listFirmwareReleases } from "@/lib/firmware-store";

export const dynamic = "force-dynamic";

// Danh sách bản firmware đã publish (trang nạp online dùng).
export async function GET(request: Request) {
  try {
    const board = new URL(request.url).searchParams.get("board")?.trim() || undefined;
    const items = await listFirmwareReleases({ publishedOnly: true, board });
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load firmware releases.";
    return NextResponse.json({ message, items: [] }, { status: 500 });
  }
}
