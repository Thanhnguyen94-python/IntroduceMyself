"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { openChat } from "@/components/chat/chat-widget";
import { QuantityStepper } from "@/components/shop/shop-chrome";
import { useShop } from "@/components/shop/shop-provider";
import { discountPercent, formatVnd, isInStock, productImage, shippingFeeFor, type ShopProduct } from "@/lib/shop/types";

// Khung mua hàng ở trang chi tiết: giá, tồn kho, chọn phân loại, số lượng, thêm giỏ / mua ngay / hỏi shop.
export function BuyBox({ product }: { product: ShopProduct }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const router = useRouter();
  const { settings, add } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.options.map((o) => [o.name.vi || o.name.en, o.values[0]]))
  );
  const name = product.name[lang] || product.name.vi;
  const off = discountPercent(product);
  const inStock = isInStock(product);
  const purchasable = inStock && product.price > 0;
  const stockNote = product.stockNote[lang] || product.stockNote.vi;
  const shipFee = shippingFeeFor(product.price * quantity, settings);

  const addToCart = (goCheckout: boolean) => {
    add({ productId: product.id, slug: product.slug, name, image: productImage(product), price: product.price, options, maxQuantity: product.stock }, quantity, goCheckout ? "none" : "drawer");
    if (goCheckout) router.push("/shop/thanh-toan");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{name}</h1>
        {product.soldCount > 0 && <p className="muted mt-1 text-sm">{vi ? `Đã bán ${product.soldCount}` : `${product.soldCount} sold`}</p>}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--border) 30%, transparent)" }}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-extrabold text-brand-700 dark:text-brand-300">{product.price ? formatVnd(product.price) : vi ? "Liên hệ báo giá" : "Contact for price"}</span>
          {off > 0 && (
            <>
              <span className="muted text-lg line-through">{formatVnd(product.compareAtPrice)}</span>
              <span className="rounded-lg bg-rose-600 px-2 py-0.5 text-sm font-bold text-white">-{off}%</span>
            </>
          )}
        </div>
        <p className={`mt-2 text-sm font-medium ${inStock ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}`}>
          {inStock ? "●" : "○"}{" "}
          {!inStock
            ? vi
              ? "Tạm hết hàng"
              : "Out of stock"
            : product.stock !== null
              ? vi
                ? `Còn ${product.stock} sản phẩm`
                : `${product.stock} in stock`
              : stockNote || (vi ? "Còn hàng" : "In stock")}
          {inStock && product.stock !== null && stockNote && <span className="muted font-normal"> · {stockNote}</span>}
        </p>
      </div>

      <p className="leading-relaxed">{product.summary[lang] || product.summary.vi}</p>

      {product.options.map((option) => {
        const key = option.name.vi || option.name.en;
        return (
          <fieldset key={key}>
            <legend className="text-sm font-semibold">
              {option.name[lang] || option.name.vi}: <span className="muted font-normal">{options[key]}</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const active = options[key] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setOptions((prev) => ({ ...prev, [key]: value }))}
                    className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition ${active ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "hover:border-brand-300"}`}
                    style={active ? undefined : { borderColor: "var(--border)" }}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {purchasable ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{vi ? "Số lượng" : "Quantity"}</span>
            <QuantityStepper value={quantity} max={product.stock} onChange={(q) => setQuantity(Math.max(1, Math.min(q, product.stock ?? 99, 99)))} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => addToCart(false)} className="btn-ghost border-2 border-brand-600 py-3 text-base text-brand-700 dark:text-brand-200">
              🛒 {vi ? "Thêm vào giỏ" : "Add to cart"}
            </button>
            <button type="button" onClick={() => addToCart(true)} className="btn-primary py-3 text-base">
              {vi ? "Mua ngay" : "Buy now"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => openChat(`${vi ? "Mình muốn hỏi về" : "I'd like to ask about"} "${name}": `)} className="btn-primary w-full py-3 text-base">
          💬 {inStock ? (vi ? "Nhắn để báo giá" : "Message for a quote") : vi ? "Báo cho mình khi có hàng" : "Notify me when available"}
        </button>
      )}

      <button type="button" onClick={() => openChat(`${vi ? "Mình muốn hỏi về" : "I'd like to ask about"} "${name}": `)} className="muted text-sm font-medium hover:text-brand-600">
        💬 {vi ? "Hỏi shop về sản phẩm này" : "Ask about this product"}
      </button>

      <ul className="space-y-2 shop-panel p-4 text-sm">
        <li>
          🚚 {vi ? "Phí ship" : "Shipping"}: <b>{shipFee ? formatVnd(shipFee) : vi ? "Miễn phí" : "Free"}</b>
          {settings.shipping.freeFrom > 0 && (
            <span className="muted">
              {" "}
              · {vi ? "miễn phí từ" : "free from"} {formatVnd(settings.shipping.freeFrom)}
            </span>
          )}
        </li>
        {(settings.shipping.note[lang] || settings.shipping.note.vi) && <li className="muted">ℹ️ {settings.shipping.note[lang] || settings.shipping.note.vi}</li>}
        <li>
          💳 {[settings.payment.cod && (vi ? "Thanh toán khi nhận hàng" : "Cash on delivery"), settings.payment.bank.enabled && (vi ? "Chuyển khoản / quét QR" : "Bank transfer / QR")].filter(Boolean).join(" · ")}
        </li>
      </ul>

      {product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {product.tags.map((tag) => (
            <span key={tag} className="chip">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
