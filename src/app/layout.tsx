import type { Metadata } from "next";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { SiteHeader } from "@/components/site-header";
import { FloatingContact } from "@/components/floating-contact";

export const metadata: Metadata = {
  title: "Nguyễn Văn Thạnh (Mr Jay) | SMT Portfolio",
  description: "Portfolio & Technical Knowledge Base for SMT Engineering"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <SiteHeader />
            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
            <FloatingContact />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
