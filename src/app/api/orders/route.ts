import { NextResponse } from "next/server";
import { createOrder } from "@/lib/order-store";
import { notifyNewOrder } from "@/lib/order-notifier";
import { readShowcaseData } from "@/lib/showcase-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const customerName = String(body?.customerName ?? "").trim();
  const contact = String(body?.contact ?? "").trim();
  const note = String(body?.note ?? "").trim();
  const categoryRaw = String(body?.category ?? "other");
  const category = categoryRaw === "3d" || categoryRaw === "display" ? categoryRaw : "other";
  const productId = String(body?.productId ?? "").trim() || undefined;
  const address = String(body?.address ?? "").trim() || undefined;
  const quantity = Number(body?.quantity ?? 1);
  const rawLineItems = Array.isArray(body?.lineItems) ? body.lineItems : [];

  if (!customerName || !contact || !note) {
    return NextResponse.json({ message: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }

  const showcase = await readShowcaseData();
  const productMap = new Map(showcase.items.map((item) => [item.id, item]));

  const lineItems = rawLineItems
    .map((line) => {
      const lineProductId = String(line?.productId ?? "").trim();
      const lineQtyRaw = Number(line?.quantity ?? 1);
      const lineQty = Number.isFinite(lineQtyRaw) ? Math.max(1, Math.floor(lineQtyRaw)) : 1;
      const product = productMap.get(lineProductId);
      if (!lineProductId || !product) return null;

      return {
        productId: lineProductId,
        productName: product.name.vi,
        quantity: lineQty,
        unitPrice: product.salePrice,
        lineTotal: product.salePrice * lineQty
      };
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line));

  if (lineItems.length === 0) {
    return NextResponse.json({ message: "Vui lòng chọn ít nhất 1 sản phẩm." }, { status: 400 });
  }

  const guessedCategory =
    lineItems.length === 1
      ? (productMap.get(lineItems[0].productId)?.category ?? category)
      : "other";

  const order = await createOrder({
    customerName,
    contact,
    category: guessedCategory,
    productId,
    quantity,
    lineItems,
    address,
    note
  });

  notifyNewOrder(order).catch(() => {
    // Do not block order creation when notification channels fail.
  });

  return NextResponse.json({ ok: true, orderId: order.id });
}
