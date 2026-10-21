import { redirect } from "next/navigation";
import { SmtLoginForm } from "@/components/smt-workspace/account-forms";
import { currentActor } from "@/lib/smt/accounts";
import { safeSmtNext } from "@/lib/smt/safe-next";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đăng nhập" };

// Luôn mở, kể cả khi SMT Workspace đang tắt với khách (để đội nội bộ vào được).
export default async function SmtLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeSmtNext((await searchParams).next);
  if (await currentActor()) redirect(next);
  return <SmtLoginForm next={next} />;
}
