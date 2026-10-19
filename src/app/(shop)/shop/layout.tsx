import type { Metadata } from "next";
import { ChatWidget } from "@/components/chat/chat-widget";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { ShopProvider } from "@/components/shop/shop-provider";
import { CartDrawer, ShopFooter, ShopHeader } from "@/components/shop/shop-chrome";
import { readShopSettings } from "@/lib/shop/store";
import { shopAccess } from "@/lib/shop/gate";

// Không gian Cửa hàng (/shop): tách riêng khỏi Portfolio, có header/footer/giỏ hàng riêng.
// Bật/tắt bằng công tắc "Cửa hàng" (key "showcase") trong Admin → Nội dung & hiển thị.
// Mỗi trang con tự kiểm tra bật/tắt (lib/shop/gate.ts); layout chỉ ẩn giỏ hàng / chat khi tắt.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readShopSettings();
  return {
    title: { default: `${settings.name} · ${settings.tagline.vi}`, template: `%s · ${settings.name}` },
    description: settings.intro.vi
  };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, access] = await Promise.all([readShopSettings(), shopAccess()]);

  return (
    <>
      <ShopProvider settings={settings}>
        <div className="shop-root">
          <ShopHeader />
          {access.adminPreview && (
            <p className="bg-amber-400 px-4 py-2 text-center text-sm font-medium text-slate-900">
              👁 Cửa hàng đang <b>TẮT</b> với khách (chỉ admin xem được). Bật trong Admin → Nội dung &amp; hiển thị → “Cửa hàng (/shop)”.
            </p>
          )}
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
          <ShopFooter />
        </div>
        {access.open && <CartDrawer />}
      </ShopProvider>
      {/* Box chat & thống kê không cần dữ liệu giỏ hàng -> đặt ngoài ShopProvider. */}
      {access.enabled && <ChatWidget variant="shop" hub="shop" />}
      <AnalyticsTracker hub="shop" />
    </>
  );
}
