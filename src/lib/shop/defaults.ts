import type { ShopSettings } from "@/lib/shop/types";

// Cài đặt mặc định khi chưa lưu gì trong Admin → Cửa hàng → Cài đặt.
export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  name: "Mr Jay Shop",
  tagline: { vi: "Jig, tool SMT & sản phẩm in 3D làm thủ công", en: "Handmade SMT jigs, tools & 3D printed products" },
  intro: {
    vi: "Sản phẩm được thiết kế và kiểm tra trên dây chuyền SMT thực tế. Nhận làm theo bản vẽ, số lượng ít.",
    en: "Designed and proven on real SMT lines. Custom builds from your drawings, small batches welcome."
  },
  announcement: { vi: "", en: "" },
  heroMedia: [{ url: "/assets/images/3d-jig/feeder-table-2.PNG" }, { url: "/assets/images/3d-jig/stencil cabinet-ver4-2.JPG" }, { url: "/assets/images/3d-jig/trayPalet.PNG" }],
  slideInterval: 5,
  categories: [
    { id: "3d", icon: "🧩", label: { vi: "In 3D & Jig", en: "3D prints & jigs" } },
    { id: "display", icon: "🏭", label: { vi: "Thiết bị xưởng", en: "Workshop equipment" } }
  ],
  highlights: [
    { icon: "🛠️", title: { vi: "Làm theo yêu cầu", en: "Made to order" }, text: { vi: "Sửa kích thước, vật liệu theo line của bạn", en: "Adjusted to your line's size & material" } },
    { icon: "🚚", title: { vi: "Giao toàn quốc", en: "Nationwide delivery" }, text: { vi: "Đóng gói chống sốc, có mã vận đơn", en: "Shock-proof packing with tracking" } },
    { icon: "💬", title: { vi: "Tư vấn kỹ thuật", en: "Technical advice" }, text: { vi: "Kỹ sư SMT trả lời trực tiếp", en: "Answered directly by an SMT engineer" } }
  ],
  shipping: {
    fee: 30000,
    freeFrom: 1000000,
    note: { vi: "Hàng cồng kềnh (tủ, bàn) báo phí ship riêng khi xác nhận đơn.", en: "Bulky items (cabinets, tables) are quoted separately on confirmation." }
  },
  payment: { cod: true, bank: { enabled: false, bankId: "", accountNo: "", accountName: "" } },
  contact: { phone: "", zalo: "", email: "" },
  policies: {
    vi: "- Kiểm tra hàng trước khi nhận.\n- Đổi trả trong 7 ngày nếu lỗi do sản xuất.\n- Hàng làm theo yêu cầu cần đặt cọc 30%.",
    en: "- Inspect before accepting delivery.\n- 7-day return for manufacturing defects.\n- Custom builds require a 30% deposit."
  }
};
