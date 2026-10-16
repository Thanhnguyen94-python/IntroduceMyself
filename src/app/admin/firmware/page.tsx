import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FirmwareAdmin } from "@/components/admin/firmware-admin";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export default async function AdminFirmwarePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(session)) {
    redirect("/admin/login");
  }

  return <FirmwareAdmin />;
}
