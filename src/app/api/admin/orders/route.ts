import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import { listOrders, updateOrderStatus } from "@/lib/order-store";
import type { OrderStatus } from "@/lib/order-types";

export const dynamic = "force-dynamic";

function isAuthorized(session?: string) {
  return verifyAdminSessionToken(session);
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!isAuthorized(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const items = await listOrders();
  return NextResponse.json({ schemaVersion: 1, items });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!isAuthorized(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const status = String(body?.status ?? "") as OrderStatus;
  const adminNote = String(body?.adminNote ?? "").trim();

  const allowed: OrderStatus[] = ["pending", "confirmed", "packing", "shipped", "returned", "cancelled"];
  if (!id || !allowed.includes(status)) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const updated = await updateOrderStatus({ id, status, adminNote });
  if (!updated) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: updated });
}
