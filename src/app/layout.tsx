import type { Metadata } from "next";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";

// Root layout chỉ chứa provider dùng chung (theme, ngôn ngữ).
// Header/footer riêng cho từng không gian nằm ở:
//   (portfolio)/layout.tsx  -> nhà tuyển dụng
//   (hub)/[hub]/layout.tsx  -> maker / người dùng dự án
//   admin/(protected)/layout.tsx -> CMS quản trị
export const metadata: Metadata = {
  title: {
    default: "Nguyễn Văn Thạnh (Mr Jay) | SMT Portfolio",
    template: "%s | Mr Jay"
  },
  description: "Portfolio & Technical Knowledge Base for SMT Engineering"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
