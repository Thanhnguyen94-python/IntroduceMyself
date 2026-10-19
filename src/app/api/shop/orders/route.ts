import { NextResponse } from "next/server";
import { isStorageAvailable } from "@/lib/data/table-store";
import { cleanText, clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { isEmail, siteOrigin } from "@/lib/notify";
import { createOrder, isValidPhone, normalizePhone, toPublicOrder } from "@/lib/shop/orders";
import { readShopSettings, ShopValidationError } from "@/lib/shop/store";
import { emailOrderConfirmation, notifyNewOrder } from "@/lib/shop/notify";
import { shopAccess } from "@/lib/shop/gate";

export const dynamic = "force-dynamic";

// POST: khách đặt hàng. Giá, phí ship, tồn kho đều tính lại ở server (không tin giá gửi từ trình duyệt).
// Body: {customerName, phone, email?, address, note?, paymentMethod, items:[{productId, quantity, options}], visitorId?, website(honeypot)}
export async function POST(request: Request) {
  if (!isStorageAvailable()) return NextResponse.json({ message: "Cửa hàng tạm thời chưa nhận đơn online, vui lòng nhắn tin cho shop." }, { status: 503 });

  // Cửa hàng đang tắt: khách không đặt được (admin vẫn đặt thử được).
  if (!(await shopAccess()).open) return NextResponse.json({ message: "Cửa hàng đang tạm nghỉ, vui lòng quay lại sau." }, { status: 503 });

  const fp = clientFingerprint(request);
  if (!rateLimit(`order:${fp}`, 5, 10 * 60_000)) {
    return NextResponse.json({ message: "Bạn đặt nhiều đơn liên tiếp, đợi vài phút hoặc nhắn tin cho shop nhé." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  if (cleanText(body.website, 100)) return NextResponse.json({ ok: true, code: "", token: "" });

  const customerName = cleanText(body.customerName, 80);
  const phone = normalizePhone(cleanText(body.phone, 20));
  const email = cleanText(body.email, 120);
  const address = cleanText(body.address, 300);
  const note = cleanText(body.note, 1000);
  const paymentMethod = body.paymentMethod === "bank" ? "bank" : "cod";

  if (customerName.length < 2) return NextResponse.json({ message: "Vui lòng nhập họ tên." }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ message: "Số điện thoại chưa đúng (vd 0912 345 678)." }, { status: 400 });
  if (email && !isEmail(email)) return NextResponse.json({ message: "Email chưa đúng định dạng." }, { status: 400 });
  if (address.length < 8) return NextResponse.json({ message: "Vui lòng nhập địa chỉ nhận hàng đầy đủ." }, { status: 400 });

  const items = (Array.isArray(body.items) ? body.items : []).map((raw) => {
    const it = (raw ?? {}) as Record<string, unknown>;
    const options: Record<string, string> = {};
    if (it.options && typeof it.options === "object") {
      for (const [k, v] of Object.entries(it.options as Record<string, unknown>).slice(0, 5)) options[cleanText(k, 60)] = cleanText(v, 60);
    }
    return { productId: cleanText(it.productId, 80), quantity: Number(it.quantity), options };
  });

  try {
    const { order, token } = await createOrder({
      customerName,
      phone,
      email,
      address,
      note,
      paymentMethod,
      items,
      visitorId: cleanText(body.visitorId, 64) || null
    });
    const origin = siteOrigin(request);
    const settings = await readShopSettings();
    // Gửi thông báo nhưng không để lỗi email làm hỏng đơn.
    await Promise.allSettled([notifyNewOrder(order, origin), emailOrderConfirmation(order, settings, origin)]);
    return NextResponse.json({ ok: true, code: order.code, token, order: toPublicOrder(order) });
  } catch (error) {
    if (error instanceof ShopValidationError) return NextResponse.json({ message: error.message }, { status: 409 });
    console.error("[shop] create order failed", error);
    return NextResponse.json({ message: "Không tạo được đơn, vui lòng thử lại hoặc nhắn tin cho shop." }, { status: 500 });
  }
}
