import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { getAdminUsername } from "@/lib/admin-guard";

export const metadata = { title: "Tài khoản" };

export default async function AdminAccountPage() {
  const username = (await getAdminUsername()) ?? "admin";
  return <ChangePasswordForm username={username} />;
}
