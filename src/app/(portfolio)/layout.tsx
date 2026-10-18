import { PortfolioHeader } from "@/components/layout/portfolio-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FloatingContact } from "@/components/floating-contact";

// Không gian Portfolio: hành trình, kỹ năng, case study. Không có link nạp firmware.
export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortfolioHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <SiteFooter variant="portfolio" />
      <FloatingContact />
    </>
  );
}
