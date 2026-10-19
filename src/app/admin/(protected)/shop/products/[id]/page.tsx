import { ProductEditor } from "@/components/admin/shop/product-editor";

export const metadata = { title: "Sửa sản phẩm" };

// /admin/shop/products/new -> đăng sản phẩm mới; /admin/shop/products/<id> -> sửa.
export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditor id={id === "new" ? null : decodeURIComponent(id)} />;
}
