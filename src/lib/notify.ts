// Thông báo cho admin khi có tin nhắn chat / câu hỏi mới, và báo cho khách khi admin trả lời.
// Dùng lại cấu hình kênh của đơn hàng: RESEND_API_KEY, ORDER_NOTIFY_EMAIL_TO (hoặc ADMIN_NOTIFY_EMAIL),
// ORDER_WEBHOOK_URL, ZALO_WEBHOOK_URL. Kênh nào chưa cấu hình thì bỏ qua.

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function isEmail(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value));
}

export function siteOrigin(request: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  return `${proto}://${host}`;
}

export async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;
  const from = process.env.ORDER_NOTIFY_EMAIL_FROM ?? "onboarding@resend.dev";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) })
  });
}

async function postJson(url: string | undefined, payload: unknown) {
  if (!url) return;
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export type AdminNotice = {
  channel: "chat" | "doc-comment" | "order";
  title: string;
  fields: Array<[string, string]>;
  message: string;
  link: string;
  replyTo?: string;
};

export async function notifyAdmin(notice: AdminNotice) {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.ORDER_NOTIFY_EMAIL_TO || "";
  const html = `
    <h2>${escapeHtml(notice.title)}</h2>
    ${notice.fields.map(([k, v]) => `<p><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</p>`).join("")}
    <blockquote style="border-left:4px solid #0B5FFF;padding:8px 12px;background:#f1f6ff;white-space:pre-wrap">${escapeHtml(notice.message)}</blockquote>
    <p><a href="${escapeHtml(notice.link)}">Mở trong Admin để trả lời →</a></p>`;
  const text = [`${notice.channel === "order" ? "🛒" : "💬"} ${notice.title}`, ...notice.fields.map(([k, v]) => `${k}: ${v}`), "", notice.message, "", notice.link].join("\n");

  const results = await Promise.allSettled([
    sendEmail(to, notice.title, html, isEmail(notice.replyTo) ? notice.replyTo : undefined),
    postJson(process.env.ORDER_WEBHOOK_URL, { channel: notice.channel, title: notice.title, fields: Object.fromEntries(notice.fields), message: notice.message, link: notice.link }),
    postJson(process.env.ZALO_WEBHOOK_URL, { text })
  ]);
  for (const r of results) if (r.status === "rejected") console.error("[notify] admin notice failed", r.reason);
}

// Báo cho khách (nếu họ để lại email) khi admin trả lời.
export async function notifyVisitorReply(to: string, opts: { name: string; question: string; reply: string; link: string; context: string }) {
  if (!isEmail(to)) return;
  const html = `
    <p>Chào ${escapeHtml(opts.name)},</p>
    <p>Mr Jay đã trả lời ${escapeHtml(opts.context)} của bạn:</p>
    <blockquote style="border-left:4px solid #94a3b8;padding:8px 12px;color:#475569;white-space:pre-wrap">${escapeHtml(opts.question)}</blockquote>
    <blockquote style="border-left:4px solid #0B5FFF;padding:8px 12px;background:#f1f6ff;white-space:pre-wrap">${escapeHtml(opts.reply)}</blockquote>
    <p><a href="${escapeHtml(opts.link)}">Xem và trả lời tiếp →</a></p>`;
  try {
    await sendEmail(to, "Mr Jay đã trả lời bạn", html);
  } catch (error) {
    console.error("[notify] visitor reply failed", error);
  }
}
