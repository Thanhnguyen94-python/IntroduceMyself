import { NextResponse } from "next/server";
import { getFirmwareRelease } from "@/lib/firmware-store";
import { recordFlashEvent } from "@/lib/analytics/flash-events";

export const dynamic = "force-dynamic";

// Manifest cho ESP Web Tools: nạp file merged (bootloader + partition + app) ở offset 0.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const release = await getFirmwareRelease(id);
    if (!release || !release.is_published || !release.can_flash) {
      return NextResponse.json({ message: "Not found." }, { status: 404 });
    }
    // Đếm số lần mở hộp thoại nạp cho bản này (ESP Web Tools tải manifest khi người dùng bấm nạp).
    await recordFlashEvent(request, { releaseKey: release.id, board: release.board, version: release.version, event: "manifest" });
    return NextResponse.json(
      {
        name: release.title || `Xiaozhi ${release.board}`,
        version: release.version,
        new_install_prompt_erase: true,
        builds: [
          {
            chipFamily: release.chip || "ESP32-S3",
            // Ưu tiên các phần đã tách (không xoá NVS); bản cũ chỉ có file merged thì nạp cả file.
            parts: release.part_urls.length
              ? release.part_urls.map((part) => ({ path: part.url, offset: part.offset }))
              : [{ path: release.merged_url, offset: 0 }]
          }
        ]
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot build manifest.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
