import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { deleteRows, getRow, insertRow, selectRows, updateRows } from "@/lib/data/table-store";
import { applyStock, listProducts, readShopSettings, ShopValidationError } from "@/lib/shop/store";
import {
  ACTIVE_ORDER_STATUSES,
  isInStock,
  productImage,
  shippingFeeFor,
  type OrderEvent,
  type OrderLine,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
  type PublicOrder,
  type ShopOrder
} from "@/lib/shop/types";

type OrderRow = {
  id: string;
  code: string;
  access_token: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  items: OrderLine[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  admin_note: string;
  history: OrderEvent[];
  stock_applied: boolean;
  visitor_id: string | null;
  created_at: string;
  updated_at: string;
};

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

function fromRow(row: OrderRow): ShopOrder {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email ?? "",
    address: row.address ?? "",
    note: row.note ?? "",
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    total: row.total,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    adminNote: row.admin_note ?? "",
    history: Array.isArray(row.history) ? row.history : [],
    stockApplied: Boolean(row.stock_applied),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at
  };
}

export function toPublicOrder(order: ShopOrder): PublicOrder {
  // adminNote là ghi chú nội bộ; ghi chú theo từng bước (vd mã vận đơn) thì khách được xem.
  const { adminNote: _note, stockApplied: _stock, id: _id, ...rest } = order;
  return rest;
}

// 0912 345 678 / +84 912... / 84912... -> 0912345678
export function normalizePhone(input: string) {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+84")) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith("84") && digits.length >= 11) digits = `0${digits.slice(2)}`;
  return digits.replace(/\D/g, "");
}

export function isValidPhone(phone: string) {
  return /^0\d{9,10}$/.test(phone);
}

// Mã đơn dễ đọc qua điện thoại: MJ + ngày + 4 ký tự (bỏ 0/O/1/I dễ nhầm).
function newOrderCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(4);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const d = new Date(Date.now() + 7 * 3600_000); // giờ Việt Nam
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `MJ${ymd}-${suffix}`;
}

export type CreateOrderInput = {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  paymentMethod: PaymentMethod;
  items: Array<{ productId: string; quantity: number; options?: Record<string, string> }>;
  visitorId?: string | null;
};

export async function createOrder(input: CreateOrderInput) {
  const [products, settings] = await Promise.all([listProducts({ publishedOnly: true }), readShopSettings()]);
  const byId = new Map(products.map((p) => [p.id, p]));

  if (input.paymentMethod === "bank" && !settings.payment.bank.enabled) throw new ShopValidationError("Cửa hàng chưa nhận chuyển khoản.");
  if (input.paymentMethod === "cod" && !settings.payment.cod) throw new ShopValidationError("Cửa hàng chưa nhận thanh toán khi giao hàng.");

  // Gộp các dòng trùng sản phẩm + tuỳ chọn; giá luôn lấy từ server.
  const merged = new Map<string, OrderLine>();
  for (const raw of input.items.slice(0, 30)) {
    const product = byId.get(String(raw.productId));
    if (!product) throw new ShopValidationError("Có sản phẩm trong giỏ không còn bán, vui lòng tải lại trang.");
    const quantity = Math.min(99, Math.max(1, Math.floor(Number(raw.quantity) || 1)));
    const options: Record<string, string> = {};
    for (const option of product.options) {
      const key = option.name.vi || option.name.en;
      const chosen = String(raw.options?.[key] ?? "");
      options[key] = option.values.includes(chosen) ? chosen : option.values[0];
    }
    const key = `${product.id}|${JSON.stringify(options)}`;
    const prev = merged.get(key);
    const qty = (prev?.quantity ?? 0) + quantity;
    merged.set(key, {
      productId: product.id,
      slug: product.slug,
      name: product.name.vi || product.name.en,
      image: productImage(product),
      options,
      quantity: qty,
      unitPrice: product.price,
      lineTotal: qty * product.price
    });
  }
  const items = [...merged.values()];
  if (!items.length) throw new ShopValidationError("Giỏ hàng đang trống.");

  // Kiểm tra tồn kho theo tổng số lượng của từng sản phẩm.
  const perProduct = new Map<string, number>();
  for (const line of items) perProduct.set(line.productId, (perProduct.get(line.productId) ?? 0) + line.quantity);
  for (const [productId, qty] of perProduct) {
    const product = byId.get(productId)!;
    if (!isInStock(product)) throw new ShopValidationError(`"${product.name.vi}" đã hết hàng.`);
    if (product.stock !== null && product.stock < qty) throw new ShopValidationError(`"${product.name.vi}" chỉ còn ${product.stock} sản phẩm.`);
  }

  const subtotal = items.reduce((sum, line) => sum + line.lineTotal, 0);
  const shippingFee = shippingFeeFor(subtotal, settings);
  const token = randomBytes(24).toString("base64url");
  const now = new Date().toISOString();

  let row: OrderRow | null = null;
  for (let attempt = 0; attempt < 3 && !row; attempt += 1) {
    try {
      row = await insertRow("shop_orders", {
        code: newOrderCode(),
        access_token: sha(token),
        status: "pending" as OrderStatus,
        customer_name: input.customerName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        note: input.note,
        items,
        subtotal,
        shipping_fee: shippingFee,
        total: subtotal + shippingFee,
        payment_method: input.paymentMethod,
        payment_status: "unpaid" as PaymentStatus,
        admin_note: "",
        history: [{ at: now, status: "pending", by: "customer" }] as OrderEvent[],
        stock_applied: true,
        visitor_id: input.visitorId ?? null,
        updated_at: now
      }) as unknown as OrderRow;
    } catch (error) {
      // Trùng mã đơn (rất hiếm) -> thử mã khác.
      if (attempt === 2 || !/duplicate|unique/i.test(String(error))) throw error;
    }
  }

  await applyStock([...perProduct].map(([productId, quantity]) => ({ productId, quantity })), -1);
  return { order: fromRow(row!), token };
}

export async function getOrderByCode(code: string) {
  const rows = await selectRows<OrderRow>("shop_orders", { eq: { code: code.trim().toUpperCase() }, limit: 1 });
  return rows[0] ?? null;
}

// Khách xem đơn bằng mã bí mật (lưu trên máy lúc đặt) hoặc bằng số điện thoại đã đặt.
export async function findOrderForCustomer(code: string, proof: { token?: string; phone?: string }) {
  const row = await getOrderByCode(code);
  if (!row) return null;
  if (proof.token) {
    const a = Buffer.from(sha(proof.token));
    const b = Buffer.from(row.access_token);
    if (a.length === b.length && timingSafeEqual(a, b)) return fromRow(row);
  }
  if (proof.phone && normalizePhone(proof.phone) === row.phone) return fromRow(row);
  return null;
}

export async function listOrders(opts: { status?: OrderStatus; since?: string; limit?: number } = {}) {
  const rows = await selectRows<OrderRow>("shop_orders", {
    ...(opts.status ? { eq: { status: opts.status } } : {}),
    ...(opts.since ? { gte: ["created_at", opts.since] as [string, string] } : {}),
    order: ["created_at", "desc"],
    limit: opts.limit ?? 2000
  });
  return rows.map(fromRow);
}

export async function getOrder(id: string) {
  const row = await getRow<OrderRow>("shop_orders", id);
  return row ? fromRow(row) : null;
}

// Đổi trạng thái / thanh toán / ghi chú. Huỷ hoặc hoàn trả -> cộng lại kho; mở lại đơn -> trừ kho lần nữa.
export async function updateOrder(id: string, patch: { status?: OrderStatus; paymentStatus?: PaymentStatus; adminNote?: string; eventNote?: string }) {
  const current = await getOrder(id);
  if (!current) return null;
  const now = new Date().toISOString();
  const row: Record<string, unknown> = { updated_at: now };
  let stockApplied = current.stockApplied;

  if (patch.status && patch.status !== current.status) {
    const willBeActive = ACTIVE_ORDER_STATUSES.includes(patch.status) || patch.status === "completed";
    const lines = current.items.map((line) => ({ productId: line.productId, quantity: line.quantity }));
    if (!willBeActive && stockApplied) {
      await applyStock(lines, 1);
      stockApplied = false;
    } else if (willBeActive && !stockApplied) {
      await applyStock(lines, -1);
      stockApplied = true;
    }
    row.status = patch.status;
    row.stock_applied = stockApplied;
    row.history = [...current.history, { at: now, status: patch.status, by: "admin", ...(patch.eventNote ? { note: patch.eventNote.slice(0, 300) } : {}) }];
  }
  if (patch.paymentStatus) row.payment_status = patch.paymentStatus;
  if (typeof patch.adminNote === "string") row.admin_note = patch.adminNote.slice(0, 2000);

  await updateRows("shop_orders", { id }, row);
  return getOrder(id);
}

export async function deleteOrder(id: string) {
  const current = await getOrder(id);
  if (current?.stockApplied) await applyStock(current.items.map((l) => ({ productId: l.productId, quantity: l.quantity })), 1);
  await deleteRows("shop_orders", { id });
}
