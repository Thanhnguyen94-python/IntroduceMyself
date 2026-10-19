"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";
import { openChat } from "@/components/chat/chat-widget";
import { readSavedOrders, useShop, type SavedOrder } from "@/components/shop/shop-provider";
import { ORDER_STATUS_LABEL, formatVnd, vietQrUrl, type OrderStatus, type PublicOrder } from "@/lib/shop/types";

const STEPS: OrderStatus[] = ["pending", "confirmed", "packing", "shipping", "completed"];
const STEP_ICON: Record<OrderStatus, string> = { pending: "📝", confirmed: "✅", packing: "📦", shipping: "🚚", completed: "🎉", cancelled: "✖", returned: "↩" };

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// SĐT vừa nhập chỉ nhớ trong tab hiện tại (sessionStorage), để tải lại trang không phải nhập lại.
const phoneKey = (code: string) => `mj_order_phone_${code}`;
function rememberPhone(code: string, phone: string) {
  try {
    sessionStorage.setItem(phoneKey(code), phone);
  } catch {
    // trình duyệt chặn bộ nhớ -> bỏ qua
  }
}
function recallPhone(code: string) {
  try {
    return sessionStorage.getItem(phoneKey(code)) ?? undefined;
  } catch {
    return undefined;
  }
}

async function lookup(body: { code: string; token?: string; phone?: string }) {
  const res = await fetch("/api/shop/orders/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { order?: PublicOrder; message?: string } | null;
  return { order: res?.ok ? data?.order ?? null : null, message: data?.message ?? "" };
}

// /shop/don-hang: tra cứu bằng mã đơn + SĐT, kèm danh sách đơn đã đặt trên máy này.
export function OrderLookup() {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<SavedOrder[]>([]);

  useEffect(() => setSaved(readSavedOrders()), []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { order, message } = await lookup({ code: code.trim(), phone });
    setLoading(false);
    if (!order) return setError(message || (vi ? "Không tìm thấy đơn." : "Order not found."));
    rememberPhone(order.code, phone);
    router.push(`/shop/don-hang/${order.code}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="text-center">
        <p className="text-4xl">📦</p>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{vi ? "Tra cứu đơn hàng" : "Track your order"}</h1>
        <p className="muted mt-2 text-sm">{vi ? "Nhập mã đơn (vd MJ241019-AB12) và số điện thoại lúc đặt." : "Enter the order code and the phone number used to order."}</p>
      </div>
      <form onSubmit={submit} className="space-y-3 shop-panel p-5">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{vi ? "Mã đơn hàng" : "Order code"}</span>
          <input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MJ241019-AB12" className="input font-mono uppercase" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{vi ? "Số điện thoại" : "Phone"}</span>
          <input required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912 345 678" className="input" />
        </label>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? (vi ? "Đang tìm..." : "Searching...") : vi ? "Tra cứu" : "Track"}
        </button>
      </form>

      {saved.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">{vi ? "Đơn đã đặt trên máy này" : "Orders placed on this device"}</h2>
          <ul className="space-y-2">
            {saved.map((o) => (
              <li key={o.code}>
                <Link href={`/shop/don-hang/${o.code}`} className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm hover:border-brand-400" style={{ borderColor: "var(--border)" }}>
                  <span>
                    <b className="font-mono">{o.code}</b>
                    <span className="muted block text-xs">{dateTime(o.createdAt)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatVnd(o.total)} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// /shop/don-hang/[code]: chi tiết đơn, tiến trình, thanh toán QR.
export function OrderDetail({ code }: { code: string }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const params = useSearchParams();
  const { settings } = useShop();
  const isNew = params.get("moi") === "1";
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [state, setState] = useState<"loading" | "ask" | "ready">("loading");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(
    async (phoneInput?: string) => {
      const saved = readSavedOrders().find((o) => o.code === code);
      const rememberedPhone = phoneInput ?? recallPhone(code);
      if (!saved && !rememberedPhone) return setState("ask");
      const { order: found, message } = await lookup({ code, token: saved?.token, phone: rememberedPhone });
      if (!found) {
        setError(phoneInput ? message : "");
        return setState("ask");
      }
      if (phoneInput) rememberPhone(code, phoneInput);
      setOrder(found);
      setState("ready");
    },
    [code]
  );

  useEffect(() => {
    load();
  }, [load]);

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1500);
    });
  };

  if (state === "loading") return <p className="muted py-20 text-center text-sm">{vi ? "Đang tải đơn hàng..." : "Loading order..."}</p>;

  if (state === "ask" || !order) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(phone);
        }}
        className="shop-panel mx-auto max-w-md space-y-3 p-6"
      >
        <h1 className="text-xl font-bold">
          {vi ? "Đơn" : "Order"} <span className="font-mono">{code}</span>
        </h1>
        <p className="muted text-sm">{vi ? "Nhập số điện thoại đã dùng khi đặt để xem đơn." : "Enter the phone number used for this order."}</p>
        <input required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="0912 345 678" aria-label={vi ? "Số điện thoại" : "Phone"} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full">{vi ? "Xem đơn" : "View order"}</button>
      </form>
    );
  }

  const stopped = order.status === "cancelled" || order.status === "returned";
  const stepIndex = STEPS.indexOf(order.status);
  const bank = settings.payment.bank;
  const qr = order.paymentMethod === "bank" && order.paymentStatus === "unpaid" && !stopped ? vietQrUrl(bank, order.total, order.code) : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {isNew && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-white">
          <p className="text-3xl">🎉</p>
          <h1 className="mt-2 text-2xl font-bold">{vi ? "Đặt hàng thành công!" : "Order placed!"}</h1>
          <p className="mt-1 text-white/90">
            {vi ? "Shop sẽ gọi hoặc nhắn Zalo để xác nhận. Lưu lại mã đơn để tra cứu:" : "You'll get a call or message to confirm. Keep your order code:"}{" "}
            <button type="button" onClick={() => copy(order.code, "code")} className="rounded-lg bg-white/20 px-2 py-0.5 font-mono font-bold hover:bg-white/30">
              {order.code} {copied === "code" ? "✓" : "⧉"}
            </button>
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/shop/don-hang" className="muted text-sm hover:text-brand-600">
            ← {vi ? "Tra cứu đơn khác" : "Track another order"}
          </Link>
          <h2 className="mt-1 text-2xl font-bold">
            {vi ? "Đơn" : "Order"} <span className="font-mono">{order.code}</span>
          </h2>
          <p className="muted text-sm">{dateTime(order.createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${stopped ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" : "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200"}`}>
          {STEP_ICON[order.status]} {ORDER_STATUS_LABEL[order.status][lang]}
        </span>
      </div>

      {!stopped && (
        <ol className="grid grid-cols-5 gap-1" aria-label={vi ? "Tiến trình đơn hàng" : "Order progress"}>
          {STEPS.map((step, idx) => {
            const done = idx <= stepIndex;
            return (
              <li key={step} className="text-center" aria-current={idx === stepIndex ? "step" : undefined}>
                <div className={`h-1.5 rounded-full ${done ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700"}`} />
                <p className={`mt-2 text-lg ${done ? "" : "opacity-40"}`} aria-hidden>
                  {STEP_ICON[step]}
                </p>
                <p className={`text-[11px] leading-tight sm:text-xs ${done ? "font-semibold" : "muted"}`}>{ORDER_STATUS_LABEL[step][lang]}</p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="space-y-4 shop-panel p-5">
          <h3 className="font-semibold">{vi ? "Sản phẩm" : "Items"}</h3>
          <ul className="space-y-3">
            {order.items.map((line, idx) => (
              <li key={idx} className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">{line.image && <img src={line.image} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0 flex-1 text-sm">
                  <Link href={`/shop/san-pham/${line.slug}`} className="font-medium hover:text-brand-600">
                    {line.name}
                  </Link>
                  {Object.values(line.options).length > 0 && <p className="muted text-xs">{Object.values(line.options).join(" · ")}</p>}
                  <p className="muted text-xs">
                    {line.quantity} × {formatVnd(line.unitPrice)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatVnd(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t pt-3 text-sm" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between">
              <dt className="muted">{vi ? "Tạm tính" : "Subtotal"}</dt>
              <dd className="tabular-nums">{formatVnd(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="muted">{vi ? "Phí ship" : "Shipping"}</dt>
              <dd className="tabular-nums">{order.shippingFee ? formatVnd(order.shippingFee) : vi ? "Miễn phí" : "Free"}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>{vi ? "Tổng cộng" : "Total"}</dt>
              <dd className="tabular-nums">{formatVnd(order.total)}</dd>
            </div>
          </dl>
          <div className="space-y-1 border-t pt-3 text-sm" style={{ borderColor: "var(--border)" }}>
            <p>
              <span className="muted">{vi ? "Người nhận" : "Recipient"}:</span> {order.customerName} · {order.phone}
            </p>
            <p>
              <span className="muted">{vi ? "Địa chỉ" : "Address"}:</span> {order.address}
            </p>
            {order.note && (
              <p>
                <span className="muted">{vi ? "Ghi chú" : "Note"}:</span> {order.note}
              </p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="space-y-3 shop-panel p-5">
            <h3 className="font-semibold">{vi ? "Thanh toán" : "Payment"}</h3>
            <p className="text-sm">
              {order.paymentMethod === "bank" ? (vi ? "🏦 Chuyển khoản" : "🏦 Bank transfer") : vi ? "💵 Khi nhận hàng (COD)" : "💵 Cash on delivery"} ·{" "}
              <b className={order.paymentStatus === "paid" ? "text-emerald-600" : "text-amber-600"}>
                {order.paymentStatus === "paid" ? (vi ? "Đã thanh toán" : "Paid") : vi ? "Chưa thanh toán" : "Unpaid"}
              </b>
            </p>
            {qr && (
              <div className="space-y-3 text-center">
                <img src={qr} alt={vi ? "Mã QR chuyển khoản" : "Bank transfer QR"} className="mx-auto w-56 rounded-xl border bg-white p-2" style={{ borderColor: "var(--border)" }} />
                <dl className="space-y-1 text-left text-sm">
                  {[
                    [vi ? "Ngân hàng" : "Bank", bank.bankId, "bank"],
                    [vi ? "Số tài khoản" : "Account", bank.accountNo, "acc"],
                    [vi ? "Chủ tài khoản" : "Name", bank.accountName, "name"],
                    [vi ? "Số tiền" : "Amount", String(order.total), "amount"],
                    [vi ? "Nội dung" : "Reference", order.code, "ref"]
                  ].map(([label, value, key]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <dt className="muted">{label}</dt>
                      <dd className="flex items-center gap-1 font-medium">
                        {key === "amount" ? formatVnd(order.total) : value}
                        <button type="button" onClick={() => copy(value, key)} className="muted rounded px-1 text-xs hover:text-brand-600" aria-label={`Copy ${label}`}>
                          {copied === key ? "✓" : "⧉"}
                        </button>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="muted text-xs">{vi ? "Mở app ngân hàng → Quét QR. Shop xác nhận khi nhận được tiền." : "Open your banking app and scan. Confirmed once received."}</p>
              </div>
            )}
          </section>

          <section className="space-y-3 shop-panel p-5">
            <h3 className="font-semibold">{vi ? "Lịch sử" : "History"}</h3>
            <ol className="space-y-3 border-l-2 pl-4" style={{ borderColor: "var(--border)" }}>
              {[...order.history].reverse().map((event, idx) => (
                <li key={idx} className="relative text-sm">
                  <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-[color:var(--surface)] bg-brand-600" aria-hidden />
                  <p className="font-medium">{ORDER_STATUS_LABEL[event.status][lang]}</p>
                  <p className="muted text-xs">{dateTime(event.at)}</p>
                  {event.note && <p className="mt-1 whitespace-pre-wrap">{event.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openChat(`${vi ? "Mình hỏi về đơn" : "Question about order"} ${order.code}: `)} className="btn-ghost flex-1">
              💬 {vi ? "Nhắn shop" : "Message shop"}
            </button>
            {settings.contact.zalo && (
              <a href={`https://zalo.me/${settings.contact.zalo}`} target="_blank" rel="noreferrer" className="btn-ghost flex-1">
                Zalo
              </a>
            )}
            {settings.contact.phone && (
              <a href={`tel:${settings.contact.phone}`} className="btn-ghost flex-1">
                📞 {vi ? "Gọi" : "Call"}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
