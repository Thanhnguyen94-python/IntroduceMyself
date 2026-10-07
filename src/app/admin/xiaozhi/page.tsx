import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { XiaozhiConnector } from "@/components/admin/xiaozhi-connector";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export default async function AdminXiaozhiPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(session)) {
    redirect("/admin/login");
  }

  return <XiaozhiConnector />;
}
