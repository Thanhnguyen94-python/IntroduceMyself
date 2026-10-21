import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

// Chỉ nhận đường dẫn nội bộ ("/smt/..."), chặn "//evil.com" hay "https://..." (open redirect).
function safeNext(value: string | string[] | undefined) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/admin";
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const next = safeNext((await searchParams).next);

  if (verifyAdminSessionToken(session)) {
    redirect(next);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <AdminLoginForm next={next} />
    </main>
  );
}
