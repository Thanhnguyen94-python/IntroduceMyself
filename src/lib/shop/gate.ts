import { isAdminRequest } from "@/lib/admin-guard";
import { readSiteVisibility } from "@/lib/site-visibility-store";
import { isPageEnabled } from "@/lib/site-visibility-types";

// Cửa hàng bật/tắt bằng công tắc "Cửa hàng (/shop)" (key "showcase") trong Admin.
// Kiểm tra ở từng trang (không chỉ ở layout) để khi tắt, dữ liệu sản phẩm không bị gửi kèm trong HTML.
export async function isShopEnabled() {
  return isPageEnabled(await readSiteVisibility(), "showcase");
}

// Admin đã đăng nhập vẫn xem trước được cửa hàng khi đang tắt.
export async function shopAccess() {
  const enabled = await isShopEnabled();
  const admin = enabled ? false : await isAdminRequest();
  return { enabled, open: enabled || admin, adminPreview: !enabled && admin };
}
