import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { L } from "@/components/ui/localized";
import { ProductGallery } from "@/components/shop/product-gallery";
import { BuyBox } from "@/components/shop/buy-box";
import { ProductCard } from "@/components/shop/product-card";
import { LocalizedHtml } from "@/components/shop/localized-html";
import { isAdminRequest } from "@/lib/admin-guard";
import { renderMarkdown } from "@/lib/hubs/markdown";
import { getProductBySlug, listProducts, readShopSettings } from "@/lib/shop/store";
import { MaintenanceNotice } from "@/components/hub/maintenance-notice";
import { shopAccess } from "@/lib/shop/gate";
import { PRODUCT_STATUS_LABEL, discountPercent, isInStock, productImage } from "@/lib/shop/types";

type Props = { params: Promise<{ slug: string }> };

// Sản phẩm nháp / tạm ẩn (hoặc cả cửa hàng đang tắt): chỉ admin (đã đăng nhập) xem trước được.
async function loadProduct(slug: string) {
  if (!(await shopAccess()).open) return null;
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) return null;
  if (product.status !== "published" && !(await isAdminRequest())) return null;
  return product;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return {};
  const image = productImage(product);
  return {
    title: product.name.vi,
    description: product.summary.vi,
    openGraph: { title: product.name.vi, description: product.summary.vi, images: image ? [image] : undefined }
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  if (!(await shopAccess()).open) return <MaintenanceNotice />;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const [settings, all] = await Promise.all([readShopSettings(), listProducts({ publishedOnly: true })]);
  const category = settings.categories.find((c) => c.id === product.category);
  const related = all.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const more = related.length < 4 ? all.filter((p) => p.id !== product.id && !related.includes(p)).slice(0, 4 - related.length) : [];
  const description = { vi: renderMarkdown(product.description.vi).html, en: product.description.en ? renderMarkdown(product.description.en).html : "" };
  const off = discountPercent(product);
  const badge = product.badge.vi;

  // Dữ liệu có cấu trúc để Google hiện giá / tình trạng hàng.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name.vi,
    description: product.summary.vi,
    image: product.media.map((m) => m.url).filter((u) => /^https?:|^\//.test(u)),
    sku: product.id,
    offers: {
      "@type": "Offer",
      priceCurrency: "VND",
      price: product.price,
      availability: isInStock(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {product.status !== "published" && (
        <p className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          👁 Bản xem trước của admin · sản phẩm đang ở trạng thái <b>{PRODUCT_STATUS_LABEL[product.status]}</b>, khách chưa thấy.{" "}
          <Link href={`/admin/shop/products/${product.id}`} className="font-semibold underline">
            Sửa sản phẩm
          </Link>
        </p>
      )}

      <nav className="muted flex flex-wrap items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-brand-600">
          <L t={{ vi: "Cửa hàng", en: "Shop" }} />
        </Link>
        {category && (
          <>
            <span aria-hidden>›</span>
            <Link href={`/shop?dm=${category.id}#san-pham`} className="hover:text-brand-600">
              <L t={category.label} />
            </Link>
          </>
        )}
        <span aria-hidden>›</span>
        <span className="truncate" style={{ color: "var(--text)" }}>
          <L t={product.name} />
        </span>
      </nav>

      <section className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <ProductGallery
          media={product.media}
          alt={product.name.vi}
          interval={settings.slideInterval}
          badges={
            <>
              {off > 0 && <span className="rounded-lg bg-rose-600 px-2 py-0.5 text-xs font-bold text-white shadow">-{off}%</span>}
              {badge && (
                <span className="rounded-lg bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900 shadow">
                  <L t={product.badge} />
                </span>
              )}
            </>
          }
        />
        <div className="lg:sticky lg:top-24 lg:self-start">
          <BuyBox product={product} />
        </div>
      </section>

      {(product.description.vi || product.specs.length > 0) && (
        <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {product.description.vi && (
            <div>
              <h2 className="text-xl font-bold">
                <L t={{ vi: "Mô tả sản phẩm", en: "Description" }} />
              </h2>
              <LocalizedHtml html={description} className="doc-prose mt-4" />
            </div>
          )}
          {product.specs.length > 0 && (
            <div>
              <h2 className="text-xl font-bold">
                <L t={{ vi: "Thông số", en: "Specifications" }} />
              </h2>
              <dl className="shop-panel mt-4 overflow-hidden text-sm">
                {product.specs.map((spec, idx) => (
                  <div key={idx} className={`grid grid-cols-[40%_1fr] gap-3 px-4 py-2.5 ${idx % 2 ? "" : "bg-slate-50 dark:bg-slate-800/40"}`}>
                    <dt className="muted">
                      <L t={spec.label} />
                    </dt>
                    <dd className="font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>
      )}

      {[...related, ...more].length > 0 && (
        <section className="space-y-5">
          <h2 className="section-title">
            <L t={{ vi: "Có thể bạn cũng thích", en: "You may also like" }} />
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...related, ...more].map((p, index) => (
              <ProductCard key={p.id} product={p} index={index} interval={settings.slideInterval} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
