import { SmtMaintenance } from "@/components/smt/smt-notices";
import { ModuleOff } from "@/components/smt-workspace/module-off";
import { REPORT_MODULE } from "@/lib/smt/modules";
import Link from "next/link";
import { L } from "@/components/ui/localized";
import { REPORT_TEMPLATES } from "@/lib/smt/catalog";
import { workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Báo cáo" };

// 5 mẫu báo cáo SMT chạy trên dữ liệu của chế độ đang xem (demo / thực tế).
export default async function SmtReportsIndexPage() {
  const ctx = await workspaceContext();
  if (!ctx.open) return <SmtMaintenance />;
  const templates = REPORT_TEMPLATES.filter((r) => ctx.modules[REPORT_MODULE[r.slug]]);
  if (!templates.length) return <ModuleOff isAdmin={ctx.isAdmin} />;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          <L t={{ vi: "Báo cáo chuẩn", en: "Standard reports" }} />
        </h1>
        <p className="muted text-sm">
          <L t={{ vi: "Cùng bộ mẫu ở trang Tài liệu, nhưng chạy trên dữ liệu bạn đang xem. Xuất Excel hoặc in PDF ở từng báo cáo.", en: "Same templates as on the Documents page, running on the data you are viewing. Export Excel or print PDF from each report." }} />
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((r) => (
          <Link key={r.slug} href={`/smt/bao-cao/${r.slug}`} className="card block space-y-2 hover:border-brand-400">
            <p className="text-2xl" aria-hidden>
              {r.icon}
            </p>
            <p className="muted font-mono text-xs">
              {r.code} · {r.standard}
            </p>
            <h2 className="font-semibold">
              <L t={r.title} />
            </h2>
            <p className="muted text-sm">
              <L t={r.summary} />
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
