import Link from "next/link";
import { redirect } from "next/navigation";
import { L } from "@/components/ui/localized";
import { currentActor } from "@/lib/smt/accounts";
import { can } from "@/lib/smt/permissions";
import { workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";

// Nhập liệu SMT cho Admin + Trợ lý ngay trong /smt (trợ lý không vào được /admin).
// Luôn ghi vào dữ liệu THẬT, không phụ thuộc nút Demo / Thực tế.
export default async function DataEntryLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();
  if (!actor) redirect("/smt/dang-nhap?next=/smt/nhap-lieu");
  if (!can(actor, "data.write")) redirect("/smt");
  const { liveModules } = await workspaceContext();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
        <span>
          ✍️ <L t={{ vi: "Nhập liệu ghi vào DỮ LIỆU THỰC TẾ. Mỗi dòng lưu tên người nhập / sửa.", en: "Data entry writes LIVE data. Each row records who entered / edited it." }} />
        </span>
        {liveModules.quality && (
          <Link href="/smt/nhap-lieu/8d" className="chip">
            🧭 <L t={{ vi: "Báo cáo 8D", en: "8D reports" }} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
