import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShowcaseAdminEditor } from "@/components/admin/showcase-admin-editor";
import { ContentAdminEditor } from "@/components/admin/content-admin-editor";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(session)) {
    redirect("/admin/login");
  }

  return (
    <section className="space-y-6">
      <ShowcaseAdminEditor />
      <ContentAdminEditor />
    </section>
  );
}
