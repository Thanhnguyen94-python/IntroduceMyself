"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ShowcaseData, ShowcaseItem } from "@/lib/showcase-types";

function emptyProduct(index: number): ShowcaseItem {
  return {
    id: `sp-${String(index + 1).padStart(2, "0")}`,
    category: "3d",
    name: { vi: "", en: "" },
    description: { vi: "", en: "" },
    image: "",
    gallery: [],
    oldPrice: 0,
    salePrice: 0,
    stockText: { vi: "", en: "" },
    tags: []
  };
}

export function ShowcaseAdminEditor() {
  const [data, setData] = useState<ShowcaseData>({ schemaVersion: 1, items: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchData() {
      const response = await fetch("/api/showcase/products", { cache: "no-store" });
      const payload = (await response.json()) as ShowcaseData;
      setData(payload);

      setLoading(false);
    }

    fetchData();
  }, []);

  const totalSaleValue = useMemo(
    () => data.items.reduce((total, item) => total + (Number(item.salePrice) || 0), 0),
    [data.items]
  );

  const updateItem = (index: number, patch: Partial<ShowcaseItem>) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    }));
  };

  const removeItem = (index: number) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const addItem = () => {
    setData((prev) => ({
      ...prev,
      items: [...prev.items, emptyProduct(prev.items.length)]
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/admin/showcase/products", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      setMessage("Lưu thất bại. Kiểm tra đăng nhập admin.");
      setSaving(false);
      return;
    }

    setMessage("Đã lưu thành công. Trang công khai sẽ hiển thị dữ liệu mới.");
    setSaving(false);
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  if (loading) {
    return <section className="card">Đang tải dữ liệu quản trị...</section>;
  }

  return (
    <section className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Admin - Quản lý Sản phẩm trưng bày</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Tổng giá sale hiện tại: {new Intl.NumberFormat("vi-VN").format(totalSaleValue)} VNĐ
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/orders" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
            Dashboard đơn hàng
          </Link>
          <button onClick={addItem} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
            + Thêm sản phẩm
          </button>
          <button onClick={logout} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
            Đăng xuất
          </button>
        </div>
      </div>

      {data.items.map((item, index) => (
        <article key={`${item.id}-${index}`} className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Sản phẩm #{index + 1}</h2>
            <button onClick={() => removeItem(index)} className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white">
              Xóa
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={item.id}
              onChange={(e) => updateItem(index, { id: e.target.value })}
              placeholder="ID"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <select
              value={item.category}
              onChange={(e) => updateItem(index, { category: e.target.value as "3d" | "display" })}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <option value="3d">In 3D</option>
              <option value="display">Sản phẩm trưng bày</option>
            </select>
            <input
              value={item.name.vi}
              onChange={(e) => updateItem(index, { name: { ...item.name, vi: e.target.value } })}
              placeholder="Tên sản phẩm (VI)"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <input
              value={item.name.en}
              onChange={(e) => updateItem(index, { name: { ...item.name, en: e.target.value } })}
              placeholder="Product name (EN)"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <textarea
              rows={3}
              value={item.description.vi}
              onChange={(e) => updateItem(index, { description: { ...item.description, vi: e.target.value } })}
              placeholder="Mô tả (VI)"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <textarea
              rows={3}
              value={item.description.en}
              onChange={(e) => updateItem(index, { description: { ...item.description, en: e.target.value } })}
              placeholder="Description (EN)"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <input
              value={item.image}
              onChange={(e) => updateItem(index, { image: e.target.value })}
              placeholder="Đường dẫn hình ảnh (/assets/images/...)"
              className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <input
              value={(item.gallery ?? []).join(", ")}
              onChange={(e) =>
                updateItem(index, {
                  gallery: e.target.value
                    .split(",")
                    .map((img) => img.trim())
                    .filter(Boolean)
                })
              }
              placeholder="Bộ ảnh phụ (URL, ngăn cách bằng dấu phẩy)"
              className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <input
              type="number"
              value={item.oldPrice}
              onChange={(e) => updateItem(index, { oldPrice: Number(e.target.value) })}
              placeholder="Giá gốc"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <input
              type="number"
              value={item.salePrice}
              onChange={(e) => updateItem(index, { salePrice: Number(e.target.value) })}
              placeholder="Giá sale"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <input
              value={item.stockText.vi}
              onChange={(e) => updateItem(index, { stockText: { ...item.stockText, vi: e.target.value } })}
              placeholder="Trạng thái kho (VI)"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <input
              value={item.stockText.en}
              onChange={(e) => updateItem(index, { stockText: { ...item.stockText, en: e.target.value } })}
              placeholder="Stock status (EN)"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <input
              value={item.tags.join(", ")}
              onChange={(e) => updateItem(index, { tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })}
              placeholder="Tags, ngăn cách bằng dấu phẩy"
              className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
          </div>
        </article>
      ))}

      <div className="card space-y-2">
        <button
          disabled={saving}
          onClick={saveAll}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu toàn bộ thay đổi"}
        </button>
        {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      </div>
    </section>
  );
}
