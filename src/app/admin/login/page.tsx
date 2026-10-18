import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (verifyAdminSessionToken(session)) {
    redirect("/admin");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <AdminLoginForm />
    </main>
  );
}
