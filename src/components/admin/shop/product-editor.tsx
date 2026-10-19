"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, LocalizedInput, MediaUrlField, SortableList, uploadToStorage } from "@/components/admin/fields";
import { ProductCard } from "@/components/shop/product-card";
import { ShopProvider } from "@/components/shop/shop-provider";
import { DEFAULT_SHOP_SETTINGS } from "@/lib/shop/defaults";
import { PRODUCT_STATUS_LABEL, discountPercent, formatVnd, slugify, type ProductStatus, type ShopMedia, type ShopProduct, type ShopSettings } from "@/lib/shop/types";

const emptyText = { vi: "", en: "" };

function blankProduct(): ShopProduct {
  const now = new Date().toISOString();
  return {
    id: "",
    slug: "",
    status: "draft",
    category: "",
    name: { ...emptyText },
    summary: { ...emptyText },
    description: { ...emptyText },
    media: [],
    price: 0,
    compareAtPrice: 0,
    stock: null,
    stockNote: { ...emptyText },
    options: [],
    specs: [],
    tags: [],
    featured: false,
    badge: { ...emptyText },
    sortOrder: 0,
    soldCount: 0,
    createdAt: now,
    updatedAt: now
  };
}

// Ô nhập tiền: gõ số, hiển thị có dấu chấm ngăn cách hàng nghìn.
function MoneyInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <input
        value={value ? value.toLocaleString("vi-VN") : ""}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        inputMode="numeric"
        placeholder={placeholder ?? "0"}
        className="input pr-8 tabular-nums"
      />
      <span className="muted pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm">₫</span>
    </div>
  );
}

export function ProductEditor({ id }: { id: string | null }) {
  const router = useRouter();
  const [product, setProduct] = useState<ShopProduct>(blankProduct);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);
  const [loading, setLoading] = useState(Boolean(id));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Slug tự sinh theo tên cho tới khi admin tự sửa slug.
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/admin/shop/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { settings?: ShopSettings }) => {
        if (!d.settings) return;
        setSettings(d.settings);
        if (!id) setProduct((p) => (p.category ? p : { ...p, category: d.settings!.categories[0]?.id ?? "" }));
      })
      .catch(() => undefined);
    if (!id) return;
    fetch(`/api/admin/shop/products?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, data: (await r.json().catch(() => null)) as { product?: ShopProduct; message?: string } | null }))
      .then(({ ok, data }) => {
        if (ok && data?.product) setProduct(data.product);
        else setNotice({ type: "error", text: data?.message ?? "Không tìm thấy sản phẩm." });
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Rời trang khi chưa lưu -> trình duyệt hỏi lại.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (patch: Partial<ShopProduct>) => {
    setProduct((p) => {
      const next = { ...p, ...patch };
      if (!slugTouched && patch.name) next.slug = slugify(patch.name.vi || patch.name.en);
      return next;
    });
    setDirty(true);
  };

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setNotice(null);
    const list = Array.from(files);
    setUploading(list.length);
    const urls: string[] = [];
    for (const file of list) {
      try {
        urls.push(await uploadToStorage(file, "shop"));
      } catch (err) {
        setNotice({ type: "error", text: err instanceof Error ? err.message : "Upload thất bại." });
        break;
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (urls.length) {
      setProduct((p) => ({ ...p, media: [...p.media, ...urls.map((url) => ({ url }))] }));
      setDirty(true);
    }
  }

  async function save(openAfter = false) {
    // Mở tab trước khi chờ server (mở sau await sẽ bị trình duyệt chặn popup).
    const preview = openAfter ? window.open("about:blank", "_blank") : null;
    setSaving(true);
    setNotice(null);
    const res = await fetch("/api/admin/shop/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: { ...product, id: product.id || undefined } }) });
    const data = (await res.json().catch(() => null)) as { product?: ShopProduct; message?: string } | null;
    setSaving(false);
    if (!res.ok || !data?.product) {
      preview?.close();
      return setNotice({ type: "error", text: data?.message ?? "Lưu thất bại." });
    }
    setProduct(data.product);
    setDirty(false);
    setSlugTouched(true);
    setNotice({
      type: "success",
      text: data.product.status === "published" ? "Đã lưu. Sản phẩm đang hiển thị trên cửa hàng." : `Đã lưu (trạng thái: ${PRODUCT_STATUS_LABEL[data.product.status]}, khách chưa thấy).`
    });
    if (!id) router.replace(`/admin/shop/products/${data.product.id}`);
    if (preview) preview.location.href = `/shop/san-pham/${data.product.slug}`;
  }

  const off = discountPercent(product);
  const previewProduct = useMemo(() => ({ ...product, slug: product.slug || "xem-truoc" }), [product]);

  if (loading) return <p className="card muted text-sm">Đang tải sản phẩm...</p>;

  return (
    <section className="space-y-4 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/shop/products" className="muted text-sm hover:text-brand-600">
            ← Danh sách sản phẩm
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-brand-600 dark:text-brand-300">{id ? product.name.vi || "Sửa sản phẩm" : "Đăng sản phẩm mới"}</h1>
        </div>
        {id && product.slug && (
          <a href={`/shop/san-pham/${product.slug}`} target="_blank" rel="noreferrer" className="btn-ghost">
            ↗ Xem trên cửa hàng
          </a>
        )}
      </div>

      {notice && (
        <p className={`rounded-lg border px-4 py-2.5 text-sm ${notice.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`} role="status">
          {notice.text}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="card space-y-4">
            <h2 className="font-semibold">📝 Thông tin cơ bản</h2>
            <LocalizedInput label="Tên sản phẩm *" value={product.name} onChange={(name) => update({ name })} />
            <Field label="Đường dẫn" hint={`Link sản phẩm: /shop/san-pham/${product.slug || "..."} · tự tạo theo tên, có thể sửa.`}>
              <input
                value={product.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  update({ slug: e.target.value });
                }}
                onBlur={(e) => update({ slug: slugify(e.target.value) })}
                className="input font-mono"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Danh mục" hint="Thêm / đổi tên danh mục trong Cài đặt cửa hàng.">
                <select value={product.category} onChange={(e) => update({ category: e.target.value })} className="input">
                  <option value="">(Không phân loại)</option>
                  {settings.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label.vi}
                    </option>
                  ))}
                </select>
              </Field>
              <LocalizedInput label="Nhãn trên ảnh" value={product.badge} onChange={(badge) => update({ badge })} hint="Vd: Bán chạy, Mới, Hàng đặt. Để trống nếu không cần." />
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Trạng thái</p>
              <div className="flex flex-wrap gap-2">
                {(["published", "draft", "hidden"] as ProductStatus[]).map((s) => (
                  <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 ${product.status === s ? "border-brand-600" : ""}`} style={product.status === s ? undefined : { borderColor: "var(--border)" }}>
                    <input type="radio" name="status" checked={product.status === s} onChange={() => update({ status: s })} />
                    <span>
                      <b>{PRODUCT_STATUS_LABEL[s]}</b>
                      <span className="muted block text-xs">{s === "published" ? "Khách thấy & mua được" : s === "draft" ? "Đang soạn, chỉ admin thấy" : "Ngừng bán tạm thời"}</span>
                    </span>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={product.featured} onChange={(e) => update({ featured: e.target.checked })} />
                ⭐ Hiện ở mục “Sản phẩm nổi bật” đầu trang cửa hàng
              </label>
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">🖼 Ảnh / video trưng bày</h2>
                <p className="muted text-xs">Ảnh đầu tiên là ảnh đại diện. Nhiều ảnh sẽ tự chuyển như slideshow. Dán link YouTube / Google Drive cũng được.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading > 0} className="btn-ghost">
                  {uploading > 0 ? `Đang upload (${uploading})...` : "⬆ Upload nhiều ảnh"}
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => (uploadFiles(e.target.files), (e.currentTarget.value = ""))} />
              </div>
            </div>
            <SortableList
              items={product.media}
              onChange={(media) => update({ media })}
              createItem={(): ShopMedia => ({ url: "" })}
              addLabel="+ Thêm ảnh / video bằng link"
              itemTitle={(m, i) => (i === 0 ? "Ảnh đại diện" : m.url.split("/").pop()?.slice(0, 60) || "Ảnh mới")}
              renderItem={(m, set) => <MediaUrlField value={m.url} kind={m.kind} onChange={(url) => set({ ...m, url })} onKindChange={(kind) => set({ ...m, kind })} uploadFolder="shop" label="Link ảnh / video" previewClassName="aspect-[4/3]" />}
            />
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">💰 Giá & tồn kho</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Giá bán" hint={product.price ? formatVnd(product.price) : "Để 0 = hiện “Liên hệ báo giá”"}>
                <MoneyInput value={product.price} onChange={(price) => update({ price })} />
              </Field>
              <Field label="Giá gốc (gạch ngang)" hint={off > 0 ? `Hiện nhãn giảm ${off}%` : "Cao hơn giá bán thì hiện % giảm"}>
                <MoneyInput value={product.compareAtPrice} onChange={(compareAtPrice) => update({ compareAtPrice })} />
              </Field>
              <Field label="Tồn kho" hint="Để trống = không giới hạn (làm theo đơn). Tự trừ khi có đơn, cộng lại khi huỷ.">
                <input
                  value={product.stock === null ? "" : String(product.stock)}
                  onChange={(e) => update({ stock: e.target.value.trim() === "" ? null : Number(e.target.value.replace(/\D/g, "")) || 0 })}
                  inputMode="numeric"
                  placeholder="∞ không giới hạn"
                  className="input tabular-nums"
                />
              </Field>
            </div>
            <LocalizedInput label="Ghi chú tình trạng hàng" value={product.stockNote} onChange={(stockNote) => update({ stockNote })} hint="Vd: Có sẵn, giao trong 24h · Làm theo đơn 3–5 ngày." />
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">📄 Mô tả</h2>
            <LocalizedInput label="Mô tả ngắn (hiện trên thẻ sản phẩm)" value={product.summary} onChange={(summary) => update({ summary })} multiline />
            <LocalizedInput
              label="Mô tả chi tiết (Markdown)"
              value={product.description}
              onChange={(description) => update({ description })}
              multiline
              hint="Hỗ trợ ## Tiêu đề, - gạch đầu dòng, **in đậm**, ![ảnh](link), link YouTube đứng riêng 1 dòng sẽ tự nhúng video."
            />
          </div>

          <div className="card space-y-4">
            <div>
              <h2 className="font-semibold">🎨 Phân loại khách được chọn</h2>
              <p className="muted text-xs">Vd: Màu → Đen, Trắng · Vật liệu → PLA, PETG. Cùng giá; khách chọn khi đặt hàng.</p>
            </div>
            <SortableList
              items={product.options}
              onChange={(options) => update({ options })}
              createItem={() => ({ name: { ...emptyText }, values: [] })}
              addLabel="+ Thêm phân loại"
              itemTitle={(o) => o.name.vi || "Phân loại mới"}
              renderItem={(o, set) => (
                <div className="space-y-2">
                  <LocalizedInput label="Tên phân loại" value={o.name} onChange={(name) => set({ ...o, name })} />
                  <Field label="Các lựa chọn" hint="Cách nhau bằng dấu phẩy, lựa chọn đầu là mặc định.">
                    <input
                      key={o.values.join("|")}
                      defaultValue={o.values.join(", ")}
                      onBlur={(e) => set({ ...o, values: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
                      placeholder="Đen, Trắng, Xanh"
                      className="input"
                    />
                  </Field>
                </div>
              )}
            />
          </div>

          <div className="card space-y-4">
            <h2 className="font-semibold">📐 Thông số kỹ thuật</h2>
            <SortableList
              items={product.specs}
              onChange={(specs) => update({ specs })}
              createItem={() => ({ label: { ...emptyText }, value: "" })}
              addLabel="+ Thêm thông số"
              itemTitle={(s) => s.label.vi || "Thông số mới"}
              renderItem={(s, set) => (
                <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
                  <LocalizedInput label="Tên thông số" value={s.label} onChange={(label) => set({ ...s, label })} />
                  <Field label="Giá trị">
                    <input value={s.value} onChange={(e) => set({ ...s, value: e.target.value })} placeholder="Vd: 420 × 300 mm" className="input" />
                  </Field>
                </div>
              )}
            />
            <Field label="Tag (tìm kiếm)" hint="Cách nhau bằng dấu phẩy. Khách gõ tag trong ô tìm kiếm vẫn ra sản phẩm.">
              <input
                defaultValue={product.tags.join(", ")}
                key={product.id || "new"}
                onBlur={(e) => update({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                placeholder="SMT, PETG, Jig"
                className="input"
              />
            </Field>
          </div>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <p className="eyebrow">Xem trước trên cửa hàng</p>
          {/* Bản xem trước chỉ để nhìn, không bấm được (tránh thêm nhầm vào giỏ). */}
          <div className="pointer-events-none select-none" aria-hidden>
            <ShopProvider settings={settings}>
              <ProductCard product={previewProduct} interval={3} />
            </ShopProvider>
          </div>
          <p className="muted text-xs">Slideshow tự chuyển mỗi {Math.max(3, settings.slideInterval - 1)} giây trên cửa hàng.</p>
        </aside>
      </div>

      <div className="glass fixed inset-x-0 bottom-0 z-30 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-end gap-2 px-4 py-3 lg:pl-[270px]">
          <span className={`mr-auto text-sm ${dirty ? "text-amber-600" : "muted"}`}>{dirty ? "● Có thay đổi chưa lưu" : product.id ? "Đã lưu" : "Sản phẩm mới"}</span>
          <button type="button" onClick={() => save(true)} disabled={saving} className="btn-ghost">
            Lưu & xem
          </button>
          <button type="button" onClick={() => save(false)} disabled={saving} className="btn-primary px-6">
            {saving ? "Đang lưu..." : "💾 Lưu sản phẩm"}
          </button>
        </div>
      </div>
    </section>
  );
}
