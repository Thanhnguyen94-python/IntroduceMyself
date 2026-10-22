import { CvBuilder } from "@/components/portfolio/cv-builder";
import { readJourneyData } from "@/lib/journey-store";
import { readSiteData } from "@/lib/site-store";
import { toPublicSite } from "@/lib/site-public";

// CV: đọc Supabase ở server (nguồn duy nhất) – sửa Hành trình / Thông tin trong Admin là CV cập nhật theo.
// SĐT / ngày sinh chỉ có khi Admin → Quyền riêng tư cho phép.
export const dynamic = "force-dynamic";

export default async function CvPage() {
  const [site, exp] = await Promise.all([readSiteData(), readJourneyData()]);
  return <CvBuilder site={toPublicSite(site)} exp={exp} />;
}
