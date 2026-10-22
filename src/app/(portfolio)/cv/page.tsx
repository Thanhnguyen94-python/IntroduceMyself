import { CvBuilder } from "@/components/portfolio/cv-builder";
import { readJourneyData } from "@/lib/journey-store";
import { readSiteData } from "@/lib/site-store";

// CV: đọc Supabase ở server (nguồn duy nhất) – sửa Hành trình / Thông tin trong Admin là CV cập nhật theo.
// CV luôn hiện đầy đủ liên hệ (đúng thiết kế ở Admin → Quyền riêng tư: "Trang /cv vẫn hiển thị đầy đủ").
export const dynamic = "force-dynamic";

export default async function CvPage() {
  const [site, exp] = await Promise.all([readSiteData(), readJourneyData()]);
  return <CvBuilder site={site} exp={exp} />;
}
