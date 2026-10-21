"use client";

import Link from "next/link";
import { useT } from "@/components/smt/smt-charts";

// Trang thuộc nhóm nội dung đang tắt trong Phạm vi quản lý (Admin → Cài đặt SMT).
export function ModuleOff({ isAdmin }: { isAdmin: boolean }) {
  const t = useT();
  return (
    <section className="card mx-auto max-w-xl space-y-3 text-center">
      <p className="text-3xl" aria-hidden>
        🙈
      </p>
      <h1 className="text-xl font-bold">{t("Mục này đang được ẩn", "This section is hidden")}</h1>
      <p className="muted text-sm">{t("Phạm vi quản lý hiện tại không gồm nội dung này.", "The current management scope does not include this content.")}</p>
      {isAdmin && (
        <Link href="/admin/smt/settings#pham-vi" className="btn-primary inline-block">
          {t("Đổi phạm vi quản lý", "Change scope")}
        </Link>
      )}
    </section>
  );
}

// Dòng nhắc nhỏ cho admin: đang ẩn bớt nội dung.
export function ScopeNote({ isAdmin, hidden }: { isAdmin: boolean; hidden: string[] }) {
  const t = useT();
  if (!isAdmin || !hidden.length) return null;
  return (
    <p className="muted smt-no-print text-xs">
      🙈 {t("Đang ẩn theo Phạm vi quản lý", "Hidden by management scope")}: {hidden.join(", ")} ·{" "}
      <Link href="/admin/smt/settings#pham-vi" className="underline">
        {t("đổi", "change")}
      </Link>
    </p>
  );
}
