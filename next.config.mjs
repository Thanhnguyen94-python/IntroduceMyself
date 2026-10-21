/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tài liệu Project Hub (.md) được đọc lúc chạy -> khai báo để Vercel đóng gói kèm.
  outputFileTracingIncludes: {
    "/[hub]": ["./src/content/hubs/**/*"],
    "/[hub]/**": ["./src/content/hubs/**/*"],
    "/api/**": ["./src/content/hubs/**/*"],
    "/admin/**": ["./src/content/hubs/**/*", "./docs/WEB_USAGE_GUIDE.md"]
  },
  async redirects() {
    return [
      // Link cũ (đã chia sẻ cho người dùng / ghi trong WebUI robot) -> trang nạp công khai mới.
      { source: "/nap-firmware", destination: "/joy/flash", permanent: false },
      // Trang "Sản phẩm trưng bày" cũ trong Portfolio đã chuyển thành Cửa hàng riêng.
      { source: "/san-pham-trung-bay", destination: "/shop", permanent: true },
      // Trang Tổng quan cũ đã gộp vào Trang chủ. Giữ redirect cho CV đã in / link đã chia sẻ (mã QR cũ).
      { source: "/tong-quan", destination: "/", permanent: true },
      { source: "/admin/orders", destination: "/admin/shop/orders", permanent: false }
    ];
  }
};

export default nextConfig;
