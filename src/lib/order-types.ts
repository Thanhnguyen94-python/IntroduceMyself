export type OrderStatus = "pending" | "confirmed" | "packing" | "shipped" | "returned" | "cancelled";

export type OrderLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type CustomerOrder = {
  id: string;
  createdAt: string;
  customerName: string;
  contact: string;
  category: "3d" | "display" | "other";
  productId?: string;
  quantity: number;
  lineItems?: OrderLineItem[];
  totalAmount?: number;
  address?: string;
  note: string;
  status: OrderStatus;
  adminNote?: string;
};

export type OrdersData = {
  schemaVersion: number;
  items: CustomerOrder[];
};
