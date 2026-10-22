import { ProjectsView } from "@/components/portfolio/projects-view";
import { readProjectsData } from "@/lib/projects-store";

// Dự án: đọc Supabase ở server (nguồn duy nhất), giao diện ở components/portfolio/projects-view.tsx.
export const dynamic = "force-dynamic";

export default async function DuAnPage() {
  return <ProjectsView data={await readProjectsData()} />;
}
