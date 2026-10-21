"use client";

import Link from "next/link";
import { ModeSwitch } from "@/components/smt-workspace/workspace-chrome";
import { useT } from "@/components/smt/smt-charts";

// Trang chỉ admin xem được ở chế độ Thực tế (công việc, đánh giá kỹ sư là dữ liệu nội bộ).
export function AdminOnly({ next, what }: { next: string; what: { vi: string; en: string } }) {
  const t = useT();
  return (
    <section className="card mx-auto max-w-xl space-y-3 text-center">
      <p className="text-3xl" aria-hidden>
        🔒
      </p>
      <h1 className="text-xl font-bold">{t(`${what.vi} thực tế là dữ liệu nội bộ`, `Live ${what.en} are internal`)}</h1>
      <p className="muted text-sm">{t("Chuyển sang Demo để xem ví dụ đầy đủ với đội kỹ sư mô phỏng, hoặc đăng nhập admin.", "Switch to Demo to explore a full example with a simulated team, or sign in as admin.")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <ModeSwitch mode="live" liveAllowed />
        <Link href={`/admin/login?next=${encodeURIComponent(next)}`} className="btn-ghost">
          {t("Đăng nhập admin", "Admin sign-in")}
        </Link>
      </div>
    </section>
  );
}
