import { promises as fs } from "fs";
import path from "path";
import type { ProjectItem, ProjectsData } from "@/lib/content/types";
import { normalizeProjectsData } from "@/lib/content/normalizers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const projectsPath = path.join(process.cwd(), "src", "content", "projects", "projects.json");

type ProjectRow = {
  id: string;
  slug: string;
  title_vi: string;
  title_en: string;
  category: "3d-jig" | "app-software" | "smt-improvement" | "ai-iot";
  status: "ongoing" | "completed";
  summary_vi: string;
  summary_en: string;
  objective_vi: string;
  objective_en: string;
  description_vi: string;
  description_en: string;
  equipment_tags: string[] | null;
  gallery: string[] | null;
  attachments: Array<{ file_url?: string; label_vi?: string; label_en?: string }> | null;
  lessons_learned_vi: string[] | null;
  lessons_learned_en: string[] | null;
  sort_order: number;
};

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function normalizePayload(data: ProjectsData): ProjectsData {
  return normalizeProjectsData({
    schemaVersion: 1,
    items: data.items ?? []
  });
}

function fromSupabaseRows(rows: ProjectRow[]): ProjectsData {
  return {
    schemaVersion: 1,
    items: rows
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        title: {
          vi: row.title_vi ?? "",
          en: row.title_en ?? ""
        },
        category: row.category,
        status: row.status,
        summary: {
          vi: row.summary_vi ?? "",
          en: row.summary_en ?? ""
        },
        objective: {
          vi: row.objective_vi ?? "",
          en: row.objective_en ?? ""
        },
        description: {
          vi: row.description_vi ?? "",
          en: row.description_en ?? ""
        },
        equipmentTags: Array.isArray(row.equipment_tags) ? row.equipment_tags : [],
        gallery: Array.isArray(row.gallery) ? row.gallery : [],
        attachments: Array.isArray(row.attachments)
          ? row.attachments.map((attachment) => ({
              fileUrl: attachment?.file_url ?? "",
              label: {
                vi: attachment?.label_vi ?? "",
                en: attachment?.label_en ?? ""
              }
            }))
          : [],
        lessonsLearned: {
          vi: Array.isArray(row.lessons_learned_vi) ? row.lessons_learned_vi : [],
          en: Array.isArray(row.lessons_learned_en) ? row.lessons_learned_en : []
        }
      }))
  };
}

function toSupabaseRows(data: ProjectsData): ProjectRow[] {
  return data.items.map((item, index) => ({
    id: item.id,
    slug: item.slug,
    title_vi: item.title.vi,
    title_en: item.title.en,
    category: item.category,
    status: item.status,
    summary_vi: item.summary.vi,
    summary_en: item.summary.en,
    objective_vi: item.objective.vi,
    objective_en: item.objective.en,
    description_vi: item.description.vi,
    description_en: item.description.en,
    equipment_tags: item.equipmentTags ?? [],
    gallery: item.gallery ?? [],
    attachments: (item.attachments ?? []).map((attachment) => ({
      file_url: attachment.fileUrl,
      label_vi: attachment.label.vi,
      label_en: attachment.label.en
    })),
    lessons_learned_vi: item.lessonsLearned.vi ?? [],
    lessons_learned_en: item.lessonsLearned.en ?? [],
    sort_order: index
  }));
}

async function readProjectsDataFromFile(): Promise<ProjectsData> {
  const raw = await fs.readFile(projectsPath, "utf-8");
  const parsed = JSON.parse(raw) as ProjectsData;
  return normalizePayload(parsed);
}

async function writeProjectsDataToFile(payload: ProjectsData) {
  await fs.writeFile(projectsPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function normalizeProjectItem(item: ProjectItem): ProjectItem {
  return normalizePayload({ schemaVersion: 1, items: [item] }).items[0];
}

function toProjectRow(item: ProjectItem, sortOrder: number): ProjectRow {
  return {
    id: item.id,
    slug: item.slug,
    title_vi: item.title.vi,
    title_en: item.title.en,
    category: item.category,
    status: item.status,
    summary_vi: item.summary.vi,
    summary_en: item.summary.en,
    objective_vi: item.objective.vi,
    objective_en: item.objective.en,
    description_vi: item.description.vi,
    description_en: item.description.en,
    equipment_tags: item.equipmentTags ?? [],
    gallery: item.gallery ?? [],
    attachments: (item.attachments ?? []).map((attachment) => ({
      file_url: attachment.fileUrl,
      label_vi: attachment.label.vi,
      label_en: attachment.label.en
    })),
    lessons_learned_vi: item.lessonsLearned.vi ?? [],
    lessons_learned_en: item.lessonsLearned.en ?? [],
    sort_order: sortOrder
  };
}

export async function readProjectsData(): Promise<ProjectsData> {
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("projects")
      .select("id,slug,title_vi,title_en,category,status,summary_vi,summary_en,objective_vi,objective_en,description_vi,description_en,equipment_tags,gallery,attachments,lessons_learned_vi,lessons_learned_en,sort_order")
      .order("sort_order", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return fromSupabaseRows(data as ProjectRow[]);
    }
  }

  return readProjectsDataFromFile();
}

export async function writeProjectsData(data: ProjectsData) {
  const payload = normalizePayload(data);
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const rows = toSupabaseRows(payload);

    const { error: upsertError } = await supabase.from("projects").upsert(rows, { onConflict: "id" });

    if (upsertError) {
      if (isProductionRuntime()) {
        throw new Error(`Supabase write failed (projects upsert): ${upsertError.message}`);
      }
    }

    if (!upsertError) {
      const { data: existingRows, error: existingError } = await supabase.from("projects").select("id");

      if (existingError && isProductionRuntime()) {
        throw new Error(`Supabase read-after-write failed (projects select): ${existingError.message}`);
      }

      if (!existingError) {
        const keepIds = new Set(rows.map((row) => row.id));
        const staleIds = (existingRows ?? [])
          .map((row) => String(row.id ?? ""))
          .filter((id) => id && !keepIds.has(id));

        if (staleIds.length > 0) {
          const { error: deleteError } = await supabase.from("projects").delete().in("id", staleIds);

          if (deleteError && isProductionRuntime()) {
            throw new Error(`Supabase cleanup failed (projects delete): ${deleteError.message}`);
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

  await writeProjectsDataToFile(payload);
}

export async function upsertProjectItem(item: ProjectItem) {
  const normalized = normalizeProjectItem(item);
  const supabase = getSupabaseServerClient();

  if (supabase) {
    const { data: existingRow } = await supabase
      .from("projects")
      .select("sort_order")
      .eq("id", normalized.id)
      .maybeSingle();

    let sortOrder = Number(existingRow?.sort_order ?? -1);
    if (sortOrder < 0) {
      const { data: maxRows } = await supabase
        .from("projects")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      sortOrder = Number(maxRows?.[0]?.sort_order ?? -1) + 1;
    }

    const row = toProjectRow(normalized, sortOrder);
    const { error } = await supabase.from("projects").upsert(row, { onConflict: "id" });

    if (error && isProductionRuntime()) {
      throw new Error(`Supabase row upsert failed (projects): ${error.message}`);
    }

    if (!error) return;
  } else if (isProductionRuntime()) {
    throw new Error("Supabase is not configured for server writes (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  }

  const current = await readProjectsDataFromFile();
  const index = current.items.findIndex((it) => it.id === normalized.id);
  if (index >= 0) {
    current.items[index] = normalized;
  } else {
    current.items.push(normalized);
  }

  await writeProjectsDataToFile(normalizePayload(current));
}

export async function deleteProjectItem(id: string) {
  const targetId = id.trim();
  if (!targetId) return;

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("projects").delete().eq("id", targetId);
    if (error && isProductionRuntime()) {
      throw new Error(`Supabase row delete failed (projects): ${error.message}`);
    }
    if (!error) return;
  } else if (isProductionRuntime()) {
    throw new Error("Supabase is not configured for server writes (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  }

  const current = await readProjectsDataFromFile();
  current.items = current.items.filter((item) => item.id !== targetId);
  await writeProjectsDataToFile(normalizePayload(current));
}
