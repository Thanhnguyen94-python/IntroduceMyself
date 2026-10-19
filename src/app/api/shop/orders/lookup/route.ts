import { NextResponse } from "next/server";
import { isStorageAvailable } from "@/lib/data/table-store";
import { cleanText, clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { findOrderForCustomer, toPublicOrder } from "@/lib/shop/orders";

export const dynamic = "force-dynamic";

// POST {code, token?} hoặc {code, phone}: khách xem đơn của mình. Dùng POST để SĐT không nằm trên URL.
export async function POST(request: Request) {
  if (!isStorageAvailable()) return NextResponse.json({ message: "Tra cứu tạm thời chưa khả dụng." }, { status: 503 });
  // Chặn dò mã đơn: 20 lần / 10 phút.
  if (!rateLimit(`order-lookup:${clientFingerprint(request)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ message: "Bạn tra cứu quá nhiều lần, thử lại sau ít phút." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const code = cleanText(body?.code, 20);
  if (!code) return NextResponse.json({ message: "Vui lòng nhập mã đơn." }, { status: 400 });

  const order = await findOrderForCustomer(code, { token: cleanText(body?.token, 100) || undefined, phone: cleanText(body?.phone, 20) || undefined }).catch(() => null);
  if (!order) return NextResponse.json({ message: "Không tìm thấy đơn với mã và số điện thoại này." }, { status: 404 });
  return NextResponse.json({ order: toPublicOrder(order) });
}
