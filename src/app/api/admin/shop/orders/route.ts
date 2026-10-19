import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { siteOrigin } from "@/lib/notify";
import { deleteOrder, listOrders, updateOrder } from "@/lib/shop/orders";
import { readShopSettings } from "@/lib/shop/store";
import { emailOrderStatus } from "@/lib/shop/notify";
import { ORDER_STATUSES, type OrderStatus, type PaymentStatus } from "@/lib/shop/types";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ message: "Unauthorized" }, { status: 401 });

// GET: danh sách đơn. ?count=1 -> chỉ số đơn chờ xác nhận (huy hiệu menu Admin).
export async function GET(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const url = new URL(request.url);
  try {
    if (url.searchParams.get("count") === "1") {
      const pending = await listOrders({ status: "pending", limit: 500 });
      return NextResponse.json({ pending: pending.length });
    }
    return NextResponse.json({ items: await listOrders() });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Không đọc được đơn hàng.", items: [], pending: 0 });
  }
}

// PATCH {id, status?, paymentStatus?, adminNote?, eventNote?, notifyCustomer?}
export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    adminNote?: string;
    eventNote?: string;
    notifyCustomer?: boolean;
  } | null;
  if (!body?.id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  try {
    const status = body.status && ORDER_STATUSES.includes(body.status) ? body.status : undefined;
    const paymentStatus = body.paymentStatus === "paid" || body.paymentStatus === "unpaid" ? body.paymentStatus : undefined;
    const order = await updateOrder(body.id, { status, paymentStatus, adminNote: body.adminNote, eventNote: body.eventNote?.trim() });
    if (!order) return NextResponse.json({ message: "Không tìm thấy đơn." }, { status: 404 });
    let emailed = false;
    if (status && body.notifyCustomer && order.email) {
      await emailOrderStatus(order, await readShopSettings(), siteOrigin(request), body.eventNote?.trim());
      emailed = true;
    }
    return NextResponse.json({ ok: true, order, emailed });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Cập nhật thất bại." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  try {
    await deleteOrder(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Xoá thất bại." }, { status: 500 });
  }
}
