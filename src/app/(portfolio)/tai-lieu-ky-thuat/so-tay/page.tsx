import type { Metadata } from "next";
import Link from "next/link";
import { L } from "@/components/ui/localized";
import { HandbookBrowser, type HandbookCard } from "@/components/handbook/handbook-browser";
import { HandbookAdminPreview, HandbookMaintenance } from "@/components/handbook/handbook-notices";
import { handbookAccess } from "@/lib/handbook/gate";
import { listEntries } from "@/lib/handbook/store";

// /tai-lieu-ky-thuat/so-tay: sổ tay tra cứu tham số SMT (Cpk, FPY, Area ratio, TAL, MSL…).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sổ tay tra cứu SMT",
  description: "Ý nghĩa, công thức và ngưỡng tham khảo các tham số SMT: Cpk, FPY, DPMO, OEE, Area ratio, profile Reflow, MSL, ESD, IPC-A-610…"
};

export default async function HandbookPage() {
  const access = await handbookAccess();
  if (!access.open) return <HandbookMaintenance />;
  const { entries } = await listEntries({ publishedOnly: true });
  // Trang danh sách không cần nội dung chi tiết -> bỏ body cho nhẹ.
  const cards: HandbookCard[] = entries.map(({ body: _body, ...card }) => card);

  return (
    <section className="space-y-6">
      {access.adminPreview && <HandbookAdminPreview />}
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/tai-lieu-ky-thuat" className="text-brand-600 dark:text-brand-300">
          <L t={{ vi: "Tài liệu", en: "Documents" }} />
        </Link>
        <span className="muted">/</span>
        <span className="font-medium">
          <L t={{ vi: "Sổ tay SMT", en: "SMT handbook" }} />
        </span>
      </nav>
      <header className="card space-y-2">
        <p className="eyebrow">SMT Field Handbook</p>
        <h1 className="section-title">
          <L t={{ vi: "Sổ tay tra cứu cho kỹ sư SMT", en: "SMT engineer's field handbook" }} />
        </h1>
        <p className="muted max-w-3xl">
          <L
            t={{
              vi: `${entries.length} tham số & khái niệm hay gặp trên line SMT: ý nghĩa, công thức, ngưỡng tham khảo, lưu ý thực tế và máy tính nhanh. Ngưỡng chỉ để tham khảo – luôn đối chiếu spec khách hàng và bản tiêu chuẩn đang áp dụng.`,
              en: `${entries.length} parameters & concepts you meet on an SMT line: meaning, formula, reference limits, practical notes and quick calculators. Limits are for reference — always check customer specs and the standard revision in use.`
            }}
          />
        </p>
      </header>
      <HandbookBrowser entries={cards} />
    </section>
  );
}
