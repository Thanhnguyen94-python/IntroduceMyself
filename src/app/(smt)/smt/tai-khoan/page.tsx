import { redirect } from "next/navigation";
import { L } from "@/components/ui/localized";
import { ChangePasswordForm, LogoutButton } from "@/components/smt-workspace/account-forms";
import { currentAccount, currentActor } from "@/lib/smt/accounts";
import { ROLE_LABEL } from "@/lib/smt/permissions";
import { safeSmtNext } from "@/lib/smt/safe-next";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tài khoản" };

export default async function SmtAccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await currentActor();
  if (!actor) redirect("/smt/dang-nhap?next=/smt/tai-khoan");
  const sp = await searchParams;
  const account = await currentAccount();
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="card space-y-2">
        <h1 className="text-xl font-bold">{actor.name}</h1>
        <p className="muted text-sm">
          <L t={ROLE_LABEL[actor.role]} />
          {account && ` · ${account.username}`}
        </p>
        <LogoutButton admin={actor.role === "admin"} />
      </section>
      {/* Admin đổi mật khẩu ở Admin → Tài khoản như cũ. */}
      {account ? (
        <ChangePasswordForm first={sp.first === "1" || account.must_change_password} next={safeSmtNext(sp.next)} />
      ) : (
        <p className="muted text-sm">
          <L t={{ vi: "Bạn đang dùng tài khoản admin. Đổi mật khẩu ở Admin → Tài khoản.", en: "You are signed in as admin. Change the password in Admin → Account." }} />
        </p>
      )}
    </div>
  );
}
