import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrdersDashboard } from "@/components/admin/orders-dashboard";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export default async function AdminOrdersPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(session)) {
    redirect("/admin/login");
  }

  return <OrdersDashboard />;
}
