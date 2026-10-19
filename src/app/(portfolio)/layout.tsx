import { PortfolioHeader } from "@/components/layout/portfolio-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { AnalyticsTracker } from "@/components/analytics-tracker";

// Không gian Portfolio: hành trình, kỹ năng, case study. Không có link nạp firmware.
export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortfolioHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <SiteFooter variant="portfolio" />
      {/* Box chat thay cho nút liên hệ nổi cũ (Email/CV/Zalo nằm ở chân khung chat). */}
      <ChatWidget variant="portfolio" />
      <AnalyticsTracker />
    </>
  );
}
