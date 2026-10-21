"use client";

import type { DeleteTarget } from "@/lib/smt/delete-grants";

// Gọi API xoá. Nếu server trả need_grant (trợ lý chưa được admin cho phép), hỏi lý do và gửi yêu cầu xin quyền.
// Trả về: "deleted" | "requested" (đã gửi yêu cầu) | "cancelled" (người dùng bỏ qua). Lỗi khác -> throw.
export async function deleteOrRequest(url: string, target: DeleteTarget): Promise<"deleted" | "requested" | "cancelled"> {
  const res = await fetch(url, { method: "DELETE" });
  const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
  if (res.ok) return "deleted";
  if (data.code !== "need_grant") throw new Error(data.message || "Xoá thất bại.");
  const reason = window.prompt(`Bạn chưa có quyền xoá "${target.label}".\nNhập lý do để gửi yêu cầu cho quản lý duyệt (Huỷ = không gửi):`, "");
  if (reason === null) return "cancelled";
  const r = await fetch("/api/smt/delete-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, reason }) });
  const d = (await r.json().catch(() => ({}))) as { message?: string };
  if (!r.ok) throw new Error(d.message || "Gửi yêu cầu thất bại.");
  window.alert("Đã gửi yêu cầu xoá. Khi quản lý duyệt, dữ liệu sẽ được xoá ngay.");
  return "requested";
}
