import type { CustomerOrder } from "@/lib/order-types";

async function postJson(url: string, payload: unknown) {
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function notifyByResend(order: CustomerOrder) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFY_EMAIL_TO;
  const from = process.env.ORDER_NOTIFY_EMAIL_FROM ?? "onboarding@resend.dev";

  if (!apiKey || !to) return;

  const lines = (order.lineItems ?? []).map(
    (line) =>
      `<li><b>${line.productName}</b> (${line.productId}) - SL: ${line.quantity} x ${line.unitPrice.toLocaleString("vi-VN")}đ = ${line.lineTotal.toLocaleString("vi-VN")}đ</li>`
  );
  const totalAmount = (order.totalAmount ?? 0).toLocaleString("vi-VN");

  const subject = `[Đơn hàng mới] ${order.id} - ${order.customerName}`;
  const html = `
    <h2>Đơn hàng mới: ${order.id}</h2>
    <p><b>Khách hàng:</b> ${order.customerName}</p>
    <p><b>Liên hệ:</b> ${order.contact}</p>
    <p><b>Danh mục:</b> ${order.category}</p>
    <p><b>Tổng số lượng:</b> ${order.quantity}</p>
    <p><b>Tổng tiền tạm tính:</b> ${totalAmount}đ</p>
    <p><b>Chi tiết sản phẩm:</b></p>
    <ul>${lines.join("") || `<li>${order.productId ?? "(không chọn)"}</li>`}</ul>
    <p><b>Địa chỉ:</b> ${order.address ?? "(chưa có)"}</p>
    <p><b>Ghi chú:</b> ${order.note || "(không có)"}</p>
    <p><b>Thời gian:</b> ${order.createdAt}</p>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html
    })
  });
}

async function notifyByWebhook(order: CustomerOrder) {
  const webhook = process.env.ORDER_WEBHOOK_URL;
  if (!webhook) return;

  await postJson(webhook, {
    channel: "order",
    order
  });
}

async function notifyByZalo(order: CustomerOrder) {
  const zaloWebhook = process.env.ZALO_WEBHOOK_URL;
  if (!zaloWebhook) return;

  const lines = (order.lineItems ?? []).map((line) => `- ${line.productId}: ${line.quantity} x ${line.unitPrice.toLocaleString("vi-VN")}đ`).join("\n");

  const text = [
    `🛒 Đơn mới ${order.id}`,
    `Khách: ${order.customerName}`,
    `Liên hệ: ${order.contact}`,
    `SL tổng: ${order.quantity}`,
    `Tổng tạm tính: ${(order.totalAmount ?? 0).toLocaleString("vi-VN")}đ`,
    `Sản phẩm:\n${lines || `- ${order.productId ?? "(không chọn)"}`}`,
    `Địa chỉ: ${order.address ?? "(chưa có)"}`,
    `Ghi chú: ${order.note || "(không có)"}`
  ].join("\n");

  await postJson(zaloWebhook, {
    text,
    order
  });
}

export async function notifyNewOrder(order: CustomerOrder) {
  await Promise.allSettled([notifyByResend(order), notifyByWebhook(order), notifyByZalo(order)]);
}
