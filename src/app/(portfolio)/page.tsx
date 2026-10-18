import { HomeSections, type HomeData } from "@/components/home/home-sections";
import { MaintenanceNotice } from "@/components/hub/maintenance-notice";
import { readSiteData } from "@/lib/site-store";
import { readJourneyData } from "@/lib/journey-store";
import { readProjectsData } from "@/lib/projects-store";
import { readHomeLayout } from "@/lib/home-layout-store";
import { readSiteVisibility } from "@/lib/site-visibility-store";
import { isPageEnabled } from "@/lib/site-visibility-types";
import { computeCareerStats } from "@/lib/portfolio-stats";

// Trang chủ Portfolio: các khối và thứ tự lấy từ CMS (Admin → Bố cục trang chủ).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [site, journey, projects, layout, visibility] = await Promise.all([
    readSiteData(),
    readJourneyData(),
    readProjectsData(),
    readHomeLayout(),
    readSiteVisibility()
  ]);

  if (!isPageEnabled(visibility, "overview")) {
    return <MaintenanceNotice />;
  }

  const { workItems, ...stats } = computeCareerStats(journey.items);
  const featured = layout.featuredProjects.length
    ? layout.featuredProjects.map((slug) => projects.items.find((it) => it.slug === slug)).filter((it): it is NonNullable<typeof it> => Boolean(it))
    : projects.items.slice(0, 3);

  // Chỉ gửi xuống trình duyệt những trường được phép công khai (không chỉ ẩn trên giao diện).
  const showPhone = Boolean(site.privacy?.showPhone);
  const showPersonal = Boolean(site.privacy?.showPersonalInfo);
  const publicSite = {
    ...site,
    profile: {
      ...site.profile,
      phone: showPhone ? site.profile.phone : "",
      zaloPhone: showPhone ? site.profile.zaloPhone : "",
      birthDate: showPersonal ? site.profile.birthDate : "",
      hometown: showPersonal ? site.profile.hometown : ""
    }
  };

  const data: HomeData = { site: publicSite, stats, journey: workItems, caseStudies: featured };
  const order = layout.sections.filter((it) => it.enabled).map((it) => it.id);

  return <HomeSections order={order} data={data} />;
}
