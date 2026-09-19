"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import type { ShowcaseData } from "@/lib/showcase-types";

type OrderLineInput = {
  productId: string;
  quantity: number;
};

export default function SanPhamTrungBayPage() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<"all" | "3d" | "display">("all");
  const [formSent, setFormSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<ShowcaseData["items"]>([]);
  const [lightbox, setLightbox] = useState<{
    open: boolean;
    title: string;
    images: string[];
    index: number;
  }>({ open: false, title: "", images: [], index: 0 });
  const touchStartRef = useRef<Record<string, number | null>>({});
  const [formData, setFormData] = useState({
    customerName: "",
    contact: "",
    address: "",
    note: "",
    lineItems: [{ productId: "", quantity: 1 }] as OrderLineInput[]
  });

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/showcase/products", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as ShowcaseData;
        setProducts(payload.items ?? []);
      } catch {
        setProducts([]);
      }
    }

    loadProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    const byTab = tab === "all" ? products : products.filter((p) => p.category === tab);
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return byTab;

    return byTab.filter((item) => {
      const name = item.name[lang].toLowerCase();
      const desc = item.description[lang].toLowerCase();
      const tags = item.tags.join(" ").toLowerCase();
      return name.includes(keyword) || desc.includes(keyword) || tags.includes(keyword) || item.id.toLowerCase().includes(keyword);
    });
  }, [tab, products, searchTerm, lang]);

  const getImages = (item: ShowcaseData["items"][number]) => {
    const all = [item.image, ...(item.gallery ?? [])].filter(Boolean);
    return Array.from(new Set(all));
  };

  const productMap = useMemo(() => {
    return new Map(products.map((item) => [item.id, item]));
  }, [products]);

  const moveSlide = (itemId: string, total: number, delta: number) => {
    if (total <= 1) return;
    setCarouselIndex((prev) => {
      const current = prev[itemId] ?? 0;
      const next = (current + delta + total) % total;
      return { ...prev, [itemId]: next };
    });
  };

  const moveLightbox = (delta: number) => {
    setLightbox((prev) => {
      if (!prev.open || prev.images.length <= 1) return prev;
      const next = (prev.index + delta + prev.images.length) % prev.images.length;
      return { ...prev, index: next };
    });
  };

  const addProductToOrder = (productId: string) => {
    setFormOpen(true);
    setFormSent(false);
    setSubmitError("");

    setFormData((prev) => {
      const foundIndex = prev.lineItems.findIndex((line) => line.productId === productId);
      if (foundIndex >= 0) {
        return {
          ...prev,
          lineItems: prev.lineItems.map((line, index) =>
            index === foundIndex ? { ...line, quantity: line.quantity + 1 } : line
          )
        };
      }

      return {
        ...prev,
        lineItems: [...prev.lineItems.filter((line) => line.productId), { productId, quantity: 1 }]
      };
    });
  };

  const updateLineItem = (index: number, patch: Partial<OrderLineInput>) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((line, i) =>
        i === index
          ? {
              ...line,
              ...patch,
              quantity: Math.max(1, Math.floor(Number((patch.quantity ?? line.quantity) || 1)))
            }
          : line
      )
    }));
  };

  const removeLineItem = (index: number) => {
    setFormData((prev) => {
      const next = prev.lineItems.filter((_, i) => i !== index);
      return {
        ...prev,
        lineItems: next.length > 0 ? next : [{ productId: "", quantity: 1 }]
      };
    });
  };

  const addEmptyLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { productId: "", quantity: 1 }]
    }));
  };

  const orderSummary = useMemo(() => {
    const normalized = formData.lineItems
      .map((line) => {
        const product = productMap.get(line.productId);
        if (!product || !line.productId) return null;
        const quantity = Math.max(1, Math.floor(Number(line.quantity || 1)));
        const unitPrice = product.salePrice;
        return {
          productId: product.id,
          productName: product.name[lang],
          quantity,
          unitPrice,
          lineTotal: quantity * unitPrice
        };
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line));

    const totalQuantity = normalized.reduce((sum, line) => sum + line.quantity, 0);
    const totalAmount = normalized.reduce((sum, line) => sum + line.lineTotal, 0);
    return { normalized, totalQuantity, totalAmount };
  }, [formData.lineItems, productMap, lang]);

  const submitOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (orderSummary.normalized.length === 0) {
      setSubmitError(lang === "vi" ? "Vui lòng chọn ít nhất 1 sản phẩm." : "Please select at least 1 product.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setOrderId("");

    const firstCategory = productMap.get(orderSummary.normalized[0].productId)?.category ?? "other";

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customerName: formData.customerName,
        contact: formData.contact,
        category: firstCategory,
        productId: orderSummary.normalized[0]?.productId,
        quantity: orderSummary.totalQuantity,
        lineItems: orderSummary.normalized.map((line) => ({
          productId: line.productId,
          quantity: line.quantity
        })),
        address: formData.address,
        note: formData.note
      })
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; orderId?: string };

    if (!response.ok) {
      setSubmitError(payload.message ?? (lang === "vi" ? "Gửi đơn thất bại." : "Submit failed."));
      setSubmitting(false);
      return;
    }

    setFormSent(true);
    setOrderId(payload.orderId ?? "");
    setSubmitting(false);
    setFormData({
      customerName: "",
      contact: "",
      address: "",
      note: "",
      lineItems: [{ productId: "", quantity: 1 }]
    });
  };

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
      }),
    [lang]
  );

  return (
    <section className="space-y-6">
      <div className="card bg-gradient-to-br from-brand-100 via-white to-brand-200 dark:from-brand-800 dark:via-slate-900 dark:to-brand-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
          {lang === "vi" ? "Trang mới" : "New section"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-200 md:text-3xl">
          {lang === "vi" ? "In 3D & Sản phẩm trưng bày" : "3D Printing & Showcase Products"}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-700 dark:text-slate-200">
          {lang === "vi"
            ? "Không gian trưng bày các sản phẩm in 3D, jig/tool SMT và các dự án đã hoàn thiện để bán. Mỗi sản phẩm có giá gốc, giá sale, trạng thái tồn kho và mẫu yêu cầu nhanh."
            : "A storefront for 3D printed products, SMT jigs/tools, and completed projects ready for sale with original price, sale price, stock status, and quick request form."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {[lang === "vi" ? "Giảm giá theo đợt" : "Campaign discounts", lang === "vi" ? "Nhận làm theo yêu cầu" : "Custom builds", lang === "vi" ? "Hỗ trợ doanh nghiệp" : "B2B support"].map((chip) => (
            <span key={chip} className="rounded-full bg-white/80 px-3 py-1 font-medium text-brand-700 dark:bg-slate-800 dark:text-brand-200">
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: lang === "vi" ? "Tất cả" : "All" },
          { key: "3d", label: lang === "vi" ? "In 3D" : "3D Printing" },
          { key: "display", label: lang === "vi" ? "Sản phẩm trưng bày" : "Showcase Items" }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as "all" | "3d" | "display")}
            className={`rounded-full px-3 py-1.5 text-sm ${tab === item.key ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700 dark:bg-slate-800 dark:text-brand-200"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center gap-3">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === "vi" ? "Tìm nhanh theo tên, mã, tag..." : "Quick search by name, id, tags..."}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />

          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="relative shrink-0 rounded-full bg-red-500 p-2.5 text-white shadow-lg hover:bg-red-600"
            aria-label={lang === "vi" ? "Mở form đặt hàng" : "Open order form"}
            title={lang === "vi" ? "Mở form đặt hàng" : "Open order form"}
          >
            <span aria-hidden>🛒</span>
            {orderSummary.totalQuantity > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-black px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {orderSummary.totalQuantity}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleProducts.map((item) => {
          const images = getImages(item);
          const activeIndex = carouselIndex[item.id] ?? 0;
          const imageSrc = images[activeIndex] ?? item.image;
          const discount = Math.max(0, Math.round(((item.oldPrice - item.salePrice) / item.oldPrice) * 100));
          return (
            <article key={item.id} className="card overflow-hidden">
              <div
                className="relative"
                onTouchStart={(e) => {
                  touchStartRef.current[item.id] = e.touches[0]?.clientX ?? null;
                }}
                onTouchEnd={(e) => {
                  const start = touchStartRef.current[item.id];
                  const end = e.changedTouches[0]?.clientX;
                  if (typeof start !== "number" || typeof end !== "number") return;

                  const distance = start - end;
                  if (Math.abs(distance) > 40) {
                    moveSlide(item.id, images.length, distance > 0 ? 1 : -1);
                  }
                  touchStartRef.current[item.id] = null;
                }}
              >
                <button
                  type="button"
                  className="w-full"
                  onClick={() =>
                    setLightbox({
                      open: true,
                      title: item.name[lang],
                      images,
                      index: activeIndex
                    })
                  }
                >
                  <img src={imageSrc} alt={item.name[lang]} className="h-52 w-full rounded-lg object-cover" />
                </button>
                <span className="absolute left-2 top-2 rounded bg-red-500 px-2 py-1 text-xs font-bold text-white">
                  -{discount}%
                </span>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => moveSlide(item.id, images.length, -1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm text-white"
                      aria-label="Previous image"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(item.id, images.length, 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm text-white"
                      aria-label="Next image"
                    >
                      ▶
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-2 flex justify-center gap-1.5">
                  {images.map((_, index) => (
                    <button
                      key={`${item.id}-dot-${index}`}
                      type="button"
                      onClick={() => setCarouselIndex((prev) => ({ ...prev, [item.id]: index }))}
                      className={`h-2 w-2 rounded-full ${index === activeIndex ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"}`}
                      aria-label={`Image ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              <h2 className="mt-3 text-lg font-semibold">{item.name[lang]}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {item.description[lang]}
              </p>

              <div className="mt-3 flex items-end gap-3">
                <p className="text-xl font-bold text-brand-700 dark:text-brand-200">{currency.format(item.salePrice)}</p>
                <p className="text-sm text-slate-500 line-through">{currency.format(item.oldPrice)}</p>
              </div>

              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{item.stockText[lang]}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-slate-800 dark:text-brand-200">
                    {tag}
                  </span>
                ))}
              </div>

              <button
                className="mt-4 w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                onClick={() => addProductToOrder(item.id)}
              >
                {lang === "vi" ? "Nhận tư vấn / Đặt mua" : "Get consultation / Buy now"}
              </button>
            </article>
          );
        })}
      </div>

      {visibleProducts.length === 0 && (
        <div className="card text-sm" style={{ color: "var(--muted)" }}>
          {lang === "vi" ? "Không tìm thấy sản phẩm phù hợp." : "No matching products found."}
        </div>
      )}

      {formOpen && <div className="fixed inset-0 z-[65] bg-black/15" onClick={() => setFormOpen(false)} />}

      {formOpen && (
        <div className="fixed bottom-6 left-6 z-[70] w-[min(92vw,360px)]">
          <form className="card space-y-3 shadow-2xl" onSubmit={submitOrder}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-brand-600 dark:text-brand-300">
                {lang === "vi" ? "Form đặt hàng nhanh" : "Quick order form"}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-full border px-2 py-1 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                {lang === "vi" ? "Đóng" : "Close"}
              </button>
            </div>

          <input
            required
            placeholder={lang === "vi" ? "Họ và tên" : "Full name"}
            value={formData.customerName}
            onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
          <input
            required
            placeholder={lang === "vi" ? "Số điện thoại / Email" : "Phone / Email"}
            value={formData.contact}
            onChange={(e) => setFormData((prev) => ({ ...prev, contact: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
          <div className="space-y-2 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-brand-600 dark:text-brand-300">
                {lang === "vi" ? "Sản phẩm đặt mua" : "Ordered products"}
              </p>
              <button type="button" onClick={addEmptyLineItem} className="text-xs font-semibold text-brand-600 dark:text-brand-300">
                + {lang === "vi" ? "Thêm dòng" : "Add row"}
              </button>
            </div>

            {formData.lineItems.map((line, index) => (
              <div key={`line-${index}`} className="grid grid-cols-[1fr_82px_28px] gap-2">
                <select
                  className="rounded-lg border px-2 py-2 text-xs"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  value={line.productId}
                  onChange={(e) => updateLineItem(index, { productId: e.target.value })}
                >
                  <option value="">{lang === "vi" ? "Chọn sản phẩm" : "Select product"}</option>
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id} - {item.name[lang]}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLineItem(index, { quantity: Number(e.target.value || 1) })}
                  className="rounded-lg border px-2 py-2 text-xs"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                />

                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  className="rounded-lg bg-red-500 text-xs font-bold text-white"
                  aria-label="Remove line"
                >
                  ×
                </button>
              </div>
            ))}

            <div className="space-y-1 text-xs" style={{ color: "var(--muted)" }}>
              {orderSummary.normalized.map((line, lineIndex) => (
                <p key={`sum-${line.productId}-${lineIndex}`}>
                  {line.productName}: {line.quantity} x {currency.format(line.unitPrice)} = <b>{currency.format(line.lineTotal)}</b>
                </p>
              ))}
              <p className="font-semibold text-brand-700 dark:text-brand-200">
                {lang === "vi" ? "Tổng tạm tính" : "Estimated total"}: {currency.format(orderSummary.totalAmount)}
              </p>
            </div>
          </div>

          <input
            placeholder={lang === "vi" ? "Địa chỉ nhận hàng" : "Delivery address"}
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />

          <textarea
            rows={4}
            placeholder={lang === "vi" ? "Mô tả nhu cầu (kích thước, vật liệu, số lượng...)" : "Describe your requirement (size, material, quantity...)"}
            value={formData.note}
            onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            required
          />
          <button disabled={submitting} className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {submitting ? (lang === "vi" ? "Đang gửi..." : "Sending...") : (lang === "vi" ? "Gửi đơn đặt hàng" : "Place order")}
          </button>

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}

          {formSent && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {lang === "vi"
                ? `Đã ghi nhận đơn hàng thành công. Mã đơn: ${orderId || "(đang tạo)"}.`
                : `Order received successfully. Order ID: ${orderId || "(processing)"}.`}
            </p>
          )}
          </form>
        </div>
      )}

      {lightbox.open && (
        <div className="fixed inset-0 z-[90] bg-black/80 p-4" onClick={() => setLightbox((prev) => ({ ...prev, open: false }))}>
          <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-center">
            <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={lightbox.images[lightbox.index]}
                alt={lightbox.title}
                className="max-h-[82vh] w-full rounded-xl object-contain"
              />

              <button
                type="button"
                onClick={() => setLightbox((prev) => ({ ...prev, open: false }))}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white"
              >
                ✕
              </button>

              {lightbox.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moveLightbox(-1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-white"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLightbox(1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-white"
                  >
                    ▶
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
