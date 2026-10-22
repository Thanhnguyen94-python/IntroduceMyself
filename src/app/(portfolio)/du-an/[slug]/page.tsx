import { ProjectDetailView } from "@/components/portfolio/project-detail-view";
import { readProjectsData } from "@/lib/projects-store";

// Chi tiết dự án: đọc Supabase ở server (nguồn duy nhất), giao diện ở components/portfolio/project-detail-view.tsx.
export const dynamic = "force-dynamic";

export default async function ProjectDetailPage() {
  return <ProjectDetailView data={await readProjectsData()} />;
}
