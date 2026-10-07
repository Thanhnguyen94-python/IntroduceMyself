import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ManagementDashboardV2 } from "@/components/admin/management-dashboard-v2";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(session)) {
    redirect("/admin/login");
  }

  return <ManagementDashboardV2 />;
}
