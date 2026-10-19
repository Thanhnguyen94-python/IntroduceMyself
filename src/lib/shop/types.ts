import type { LocalizedText } from "@/lib/content/types";
import { resolveSmartMedia, type MediaKind } from "@/lib/smart-media";

// ===== Cửa hàng /shop: sản phẩm, cài đặt, đơn hàng =====
// Dùng được cả server lẫn client (không import module Node).

export type ShopMedia = { url: string; kind?: MediaKind };

// published = đang bán · draft = nháp (chỉ thấy trong Admin) · hidden = tạm ẩn khỏi cửa hàng
export type ProductStatus = "published" | "draft" | "hidden";

export type ProductOption = { name: LocalizedText; values: string[] };
export type ProductSpec = { label: LocalizedText; value: string };

export type ShopProduct = {
  id: string;
  slug: string;
  status: ProductStatus;
  category: string;
  name: LocalizedText;
  summary: LocalizedText;
  // Mô tả chi tiết, viết Markdown (tiêu đề, danh sách, ảnh, link YouTube...).
  description: LocalizedText;
  media: ShopMedia[];
  price: number;
  // Giá gốc để gạch ngang & tính % giảm. 0 = không hiện.
  compareAtPrice: number;
  // null = không theo dõi tồn kho (làm theo đơn / luôn có hàng).
  stock: number | null;
  stockNote: LocalizedText;
  options: ProductOption[];
  specs: ProductSpec[];
  tags: string[];
  featured: boolean;
  badge: LocalizedText;
  sortOrder: number;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ShopCategory = { id: string; icon: string; label: LocalizedText };
export type ShopHighlight = { icon: string; title: LocalizedText; text: LocalizedText };

export type ShopSettings = {
  name: string;
  tagline: LocalizedText;
  intro: LocalizedText;
  announcement: LocalizedText;
  heroMedia: ShopMedia[];
  slideInterval: number;
  categories: ShopCategory[];
  highlights: ShopHighlight[];
  shipping: { fee: number; freeFrom: number; note: LocalizedText };
  payment: {
    cod: boolean;
    bank: { enabled: boolean; bankId: string; accountNo: string; accountName: string };
  };
  contact: { phone: string; zalo: string; email: string };
  policies: LocalizedText;
};

export type OrderStatus = "pending" | "confirmed" | "packing" | "shipping" | "completed" | "cancelled" | "returned";
export type PaymentMethod = "cod" | "bank";
export type PaymentStatus = "unpaid" | "paid";

export type OrderLine = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  options: Record<string, string>;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderEvent = { at: string; status: OrderStatus; note?: string; by: "customer" | "admin" };

export type ShopOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  items: OrderLine[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  adminNote: string;
  history: OrderEvent[];
  stockApplied: boolean;
  createdAt: string;
  updatedAt: string;
};

// Thông tin đơn khách được xem (không có ghi chú nội bộ / visitor id).
export type PublicOrder = Omit<ShopOrder, "adminNote" | "stockApplied" | "id">;

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "packing", "shipping", "completed", "cancelled", "returned"];
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "packing", "shipping"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, LocalizedText> = {
  pending: { vi: "Chờ xác nhận", en: "Awaiting confirmation" },
  confirmed: { vi: "Đã xác nhận", en: "Confirmed" },
  packing: { vi: "Đang đóng gói", en: "Packing" },
  shipping: { vi: "Đang giao", en: "Shipping" },
  completed: { vi: "Hoàn thành", en: "Completed" },
  cancelled: { vi: "Đã huỷ", en: "Cancelled" },
  returned: { vi: "Hoàn trả", en: "Returned" }
};

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  published: "Đang bán",
  draft: "Nháp",
  hidden: "Tạm ẩn"
};

// Đường dẫn con của /shop không được dùng làm slug sản phẩm.
export const RESERVED_PRODUCT_SLUGS = new Set(["san-pham", "thanh-toan", "don-hang", "gio-hang", "new"]);

export function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}₫`;
}

export function discountPercent(product: Pick<ShopProduct, "price" | "compareAtPrice">) {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) return 0;
  return Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100);
}

export function isInStock(product: Pick<ShopProduct, "stock">) {
  return product.stock === null || product.stock > 0;
}

export function shippingFeeFor(subtotal: number, settings: Pick<ShopSettings, "shipping">) {
  if (subtotal <= 0) return 0;
  if (settings.shipping.freeFrom > 0 && subtotal >= settings.shipping.freeFrom) return 0;
  return Math.max(0, settings.shipping.fee);
}

// "Khay Jig SMT đa năng" -> "khay-jig-smt-da-nang"
export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Ảnh mã QR chuyển khoản theo chuẩn VietQR (napas247), có sẵn số tiền + nội dung = mã đơn.
export function vietQrUrl(bank: ShopSettings["payment"]["bank"], amount: number, content: string) {
  if (!bank.enabled || !bank.bankId || !bank.accountNo) return "";
  const params = new URLSearchParams({ amount: String(Math.round(amount)), addInfo: content, accountName: bank.accountName });
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(bank.accountNo)}-compact2.png?${params}`;
}

// Ảnh đại diện nhỏ (giỏ hàng, đơn hàng, chia sẻ link): YouTube -> thumbnail, Drive -> ảnh xem trước.
export function productImage(product: Pick<ShopProduct, "media">) {
  for (const item of product.media) {
    const media = resolveSmartMedia(item.url, item.kind ?? "auto");
    if (media.type === "image") return media.src;
    if (media.type === "youtube") return media.thumbnail;
    if (media.type === "drive") return media.imageUrl;
  }
  return "";
}
