"use client";

import { useEffect, useState } from "react";
import { Field, LocalizedInput, MediaUrlField, SortableList } from "@/components/admin/fields";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { formatVnd, slugify, vietQrUrl, type ShopMedia, type ShopSettings } from "@/lib/shop/types";

const emptyText = { vi: "", en: "" };

// Mã ngân hàng VietQR hay dùng (gõ tên khác cũng được, xem danh sách đầy đủ ở vietqr.io).
const BANKS = [
  ["VCB", "Vietcombank"],
  ["TCB", "Techcombank"],
  ["MB", "MB Bank"],
  ["ACB", "ACB"],
  ["BIDV", "BIDV"],
  ["ICB", "VietinBank"],
  ["VBA", "Agribank"],
  ["VPB", "VPBank"],
  ["TPB", "TPBank"],
  ["STB", "Sacombank"],
  ["VIB", "VIB"],
  ["HDB", "HDBank"],
  ["SHB", "SHB"],
  ["MSB", "MSB"],
  ["OCB", "OCB"],
  ["CAKE", "CAKE by VPBank"],
  ["TIMO", "Timo"]
];

export function ShopSettingsEditor() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/shop/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { settings?: ShopSettings; message?: string }) => (d.settings ? setSettings(d.settings) : setNotice({ type: "error", text: d.message ?? "Không tải được cài đặt." })))
      .catch(() => setNotice({ type: "error", text: "Không tải được cài đặt." }));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!settings) return <p className="card muted text-sm">{notice?.text ?? "Đang tải cài đặt..."}</p>;

  const s = settings;
  const update = (patch: Partial<ShopSettings>) => {
    setSettings({ ...s, ...patch });
    setDirty(true);
  };

  async function save() {
    setSaving(true);
    setNotice(null);
    const res = await fetch("/api/admin/shop/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: s }) });
    const data = (await res.json().catch(() => null)) as { settings?: ShopSettings; message?: string } | null;
    setSaving(false);
    if (!res.ok || !data?.settings) return setNotice({ type: "error", text: data?.message ?? "Lưu thất bại." });
    setSettings(data.settings);
    setDirty(false);
    setNotice({ type: "success", text: "Đã lưu. Cửa hàng cập nhật ngay." });
  }

  const qrPreview = vietQrUrl({ ...s.payment.bank, enabled: true }, 100000, "MJTEST");

  return (
    <section className="space-y-5 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Cài đặt cửa hàng</h1>
          <p className="muted text-sm">Tên, ảnh bìa, danh mục, phí ship, thanh toán, liên hệ hiển thị trên /shop.</p>
        </div>
        <a href="/shop" target="_blank" rel="noreferrer" className="btn-ghost">
          ↗ Xem cửa hàng
        </a>
      </div>

      {notice && (
        <p className={`rounded-lg border px-4 py-2.5 text-sm ${notice.type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`} role="status">
          {notice.text}
        </p>
      )}

      <div className="card space-y-4">
        <h2 className="font-semibold">🏪 Thông tin cửa hàng</h2>
        <Field label="Tên cửa hàng">
          <input value={s.name} onChange={(e) => update({ name: e.target.value })} className="input" />
        </Field>
        <LocalizedInput label="Khẩu hiệu (tiêu đề lớn đầu trang)" value={s.tagline} onChange={(tagline) => update({ tagline })} />
        <LocalizedInput label="Giới thiệu ngắn" value={s.intro} onChange={(intro) => update({ intro })} multiline />
        <LocalizedInput label="Thanh thông báo trên cùng" value={s.announcement} onChange={(announcement) => update({ announcement })} hint="Vd: 🎉 Giảm 10% đến hết tháng 10 · Để trống để ẩn." />
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">🖼 Slideshow ảnh bìa</h2>
          <label className="flex items-center gap-2 text-sm">
            Tự chuyển sau
            <input type="number" min={2} max={30} value={s.slideInterval} onChange={(e) => update({ slideInterval: Number(e.target.value) || 5 })} className="input w-20" />
            giây
          </label>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <SortableList
            items={s.heroMedia}
            onChange={(heroMedia) => update({ heroMedia })}
            createItem={(): ShopMedia => ({ url: "" })}
            addLabel="+ Thêm ảnh / video bìa"
            itemTitle={(m, i) => `Slide ${i + 1}`}
            renderItem={(m, set) => <MediaUrlField value={m.url} kind={m.kind} onChange={(url) => set({ ...m, url })} onKindChange={(kind) => set({ ...m, kind })} uploadFolder="shop" previewClassName="aspect-[4/3]" />}
          />
          {s.heroMedia.length > 0 && (
            <div>
              <p className="muted mb-2 text-xs">Xem trước</p>
              <MediaCarousel items={s.heroMedia} interval={s.slideInterval} alt={s.name} />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card space-y-3">
          <div>
            <h2 className="font-semibold">🗂 Danh mục</h2>
            <p className="muted text-xs">Hiện thành các nút lọc trên cửa hàng (chỉ hiện danh mục có sản phẩm).</p>
          </div>
          <SortableList
            items={s.categories}
            onChange={(categories) => update({ categories })}
            createItem={() => ({ id: "", icon: "📦", label: { ...emptyText } })}
            addLabel="+ Thêm danh mục"
            itemTitle={(c) => `${c.icon} ${c.label.vi || "Danh mục mới"}`}
            renderItem={(c, set) => (
              <div className="space-y-2">
                <div className="grid grid-cols-[72px_1fr] gap-2">
                  <Field label="Icon">
                    <input value={c.icon} onChange={(e) => set({ ...c, icon: e.target.value })} className="input text-center" />
                  </Field>
                  <Field label="Mã (không dấu)" hint="Sản phẩm gắn với mã này; đổi mã thì sản phẩm cũ mất danh mục.">
                    <input value={c.id} onChange={(e) => set({ ...c, id: slugify(e.target.value) })} placeholder="tu-sinh-theo-ten" className="input font-mono" />
                  </Field>
                </div>
                <LocalizedInput label="Tên danh mục" value={c.label} onChange={(label) => set({ ...c, label, id: c.id || slugify(label.vi) })} />
              </div>
            )}
          />
        </div>

        <div className="card space-y-3">
          <div>
            <h2 className="font-semibold">✨ Điểm nổi bật</h2>
            <p className="muted text-xs">Các ô ngắn dưới ảnh bìa (bảo hành, giao hàng, tư vấn...).</p>
          </div>
          <SortableList
            items={s.highlights}
            onChange={(highlights) => update({ highlights })}
            createItem={() => ({ icon: "✅", title: { ...emptyText }, text: { ...emptyText } })}
            addLabel="+ Thêm ô"
            itemTitle={(h) => `${h.icon} ${h.title.vi || "Ô mới"}`}
            renderItem={(h, set) => (
              <div className="space-y-2">
                <Field label="Icon">
                  <input value={h.icon} onChange={(e) => set({ ...h, icon: e.target.value })} className="input w-20 text-center" />
                </Field>
                <LocalizedInput label="Tiêu đề" value={h.title} onChange={(title) => set({ ...h, title })} />
                <LocalizedInput label="Mô tả" value={h.text} onChange={(text) => set({ ...h, text })} />
              </div>
            )}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card space-y-3">
          <h2 className="font-semibold">🚚 Vận chuyển</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phí ship mặc định (₫)" hint={s.shipping.fee ? formatVnd(s.shipping.fee) : "0 = miễn phí"}>
              <input value={s.shipping.fee || ""} onChange={(e) => update({ shipping: { ...s.shipping, fee: Number(e.target.value.replace(/\D/g, "")) || 0 } })} inputMode="numeric" className="input" placeholder="0" />
            </Field>
            <Field label="Miễn phí ship từ (₫)" hint={s.shipping.freeFrom ? `Đơn từ ${formatVnd(s.shipping.freeFrom)}` : "0 = không áp dụng"}>
              <input value={s.shipping.freeFrom || ""} onChange={(e) => update({ shipping: { ...s.shipping, freeFrom: Number(e.target.value.replace(/\D/g, "")) || 0 } })} inputMode="numeric" className="input" placeholder="0" />
            </Field>
          </div>
          <LocalizedInput label="Ghi chú vận chuyển" value={s.shipping.note} onChange={(note) => update({ shipping: { ...s.shipping, note } })} />
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">📞 Liên hệ</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Điện thoại">
              <input value={s.contact.phone} onChange={(e) => update({ contact: { ...s.contact, phone: e.target.value } })} className="input" inputMode="tel" />
            </Field>
            <Field label="Zalo (SĐT)">
              <input value={s.contact.zalo} onChange={(e) => update({ contact: { ...s.contact, zalo: e.target.value } })} className="input" inputMode="tel" />
            </Field>
            <Field label="Email">
              <input value={s.contact.email} onChange={(e) => update({ contact: { ...s.contact, email: e.target.value } })} className="input" type="email" />
            </Field>
          </div>
          <p className="muted text-xs">Hiện ở chân trang cửa hàng và trang theo dõi đơn. Để trống mục nào thì ẩn mục đó.</p>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">💳 Thanh toán</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.payment.cod} onChange={(e) => update({ payment: { ...s.payment, cod: e.target.checked } })} />
          💵 Nhận thanh toán khi giao hàng (COD)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.payment.bank.enabled} onChange={(e) => update({ payment: { ...s.payment, bank: { ...s.payment.bank, enabled: e.target.checked } } })} />
          🏦 Nhận chuyển khoản (khách thấy mã VietQR có sẵn số tiền + mã đơn)
        </label>
        {!s.payment.cod && !s.payment.bank.enabled && <p className="text-sm text-red-600">Cần bật ít nhất 1 cách thanh toán, nếu không khách sẽ không đặt được hàng.</p>}
        {s.payment.bank.enabled && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Ngân hàng (mã VietQR)">
                <input list="vietqr-banks" value={s.payment.bank.bankId} onChange={(e) => update({ payment: { ...s.payment, bank: { ...s.payment.bank, bankId: e.target.value.trim() } } })} placeholder="VCB" className="input" />
                <datalist id="vietqr-banks">
                  {BANKS.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </datalist>
              </Field>
              <Field label="Số tài khoản">
                <input value={s.payment.bank.accountNo} onChange={(e) => update({ payment: { ...s.payment, bank: { ...s.payment.bank, accountNo: e.target.value } } })} className="input font-mono" inputMode="numeric" />
              </Field>
              <Field label="Tên chủ tài khoản">
                <input value={s.payment.bank.accountName} onChange={(e) => update({ payment: { ...s.payment, bank: { ...s.payment.bank, accountName: e.target.value.toUpperCase() } } })} placeholder="NGUYEN VAN A" className="input uppercase" />
              </Field>
            </div>
            <div className="text-center">
              {qrPreview ? (
                <>
                  <img src={qrPreview} alt="Mã QR thử" className="mx-auto w-44 rounded-xl border bg-white p-1" style={{ borderColor: "var(--border)" }} />
                  <p className="muted mt-1 text-xs">QR thử 100.000₫ · quét bằng app ngân hàng để kiểm tra đúng tên (không cần chuyển).</p>
                </>
              ) : (
                <p className="muted text-xs">Nhập mã ngân hàng + số tài khoản để xem QR thử.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">📜 Chính sách (chân trang)</h2>
        <LocalizedInput label="Đổi trả, bảo hành, đặt cọc..." value={s.policies} onChange={(policies) => update({ policies })} multiline hint="Mỗi dòng một ý." />
      </div>

      <div className="glass fixed inset-x-0 bottom-0 z-30 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-2 px-4 py-3 lg:pl-[270px]">
          <span className={`mr-auto text-sm ${dirty ? "text-amber-600" : "muted"}`}>{dirty ? "● Có thay đổi chưa lưu" : "Đã lưu"}</span>
          <button type="button" onClick={save} disabled={saving || !dirty} className="btn-primary px-6">
            {saving ? "Đang lưu..." : "💾 Lưu cài đặt"}
          </button>
        </div>
      </div>
    </section>
  );
}
