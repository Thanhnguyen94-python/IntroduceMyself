"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { QuantityStepper } from "@/components/shop/shop-chrome";
import { saveOrder, useShop, type CartLine } from "@/components/shop/shop-provider";
import { getVisitorId, readStoredJson, writeStoredJson } from "@/lib/visitor-id";
import { formatVnd, isInStock, productImage, shippingFeeFor, type PaymentMethod, type ShopProduct } from "@/lib/shop/types";

type Profile = { customerName: string; phone: string; email: string; address: string };
const PROFILE_KEY = "mj_checkout_profile";

// Trang đặt hàng: đối chiếu giỏ với giá/tồn kho mới nhất, nhập thông tin nhận hàng, chọn cách thanh toán.
export function Checkout({ products }: { products: ShopProduct[] }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const router = useRouter();
  const { settings, lines, ready, replace, setQuantity, remove, clear } = useShop();
  const [profile, setProfile] = useState<Profile>({ customerName: "", phone: "", email: "", address: "" });
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>(settings.payment.cod ? "cod" : "bank");
  const [remember, setRemember] = useState(true);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    const saved = readStoredJson<Profile>(PROFILE_KEY);
    if (saved) setProfile((p) => ({ ...p, ...saved }));
  }, []);

  // Giá / tên / tồn kho trong giỏ có thể đã cũ -> cập nhật theo dữ liệu hiện tại và báo cho khách biết.
  useEffect(() => {
    if (!ready || placed) return;
    const byId = new Map(products.map((p) => [p.id, p]));
    const messages: string[] = [];
    let changed = false;
    const next: CartLine[] = [];
    for (const line of lines) {
      const product = byId.get(line.productId);
      if (!product || !isInStock(product) || !product.price) {
        messages.push(vi ? `"${line.name}" không còn bán / đã hết hàng nên đã được bỏ khỏi giỏ.` : `"${line.name}" is no longer available and was removed.`);
        changed = true;
        continue;
      }
      const name = product.name[lang] || product.name.vi;
      const quantity = product.stock !== null ? Math.min(line.quantity, product.stock) : line.quantity;
      if (product.price !== line.price) messages.push(vi ? `Giá "${name}" đã cập nhật: ${formatVnd(product.price)}.` : `Price of "${name}" updated: ${formatVnd(product.price)}.`);
      if (quantity !== line.quantity) messages.push(vi ? `"${name}" chỉ còn ${product.stock}, đã giảm số lượng.` : `Only ${product.stock} of "${name}" left.`);
      const updated = { ...line, name, price: product.price, quantity, image: productImage(product), slug: product.slug, maxQuantity: product.stock };
      if (JSON.stringify(updated) !== JSON.stringify(line)) changed = true;
      next.push(updated);
    }
    if (changed) replace(next);
    if (messages.length) setNotices(messages);
    // Chỉ đối chiếu khi giỏ vừa tải xong / dữ liệu sản phẩm đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, products]);

  const subtotal = useMemo(() => lines.reduce((sum, l) => sum + l.price * l.quantity, 0), [lines]);
  const fee = shippingFeeFor(subtotal, settings);
  const total = subtotal + fee;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !lines.length) return;
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/shop/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        note,
        paymentMethod: payment,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, options: l.options })),
        visitorId: getVisitorId().id,
        website: honeypot
      })
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { code?: string; token?: string; message?: string; order?: { total: number; createdAt: string } } | null;
    if (!res?.ok || !data?.code || !data.token) {
      setSubmitting(false);
      setError(data?.message ?? (vi ? "Không gửi được đơn, vui lòng thử lại." : "Couldn't place the order, please try again."));
      return;
    }
    writeStoredJson(PROFILE_KEY, remember ? profile : null);
    saveOrder({ code: data.code, token: data.token, total: data.order?.total ?? total, createdAt: data.order?.createdAt ?? new Date().toISOString() });
    setPlaced(true);
    clear();
    router.push(`/shop/don-hang/${data.code}?moi=1`);
  }

  if (!ready) return <p className="muted py-20 text-center text-sm">{vi ? "Đang tải giỏ hàng..." : "Loading cart..."}</p>;

  if (!lines.length && !placed) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-5xl">🧺</p>
        <h1 className="mt-4 text-2xl font-bold">{vi ? "Giỏ hàng đang trống" : "Your cart is empty"}</h1>
        {notices.map((n) => (
          <p key={n} className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            {n}
          </p>
        ))}
        <Link href="/shop" className="btn-primary mt-6">
          {vi ? "← Xem sản phẩm" : "← Browse products"}
        </Link>
      </div>
    );
  }

  const set = (key: keyof Profile) => (e: { target: { value: string } }) => setProfile((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <div>
          <Link href="/shop" className="muted text-sm hover:text-brand-600">
            ← {vi ? "Tiếp tục mua hàng" : "Continue shopping"}
          </Link>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{vi ? "Đặt hàng" : "Checkout"}</h1>
        </div>

        {notices.length > 0 && (
          <div className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" role="status">
            {notices.map((n) => (
              <p key={n}>• {n}</p>
            ))}
          </div>
        )}

        <fieldset className="space-y-3 shop-panel p-5">
          <legend className="px-1 font-semibold">1. {vi ? "Thông tin nhận hàng" : "Delivery details"}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">{vi ? "Họ tên" : "Full name"} *</span>
              <input required minLength={2} maxLength={80} autoComplete="name" value={profile.customerName} onChange={set("customerName")} className="input" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">{vi ? "Số điện thoại" : "Phone"} *</span>
              <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 345 678" value={profile.phone} onChange={set("phone")} className="input" />
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{vi ? "Địa chỉ nhận hàng" : "Delivery address"} *</span>
            <textarea required minLength={8} rows={2} autoComplete="street-address" placeholder={vi ? "Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" : "Street, ward, district, city"} value={profile.address} onChange={set("address")} className="input" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Email</span> <span className="muted text-xs">({vi ? "không bắt buộc, để nhận email xác nhận đơn" : "optional, for order confirmation"})</span>
            <input type="email" autoComplete="email" value={profile.email} onChange={set("email")} className="input" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{vi ? "Ghi chú cho shop" : "Note"}</span>
            <textarea rows={2} maxLength={1000} placeholder={vi ? "Giờ nhận hàng, yêu cầu kích thước/màu..." : "Delivery time, size/colour requests..."} value={note} onChange={(e) => setNote(e.target.value)} className="input" />
          </label>
          {/* Ô bẫy bot: người dùng không thấy */}
          <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" className="hidden" aria-hidden />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            {vi ? "Nhớ thông tin cho lần mua sau (chỉ lưu trên máy này)" : "Remember my details on this device"}
          </label>
        </fieldset>

        <fieldset className="space-y-3 shop-panel p-5">
          <legend className="px-1 font-semibold">2. {vi ? "Thanh toán" : "Payment"}</legend>
          {settings.payment.cod && (
            <PaymentOption checked={payment === "cod"} onSelect={() => setPayment("cod")} title={vi ? "💵 Thanh toán khi nhận hàng (COD)" : "💵 Cash on delivery"} text={vi ? "Kiểm tra hàng rồi mới trả tiền cho shipper." : "Pay the courier after inspecting the goods."} />
          )}
          {settings.payment.bank.enabled && (
            <PaymentOption
              checked={payment === "bank"}
              onSelect={() => setPayment("bank")}
              title={vi ? "🏦 Chuyển khoản / quét mã QR" : "🏦 Bank transfer / QR"}
              text={vi ? "Mã QR có sẵn số tiền & nội dung sẽ hiện sau khi đặt hàng." : "A QR code with amount & reference appears after ordering."}
            />
          )}
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 shop-panel p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold">
          {vi ? "Đơn hàng" : "Order"} ({lines.reduce((s, l) => s + l.quantity, 0)})
        </h2>
        <ul className="max-h-80 space-y-3 overflow-y-auto">
          {lines.map((line) => (
            <li key={line.key} className="flex gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">{line.image && <img src={line.image} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{line.name}</p>
                {Object.values(line.options).length > 0 && <p className="muted text-xs">{Object.values(line.options).join(" · ")}</p>}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <QuantityStepper value={line.quantity} max={line.maxQuantity} onChange={(q) => setQuantity(line.key, q)} small />
                  <span className="text-sm font-semibold tabular-nums">{formatVnd(line.price * line.quantity)}</span>
                </div>
              </div>
              <button type="button" onClick={() => remove(line.key)} className="muted self-start text-xs hover:text-red-600" aria-label={vi ? `Xoá ${line.name}` : `Remove ${line.name}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t pt-3 text-sm" style={{ borderColor: "var(--border)" }}>
          <div className="flex justify-between">
            <dt className="muted">{vi ? "Tạm tính" : "Subtotal"}</dt>
            <dd className="tabular-nums">{formatVnd(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="muted">{vi ? "Phí ship" : "Shipping"}</dt>
            <dd className="tabular-nums">{fee ? formatVnd(fee) : vi ? "Miễn phí" : "Free"}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold" style={{ borderColor: "var(--border)" }}>
            <dt>{vi ? "Tổng cộng" : "Total"}</dt>
            <dd className="tabular-nums text-brand-700 dark:text-brand-300">{formatVnd(total)}</dd>
          </div>
        </dl>
        {(settings.shipping.note[lang] || settings.shipping.note.vi) && <p className="muted text-xs">ℹ️ {settings.shipping.note[lang] || settings.shipping.note.vi}</p>}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting || !lines.length || (!settings.payment.cod && !settings.payment.bank.enabled)} className="btn-primary w-full py-3 text-base">
          {submitting ? (vi ? "Đang gửi đơn..." : "Placing order...") : vi ? `Đặt hàng · ${formatVnd(total)}` : `Place order · ${formatVnd(total)}`}
        </button>
        <p className="muted text-center text-xs">{vi ? "Shop sẽ gọi/nhắn xác nhận trước khi giao." : "You'll get a call/message to confirm before shipping."}</p>
      </aside>
    </form>
  );
}

function PaymentOption({ checked, onSelect, title, text }: { checked: boolean; onSelect: () => void; title: string; text: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${checked ? "border-brand-600 bg-brand-50/60 dark:bg-brand-900/20" : ""}`} style={checked ? undefined : { borderColor: "var(--border)" }}>
      <input type="radio" name="payment" checked={checked} onChange={onSelect} className="mt-1" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="muted block text-sm">{text}</span>
      </span>
    </label>
  );
}
