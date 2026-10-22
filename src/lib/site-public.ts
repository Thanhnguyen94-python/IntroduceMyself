import type { SiteData } from "@/lib/content/types";

// Chỉ gửi xuống trình duyệt những trường được phép công khai (Admin → Quyền riêng tư), không chỉ ẩn trên giao diện.
export function toPublicSite(site: SiteData): SiteData {
  const showPhone = Boolean(site.privacy?.showPhone);
  const showPersonal = Boolean(site.privacy?.showPersonalInfo);
  return {
    ...site,
    profile: {
      ...site.profile,
      phone: showPhone ? site.profile.phone : "",
      zaloPhone: showPhone ? site.profile.zaloPhone : "",
      birthDate: showPersonal ? site.profile.birthDate : "",
      hometown: showPersonal ? site.profile.hometown : ""
    }
  };
}
