import { Checkout } from "@/components/shop/checkout";
import { listProducts } from "@/lib/shop/store";
import { MaintenanceNotice } from "@/components/hub/maintenance-notice";
import { shopAccess } from "@/lib/shop/gate";

export const metadata = { title: "Đặt hàng", robots: { index: false } };

export default async function CheckoutPage() {
  if (!(await shopAccess()).open) return <MaintenanceNotice />;
  const products = await listProducts({ publishedOnly: true });
  return <Checkout products={products} />;
}
