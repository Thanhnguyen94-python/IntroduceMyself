import { JourneyView } from "@/components/portfolio/journey-view";
import { readJourneyData } from "@/lib/journey-store";

// Hành trình: đọc Supabase ở server (nguồn duy nhất), giao diện ở components/portfolio/journey-view.tsx.
export const dynamic = "force-dynamic";

export default async function HanhTrinhPage() {
  return <JourneyView data={await readJourneyData()} />;
}
