import { escapeHtml, isEmail, notifyAdmin, sendEmail } from "@/lib/notify";
import { ORDER_STATUS_LABEL, formatVnd, vietQrUrl, type ShopOrder, type ShopSettings } from "@/lib/shop/types";

// Thông báo đơn hàng: admin (email / Zalo / webhook như chat) và khách (email nếu có).

const lineText = (order: ShopOrder) =>
  order.items
    .map((l) => {
      const opts = Object.values(l.options).filter(Boolean).join(", ");
      return `• ${l.name}${opts ? ` (${opts})` : ""} × ${l.quantity} = ${formatVnd(l.lineTotal)}`;
    })
    .join("\n");

export async function notifyNewOrder(order: ShopOrder, origin: string) {
  await notifyAdmin({
    channel: "order",
    title: `Đơn mới ${order.code} · ${formatVnd(order.total)}`,
    fields: [
      ["Khách", order.customerName],
      ["SĐT", order.phone],
      ...(order.email ? ([["Email", order.email]] as Array<[string, string]>) : []),
      ["Địa chỉ", order.address],
      ["Thanh toán", order.paymentMethod === "bank" ? "Chuyển khoản" : "Khi nhận hàng (COD)"]
    ],
    message: `${lineText(order)}\nPhí ship: ${formatVnd(order.shippingFee)}\nTổng: ${formatVnd(order.total)}${order.note ? `\n\nGhi chú: ${order.note}` : ""}`,
    link: `${origin}/admin/shop/orders?code=${order.code}`,
    replyTo: order.email
  });
}

function orderTable(order: ShopOrder) {
  const rows = order.items
    .map((l) => {
      const opts = Object.values(l.options).filter(Boolean).join(", ");
      return `<tr><td style="padding:6px 0">${escapeHtml(l.name)}${opts ? `<br><small style="color:#64748b">${escapeHtml(opts)}</small>` : ""}</td><td style="text-align:center">×${l.quantity}</td><td style="text-align:right">${formatVnd(l.lineTotal)}</td></tr>`;
    })
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
    <tr><td colspan="2" style="padding-top:8px;color:#64748b">Phí ship</td><td style="text-align:right;padding-top:8px">${order.shippingFee ? formatVnd(order.shippingFee) : "Miễn phí"}</td></tr>
    <tr><td colspan="2"><b>Tổng cộng</b></td><td style="text-align:right"><b>${formatVnd(order.total)}</b></td></tr></table>`;
}

export async function emailOrderConfirmation(order: ShopOrder, settings: ShopSettings, origin: string) {
  if (!isEmail(order.email)) return;
  const qr = order.paymentMethod === "bank" ? vietQrUrl(settings.payment.bank, order.total, order.code) : "";
  const html = `
    <p>Chào ${escapeHtml(order.customerName)},</p>
    <p>${escapeHtml(settings.name)} đã nhận đơn <b>${order.code}</b>. Mình sẽ gọi/nhắn để xác nhận sớm nhất.</p>
    ${orderTable(order)}
    ${qr ? `<p>Chuyển khoản: <b>${escapeHtml(settings.payment.bank.accountName)}</b> · ${escapeHtml(settings.payment.bank.accountNo)} (${escapeHtml(settings.payment.bank.bankId)}) · nội dung <b>${order.code}</b></p><p><img src="${qr}" alt="VietQR" width="220"></p>` : ""}
    <p><a href="${origin}/shop/don-hang?code=${order.code}">Theo dõi đơn hàng →</a> (nhập mã đơn + số điện thoại)</p>`;
  try {
    await sendEmail(order.email, `Đã nhận đơn ${order.code} · ${settings.name}`, html, isEmail(settings.contact.email) ? settings.contact.email : undefined);
  } catch (error) {
    console.error("[shop] confirmation email failed", error);
  }
}

export async function emailOrderStatus(order: ShopOrder, settings: ShopSettings, origin: string, note?: string) {
  if (!isEmail(order.email)) return;
  const html = `
    <p>Chào ${escapeHtml(order.customerName)},</p>
    <p>Đơn <b>${order.code}</b> của bạn đã chuyển sang: <b>${escapeHtml(ORDER_STATUS_LABEL[order.status].vi)}</b>.</p>
    ${note ? `<blockquote style="border-left:4px solid #0B5FFF;padding:8px 12px;background:#f1f6ff;white-space:pre-wrap">${escapeHtml(note)}</blockquote>` : ""}
    ${orderTable(order)}
    <p><a href="${origin}/shop/don-hang?code=${order.code}">Xem chi tiết đơn →</a></p>`;
  try {
    await sendEmail(order.email, `Đơn ${order.code}: ${ORDER_STATUS_LABEL[order.status].vi}`, html, isEmail(settings.contact.email) ? settings.contact.email : undefined);
  } catch (error) {
    console.error("[shop] status email failed", error);
  }
}
