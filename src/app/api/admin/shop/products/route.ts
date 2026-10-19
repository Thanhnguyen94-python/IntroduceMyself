import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { deleteProduct, getProduct, listProducts, patchProduct, reorderProducts, saveProduct, ShopValidationError } from "@/lib/shop/store";
import type { ProductStatus, ShopProduct } from "@/lib/shop/types";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ message: "Unauthorized" }, { status: 401 });
const fail = (error: unknown) =>
  NextResponse.json({ message: error instanceof Error ? error.message : "Thao tác thất bại." }, { status: error instanceof ShopValidationError ? 400 : 500 });

// GET: tất cả sản phẩm (kể cả nháp / ẩn). GET ?id=: 1 sản phẩm.
export async function GET(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const product = await getProduct(id);
      return product ? NextResponse.json({ product }) : NextResponse.json({ message: "Không tìm thấy sản phẩm." }, { status: 404 });
    }
    return NextResponse.json({ items: await listProducts() });
  } catch (error) {
    return fail(error);
  }
}

// POST {product}: tạo mới hoặc lưu sản phẩm (theo id).
export async function POST(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const body = (await request.json().catch(() => null)) as { product?: Partial<ShopProduct> } | null;
  if (!body?.product) return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, product: await saveProduct(body.product) });
  } catch (error) {
    return fail(error);
  }
}

// PATCH {id, status?, featured?, stock?}: sửa nhanh từ danh sách.  PATCH {order: [id...]}: sắp xếp.
export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const body = (await request.json().catch(() => null)) as { id?: string; status?: ProductStatus; featured?: boolean; stock?: number | null; order?: string[] } | null;
  try {
    if (Array.isArray(body?.order)) {
      await reorderProducts(body.order.map(String).slice(0, 1000));
      return NextResponse.json({ ok: true });
    }
    if (!body?.id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
    const status = body.status && ["published", "draft", "hidden"].includes(body.status) ? body.status : undefined;
    await patchProduct(body.id, { status, featured: body.featured, stock: body.stock });
    return NextResponse.json({ ok: true, product: await getProduct(body.id) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id." }, { status: 400 });
  try {
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
