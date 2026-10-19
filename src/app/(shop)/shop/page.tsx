import { L } from "@/components/ui/localized";
import { Reveal } from "@/components/ui/reveal";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { Catalog } from "@/components/shop/catalog";
import { ProductCard } from "@/components/shop/product-card";
import { AskButton } from "@/components/shop/ask-button";
import { listProducts, readShopSettings } from "@/lib/shop/store";
import { MaintenanceNotice } from "@/components/hub/maintenance-notice";
import { shopAccess } from "@/lib/shop/gate";

export default async function ShopHomePage() {
  if (!(await shopAccess()).open) return <MaintenanceNotice />;
  const [settings, products] = await Promise.all([readShopSettings(), listProducts({ publishedOnly: true })]);
  const featured = products.filter((p) => p.featured).slice(0, 4);

  return (
    <div className="space-y-14">
      {/* Hero: giới thiệu + slideshow ảnh bìa (sửa trong Admin → Cửa hàng → Cài đặt) */}
      <section className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="eyebrow">{settings.name}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            <L t={settings.tagline} />
          </h1>
          <p className="muted mt-4 max-w-xl text-base leading-relaxed">
            <L t={settings.intro} />
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#san-pham" className="btn-primary px-6 py-3 text-base">
              <L t={{ vi: "Xem sản phẩm", en: "Browse products" }} />
            </a>
            <AskButton className="btn-ghost px-6 py-3 text-base">
              💬 <L t={{ vi: "Nhắn tư vấn", en: "Ask for advice" }} />
            </AskButton>
          </div>
          <p className="muted mt-5 text-sm">
            <L t={{ vi: `${products.length} sản phẩm đang bán`, en: `${products.length} products available` }} />
          </p>
        </Reveal>
        {settings.heroMedia.length > 0 && (
          <Reveal delay={80}>
            <MediaCarousel items={settings.heroMedia} interval={settings.slideInterval} alt={settings.name} autoplayVideo />
          </Reveal>
        )}
      </section>

      {settings.highlights.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {settings.highlights.map((h, idx) => (
            <Reveal key={idx} delay={idx * 60} className="shop-panel flex items-start gap-3 p-4">
              <span className="text-2xl" aria-hidden>
                {h.icon}
              </span>
              <div>
                <p className="font-semibold">
                  <L t={h.title} />
                </p>
                <p className="muted text-sm">
                  <L t={h.text} />
                </p>
              </div>
            </Reveal>
          ))}
        </section>
      )}

      {featured.length > 0 && (
        <section className="space-y-5">
          <div>
            <p className="eyebrow">
              <L t={{ vi: "Gợi ý", en: "Picks" }} />
            </p>
            <h2 className="section-title mt-1">
              <L t={{ vi: "Sản phẩm nổi bật", en: "Featured products" }} />
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} interval={settings.slideInterval} />
            ))}
          </div>
        </section>
      )}

      <Catalog products={products} />

      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-sky-500 p-8 text-white sm:p-10">
        <h2 className="text-2xl font-bold">
          <L t={{ vi: "Cần làm theo bản vẽ riêng?", en: "Need a custom build?" }} />
        </h2>
        <p className="mt-2 max-w-2xl text-white/90">
          <L
            t={{
              vi: "Gửi kích thước, ảnh hoặc file CAD. Shop báo giá và thời gian làm trong ngày.",
              en: "Send dimensions, photos or CAD files. You'll get a quote and lead time the same day."
            }}
          />
        </p>
        <AskButton message="Mình cần đặt làm theo yêu cầu: " className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-brand-700 shadow hover:bg-brand-50">
          💬 <L t={{ vi: "Gửi yêu cầu báo giá", en: "Request a quote" }} />
        </AskButton>
      </section>
    </div>
  );
}
