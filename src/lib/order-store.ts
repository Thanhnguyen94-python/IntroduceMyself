import { promises as fs } from "fs";
import path from "path";
import type { CustomerOrder, OrderLineItem, OrdersData, OrderStatus } from "@/lib/order-types";

const ordersPath = path.join(process.cwd(), "src", "content", "orders", "orders.json");

function generateOrderId() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ORD-${y}${m}${d}-${random}`;
}

async function readRaw(): Promise<OrdersData> {
  const raw = await fs.readFile(ordersPath, "utf-8");
  const parsed = JSON.parse(raw) as OrdersData;
  return {
    schemaVersion: parsed.schemaVersion ?? 1,
    items: Array.isArray(parsed.items) ? parsed.items : []
  };
}

async function writeRaw(data: OrdersData) {
  await fs.writeFile(ordersPath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export async function listOrders() {
  const data = await readRaw();
  return data.items
    .map((item) => {
      const normalizedLineItems = (item.lineItems ?? [])
        .filter((line) => line.productId)
        .map((line) => {
          const quantity = Number.isFinite(line.quantity) ? Math.max(1, Math.floor(line.quantity)) : 1;
          const unitPrice = Number.isFinite(line.unitPrice) ? Math.max(0, Math.round(line.unitPrice)) : 0;
          return {
            productId: line.productId,
            productName: line.productName ?? line.productId,
            quantity,
            unitPrice,
            lineTotal: unitPrice * quantity
          };
        });

      const legacyLineItem: OrderLineItem[] =
        normalizedLineItems.length > 0 || !item.productId
          ? []
          : [
              {
                productId: item.productId,
                productName: item.productId,
                quantity: Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1,
                unitPrice: 0,
                lineTotal: 0
              }
            ];

      const lineItems = normalizedLineItems.length > 0 ? normalizedLineItems : legacyLineItem;
      const totalAmount = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);

      return {
        ...item,
        lineItems,
        totalAmount,
        quantity:
          lineItems.length > 0
            ? lineItems.reduce((sum, line) => sum + line.quantity, 0)
            : Number.isFinite(item.quantity)
              ? Math.max(1, Math.floor(item.quantity))
              : 1
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createOrder(input: {
  customerName: string;
  contact: string;
  category: "3d" | "display" | "other";
  productId?: string;
  quantity: number;
  lineItems?: OrderLineItem[];
  address?: string;
  note: string;
}) {
  const data = await readRaw();

  const lineItems = (input.lineItems ?? [])
    .filter((line) => line.productId)
    .map((line) => {
      const quantity = Number.isFinite(line.quantity) ? Math.max(1, Math.floor(line.quantity)) : 1;
      const unitPrice = Number.isFinite(line.unitPrice) ? Math.max(0, Math.round(line.unitPrice)) : 0;

      return {
        productId: line.productId.trim(),
        productName: line.productName.trim(),
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity
      };
    });

  const totalAmount = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  const legacyProductId = lineItems[0]?.productId ?? input.productId?.trim() ?? undefined;
  const totalQuantity =
    lineItems.length > 0
      ? lineItems.reduce((sum, line) => sum + line.quantity, 0)
      : Number.isFinite(input.quantity)
        ? Math.max(1, Math.floor(input.quantity))
        : 1;

  const order: CustomerOrder = {
    id: generateOrderId(),
    createdAt: new Date().toISOString(),
    customerName: input.customerName.trim(),
    contact: input.contact.trim(),
    category: input.category,
    productId: legacyProductId,
    quantity: totalQuantity,
    lineItems,
    totalAmount,
    address: input.address?.trim() || undefined,
    note: input.note.trim(),
    status: "pending"
  };

  data.items.unshift(order);
  await writeRaw(data);
  return order;
}

export async function updateOrderStatus(input: {
  id: string;
  status: OrderStatus;
  adminNote?: string;
}) {
  const data = await readRaw();
  const idx = data.items.findIndex((item) => item.id === input.id);
  if (idx < 0) return null;

  data.items[idx] = {
    ...data.items[idx],
    status: input.status,
    adminNote: input.adminNote?.trim() || undefined
  };

  await writeRaw(data);
  return data.items[idx];
}
