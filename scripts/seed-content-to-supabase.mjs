import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

async function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function mapJourneyRows(data) {
  return (data.items ?? []).map((item, index) => ({
    id: item.id,
    company: item.company ?? "",
    role_vi: item.role?.vi ?? "",
    role_en: item.role?.en ?? "",
    start_date: item.startDate ?? "",
    end_date: item.endDate ?? "",
    is_current: Boolean(item.isCurrent),
    equipment_tags: item.equipmentTags ?? [],
    responsibilities_vi: item.responsibilities?.vi ?? [],
    responsibilities_en: item.responsibilities?.en ?? [],
    problem_root_cause_action_vi: item.problemRootCauseAction?.vi ?? [],
    problem_root_cause_action_en: item.problemRootCauseAction?.en ?? [],
    training_activities_vi: item.trainingActivities?.vi ?? [],
    training_activities_en: item.trainingActivities?.en ?? [],
    achievements_vi: item.achievements?.vi ?? [],
    achievements_en: item.achievements?.en ?? [],
    improvements_vi: item.improvements?.vi ?? [],
    improvements_en: item.improvements?.en ?? [],
    images: (item.images ?? []).map((image) => ({
      src: image?.src ?? "",
      description_vi: image?.description?.vi ?? "",
      description_en: image?.description?.en ?? ""
    })),
    sort_order: index
  }));
}

function mapProjectRows(data) {
  return (data.items ?? []).map((item, index) => ({
    id: item.id,
    slug: item.slug,
    title_vi: item.title?.vi ?? "",
    title_en: item.title?.en ?? "",
    category: item.category,
    status: item.status,
    summary_vi: Array.isArray(item.summary?.vi) ? item.summary.vi.join("\n") : (item.summary?.vi ?? ""),
    summary_en: Array.isArray(item.summary?.en) ? item.summary.en.join("\n") : (item.summary?.en ?? ""),
    objective_vi: Array.isArray(item.objective?.vi) ? item.objective.vi.join("\n") : (item.objective?.vi ?? ""),
    objective_en: Array.isArray(item.objective?.en) ? item.objective.en.join("\n") : (item.objective?.en ?? ""),
    description_vi: Array.isArray(item.description?.vi) ? item.description.vi.join("\n") : (item.description?.vi ?? ""),
    description_en: Array.isArray(item.description?.en) ? item.description.en.join("\n") : (item.description?.en ?? ""),
    equipment_tags: item.equipmentTags ?? [],
    gallery: item.gallery ?? [],
    attachments: (item.attachments ?? []).map((attachment) => ({
      file_url: attachment.fileUrl ?? "",
      label_vi: attachment.label?.vi ?? "",
      label_en: attachment.label?.en ?? ""
    })),
    lessons_learned_vi: item.lessonsLearned?.vi ?? [],
    lessons_learned_en: item.lessonsLearned?.en ?? [],
    sort_order: index
  }));
}

function mapShowcaseRows(data) {
  return (data.items ?? []).map((item, index) => ({
    id: item.id,
    category: item.category,
    name_vi: item.name?.vi ?? "",
    name_en: item.name?.en ?? "",
    description_vi: item.description?.vi ?? "",
    description_en: item.description?.en ?? "",
    image: item.image ?? "",
    gallery: item.gallery ?? [],
    old_price: Number(item.oldPrice ?? 0),
    sale_price: Number(item.salePrice ?? 0),
    stock_text_vi: item.stockText?.vi ?? "",
    stock_text_en: item.stockText?.en ?? "",
    tags: item.tags ?? [],
    sort_order: index
  }));
}

async function upsertWithCleanup(client, tableName, rows) {
  const { error: upsertError } = await client.from(tableName).upsert(rows, { onConflict: "id" });
  if (upsertError) {
    throw new Error(`[${tableName}] upsert failed: ${upsertError.message}`);
  }

  const { data: existingRows, error: selectError } = await client.from(tableName).select("id");
  if (selectError) {
    throw new Error(`[${tableName}] select failed: ${selectError.message}`);
  }

  const keepIds = new Set(rows.map((row) => String(row.id)));
  const staleIds = (existingRows ?? []).map((row) => String(row.id ?? "")).filter((id) => id && !keepIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await client.from(tableName).delete().in("id", staleIds);
    if (deleteError) {
      throw new Error(`[${tableName}] delete stale rows failed: ${deleteError.message}`);
    }
  }
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const journey = await readJson("src/content/experience/experience.json");
  const projects = await readJson("src/content/projects/projects.json");
  const showcase = await readJson("src/content/showcase/products.json");

  await upsertWithCleanup(client, "career_journey", mapJourneyRows(journey));
  await upsertWithCleanup(client, "projects", mapProjectRows(projects));
  await upsertWithCleanup(client, "showcase_products", mapShowcaseRows(showcase));

  console.log("Seed completed: career_journey, projects, showcase_products");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
