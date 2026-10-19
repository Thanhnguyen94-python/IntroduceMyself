import { OrderDetail } from "@/components/shop/order-view";

export const metadata = { title: "Đơn hàng", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <OrderDetail code={decodeURIComponent(code).toUpperCase()} />;
}
