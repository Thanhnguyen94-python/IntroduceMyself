import { isAdminRequest } from "@/lib/admin-guard";
import { readSiteVisibility } from "@/lib/site-visibility-store";
import { isPageEnabled } from "@/lib/site-visibility-types";

// Sổ tay SMT bật/tắt bằng công tắc "Sổ tay SMT" (key "handbook") trong Admin → Nội dung & hiển thị.
// Admin đã đăng nhập vẫn xem trước được khi đang tắt.
export async function handbookAccess() {
  const enabled = isPageEnabled(await readSiteVisibility(), "handbook");
  const admin = enabled ? false : await isAdminRequest();
  return { enabled, open: enabled || admin, adminPreview: !enabled && admin };
}
