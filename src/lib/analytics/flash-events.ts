import { insertRow } from "@/lib/data/table-store";
import { getRequestInfo } from "@/lib/analytics/request-info";

export type FlashEventInput = {
  releaseKey: string;
  board?: string | null;
  version?: string | null;
  hub?: string | null;
  event: "manifest" | "started" | "success" | "error";
  erase?: boolean | null;
  errorMessage?: string | null;
  visitorId?: string | null;
};

// Ghi 1 sự kiện nạp firmware. Lỗi ghi không được làm hỏng việc nạp của người dùng.
export async function recordFlashEvent(request: Request, input: FlashEventInput) {
  const info = getRequestInfo(request);
  if (info.isBot) return;
  try {
    await insertRow("firmware_flash_events", {
      release_key: input.releaseKey.slice(0, 80),
      board: input.board?.slice(0, 60) ?? null,
      version: input.version?.slice(0, 40) ?? null,
      hub: input.hub?.slice(0, 40) ?? null,
      event: input.event,
      erase: typeof input.erase === "boolean" ? input.erase : null,
      error_message: input.errorMessage?.slice(0, 300) ?? null,
      visitor_id: input.visitorId?.slice(0, 64) ?? null,
      country: info.country,
      browser: info.browser,
      os: info.os
    });
  } catch (error) {
    console.error("[flash-events] record failed", error instanceof Error ? error.message : error);
  }
}
