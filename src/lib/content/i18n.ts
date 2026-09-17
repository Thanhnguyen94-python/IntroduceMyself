import type { Lang, LocalizedList, LocalizedText } from "@/lib/content/types";

export const DEFAULT_LANG: Lang = "vi";

export function pickText(text: LocalizedText, lang: Lang) {
  return text[lang] ?? text.vi;
}

export function pickList(list: LocalizedList, lang: Lang) {
  return list[lang] ?? list.vi;
}

export const ui = {
  nav: {
    vi: {
      overview: "Tổng Quan",
      journey: "Hành Trình",
      projects: "Dự Án",
      docs: "Tài Liệu Kỹ Thuật"
    },
    en: {
      overview: "Overview",
      journey: "Journey",
      projects: "Projects",
      docs: "Technical Docs"
    }
  },
  common: {
    vi: {
      downloadCv: "Tải CV PDF",
      quickContact: "Liên hệ nhanh",
      close: "Đóng",
      privateDoc: "Tài liệu riêng tư",
      requestAccess: "Nhập mật khẩu để xem"
    },
    en: {
      downloadCv: "Download CV PDF",
      quickContact: "Quick Contact",
      close: "Close",
      privateDoc: "Private Document",
      requestAccess: "Enter password to view"
    }
  }
};
