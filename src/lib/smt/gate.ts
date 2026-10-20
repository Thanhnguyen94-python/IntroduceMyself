import { isAdminRequest } from "@/lib/admin-guard";
import { readSiteVisibility } from "@/lib/site-visibility-store";
import { isPageEnabled } from "@/lib/site-visibility-types";

// Mẫu báo cáo SMT bật/tắt bằng công tắc "Mẫu báo cáo SMT" (key "smt") trong Admin → Nội dung & hiển thị.
// Kiểm tra ở từng trang / API (như Cửa hàng) để khi tắt, dữ liệu không bị gửi kèm trong HTML.
export async function smtAccess() {
  const enabled = isPageEnabled(await readSiteVisibility(), "smt");
  const admin = enabled ? false : await isAdminRequest();
  return { enabled, open: enabled || admin, adminPreview: !enabled && admin };
}
