import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { isAdminRequest } from "@/lib/admin-guard";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false }
};

// Mọi trang trong admin/(protected) đều phải đăng nhập. Trang /admin/login nằm ngoài group này.
// Các API /api/admin/* vẫn tự kiểm tra session riêng (không dựa vào layout).
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminRequest())) {
    redirect("/admin/login");
  }
  return <AdminShell>{children}</AdminShell>;
}
