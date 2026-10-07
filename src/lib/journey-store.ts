import { promises as fs } from "fs";
import path from "path";
import type { ExperienceData, ExperienceItem } from "@/lib/content/types";
import { normalizeExperienceData } from "@/lib/content/normalizers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const journeyPath = path.join(process.cwd(), "src", "content", "experience", "experience.json");

type JourneyRow = {
  id: string;
  company: string;
  role_vi: string;
  role_en: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  equipment_tags: string[] | null;
  responsibilities_vi: string[] | null;
  responsibilities_en: string[] | null;
  problem_root_cause_action_vi: string[] | null;
  problem_root_cause_action_en: string[] | null;
  training_activities_vi: string[] | null;
  training_activities_en: string[] | null;
  achievements_vi: string[] | null;
  achievements_en: string[] | null;
  improvements_vi: string[] | null;
  improvements_en: string[] | null;
  images: Array<{ src?: string; description_vi?: string; description_en?: string }> | null;
  sort_order: number;
};

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function normalizePayload(data: ExperienceData): ExperienceData {
  return normalizeExperienceData({
    schemaVersion: 1,
    items: data.items ?? []
  });
}

function fromSupabaseRows(rows: JourneyRow[]): ExperienceData {
  return {
    schemaVersion: 1,
    items: rows
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((row) => ({
        id: row.id,
        company: row.company ?? "",
        role: {
          vi: row.role_vi ?? "",
          en: row.role_en ?? ""
        },
        startDate: row.start_date ?? "",
        endDate: row.end_date ?? "",
        isCurrent: Boolean(row.is_current),
        equipmentTags: Array.isArray(row.equipment_tags) ? row.equipment_tags : [],
        responsibilities: {
          vi: Array.isArray(row.responsibilities_vi) ? row.responsibilities_vi : [],
          en: Array.isArray(row.responsibilities_en) ? row.responsibilities_en : []
        },
        problemRootCauseAction: {
          vi: Array.isArray(row.problem_root_cause_action_vi) ? row.problem_root_cause_action_vi : [],
          en: Array.isArray(row.problem_root_cause_action_en) ? row.problem_root_cause_action_en : []
        },
        trainingActivities: {
          vi: Array.isArray(row.training_activities_vi) ? row.training_activities_vi : [],
          en: Array.isArray(row.training_activities_en) ? row.training_activities_en : []
        },
        achievements: {
          vi: Array.isArray(row.achievements_vi) ? row.achievements_vi : [],
          en: Array.isArray(row.achievements_en) ? row.achievements_en : []
        },
        improvements: {
          vi: Array.isArray(row.improvements_vi) ? row.improvements_vi : [],
          en: Array.isArray(row.improvements_en) ? row.improvements_en : []
        },
        images: Array.isArray(row.images)
          ? row.images.map((image) => ({
              src: image?.src ?? "",
              description: {
                vi: image?.description_vi ?? "",
                en: image?.description_en ?? ""
              }
            }))
          : []
      }))
  };
}

function toSupabaseRows(data: ExperienceData): JourneyRow[] {
  return data.items.map((item, index) => ({
    id: item.id,
    company: item.company,
    role_vi: item.role.vi,
    role_en: item.role.en,
    start_date: item.startDate,
    end_date: item.endDate,
    is_current: Boolean(item.isCurrent),
    equipment_tags: item.equipmentTags ?? [],
    responsibilities_vi: item.responsibilities.vi ?? [],
    responsibilities_en: item.responsibilities.en ?? [],
    problem_root_cause_action_vi: item.problemRootCauseAction.vi ?? [],
    problem_root_cause_action_en: item.problemRootCauseAction.en ?? [],
    training_activities_vi: item.trainingActivities.vi ?? [],
    training_activities_en: item.trainingActivities.en ?? [],
    achievements_vi: item.achievements.vi ?? [],
    achievements_en: item.achievements.en ?? [],
    improvements_vi: item.improvements.vi ?? [],
    improvements_en: item.improvements.en ?? [],
    images: (item.images ?? []).map((image) => ({
      src: image.src,
      description_vi: image.description.vi,
      description_en: image.description.en
    })),
    sort_order: index
  }));
}

async function readJourneyDataFromFile(): Promise<ExperienceData> {
  const raw = await fs.readFile(journeyPath, "utf-8");
  const parsed = JSON.parse(raw) as ExperienceData;
  return normalizePayload(parsed);
}

async function writeJourneyDataToFile(payload: ExperienceData) {
  await fs.writeFile(journeyPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export async function readJourneyData(): Promise<ExperienceData> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("career_journey")
      .select("id,company,role_vi,role_en,start_date,end_date,is_current,equipment_tags,responsibilities_vi,responsibilities_en,problem_root_cause_action_vi,problem_root_cause_action_en,training_activities_vi,training_activities_en,achievements_vi,achievements_en,improvements_vi,improvements_en,images,sort_order")
      .order("sort_order", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return fromSupabaseRows(data as JourneyRow[]);
    }
  }

  return readJourneyDataFromFile();
}

export async function writeJourneyData(data: ExperienceData) {
  const payload = normalizePayload(data);
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const rows = toSupabaseRows(payload);

    const { error: upsertError } = await supabase.from("career_journey").upsert(rows, { onConflict: "id" });

    if (upsertError) {
      if (isProductionRuntime()) {
        throw new Error(`Supabase write failed (career_journey upsert): ${upsertError.message}`);
      }
    }

    if (!upsertError) {
      const { data: existingRows, error: existingError } = await supabase.from("career_journey").select("id");

      if (existingError && isProductionRuntime()) {
        throw new Error(`Supabase read-after-write failed (career_journey select): ${existingError.message}`);
      }

      if (!existingError) {
        const keepIds = new Set(rows.map((row) => row.id));
        const staleIds = (existingRows ?? [])
          .map((row) => String(row.id ?? ""))
          .filter((id) => id && !keepIds.has(id));

        if (staleIds.length > 0) {
          const { error: deleteError } = await supabase.from("career_journey").delete().in("id", staleIds);

          if (deleteError && isProductionRuntime()) {
            throw new Error(`Supabase cleanup failed (career_journey delete): ${deleteError.message}`);
          }

          if (!deleteError) {
            return;
          }
        } else {
          return;
        }
      }
    }
  } else if (isProductionRuntime()) {
    throw new Error(
      "Supabase is not configured for server writes (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  await writeJourneyDataToFile(payload);
}
