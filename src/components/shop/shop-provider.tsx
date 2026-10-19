"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readStoredJson, writeStoredJson } from "@/lib/visitor-id";
import type { ShopSettings } from "@/lib/shop/types";

// Giỏ hàng lưu ở trình duyệt của khách (localStorage "mj_cart"); giá thật được tính lại ở server khi đặt.

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  options: Record<string, string>;
  maxQuantity: number | null;
};

type ShopContextValue = {
  settings: ShopSettings;
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  // after: "drawer" mở giỏ hàng, "toast" chỉ báo nhỏ, "none" im lặng (vd Mua ngay -> sang trang đặt hàng).
  add: (line: Omit<CartLine, "key" | "quantity">, quantity?: number, after?: "drawer" | "toast" | "none") => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
  toast: string;
};

const CART_KEY = "mj_cart";
const ShopContext = createContext<ShopContextValue | null>(null);

export const lineKey = (productId: string, options: Record<string, string>) =>
  `${productId}|${Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&")}`;

export function ShopProvider({ settings, children }: { settings: ShopSettings; children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const saved = readStoredJson<CartLine[]>(CART_KEY);
    if (Array.isArray(saved)) setLines(saved.filter((l) => l?.productId && l.quantity > 0));
    setReady(true);
    // Giỏ hàng đồng bộ giữa các tab đang mở.
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setLines(readStoredJson<CartLine[]>(CART_KEY) ?? []);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (ready) writeStoredJson(CART_KEY, lines);
  }, [lines, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const clamp = (qty: number, max: number | null) => Math.max(1, Math.min(max ?? 99, 99, Math.floor(qty) || 1));

  const add = useCallback<ShopContextValue["add"]>((line, quantity = 1, after = "drawer") => {
    const key = lineKey(line.productId, line.options);
    setLines((prev) => {
      const found = prev.find((l) => l.key === key);
      if (found) return prev.map((l) => (l.key === key ? { ...l, ...line, quantity: clamp(l.quantity + quantity, line.maxQuantity) } : l));
      return [...prev, { ...line, key, quantity: clamp(quantity, line.maxQuantity) }];
    });
    if (after === "toast") setToast(line.name);
    if (after === "drawer") setDrawerOpen(true);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: clamp(quantity, l.maxQuantity) } : l)));
  }, []);

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);
  const replace = useCallback((next: CartLine[]) => setLines(next), []);

  const value = useMemo<ShopContextValue>(
    () => ({
      settings,
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.quantity * l.price, 0),
      ready,
      drawerOpen,
      setDrawerOpen,
      add,
      setQuantity,
      remove,
      replace,
      clear,
      toast
    }),
    [settings, lines, ready, drawerOpen, add, setQuantity, remove, replace, clear, toast]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside <ShopProvider>");
  return ctx;
}

// Đơn đã đặt trên máy này (mã + mã bí mật để xem lại không cần nhập SĐT).
export type SavedOrder = { code: string; token: string; total: number; createdAt: string };
const ORDERS_KEY = "mj_orders";

export function readSavedOrders(): SavedOrder[] {
  const list = readStoredJson<SavedOrder[]>(ORDERS_KEY);
  return Array.isArray(list) ? list : [];
}

export function saveOrder(order: SavedOrder) {
  writeStoredJson(ORDERS_KEY, [order, ...readSavedOrders().filter((o) => o.code !== order.code)].slice(0, 20));
}
