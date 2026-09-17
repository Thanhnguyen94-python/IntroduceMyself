import type { DocsData, ExperienceData, ProjectsData, SiteData } from "@/lib/content/types";

const LATEST_SCHEMA = 1;

export function normalizeSiteData(raw: SiteData): SiteData {
  return {
    ...raw,
    schemaVersion: raw.schemaVersion ?? LATEST_SCHEMA,
    highlights: {
      vi: raw.highlights?.vi ?? [],
      en: raw.highlights?.en ?? []
    },
    skills: raw.skills ?? []
  };
}

export function normalizeExperienceData(raw: ExperienceData): ExperienceData {
  return {
    schemaVersion: raw.schemaVersion ?? LATEST_SCHEMA,
    items: (raw.items ?? []).map((item) => ({
      ...item,
      equipmentTags: item.equipmentTags ?? [],
      responsibilities: {
        vi: item.responsibilities?.vi ?? [],
        en: item.responsibilities?.en ?? []
      },
      problemRootCauseAction: {
        vi: item.problemRootCauseAction?.vi ?? [],
        en: item.problemRootCauseAction?.en ?? []
      },
      trainingActivities: {
        vi: item.trainingActivities?.vi ?? [],
        en: item.trainingActivities?.en ?? []
      },
      achievements: {
        vi: item.achievements?.vi ?? [],
        en: item.achievements?.en ?? []
      },
      improvements: {
        vi: item.improvements?.vi ?? [],
        en: item.improvements?.en ?? []
      }
    }))
  };
}

export function normalizeProjectsData(raw: ProjectsData): ProjectsData {
  return {
    schemaVersion: raw.schemaVersion ?? LATEST_SCHEMA,
    items: (raw.items ?? []).map((item) => ({
      ...item,
      objective: {
        vi: item.objective?.vi ?? "",
        en: item.objective?.en ?? ""
      },
      description: {
        vi: item.description?.vi ?? "",
        en: item.description?.en ?? ""
      },
      equipmentTags: item.equipmentTags ?? [],
      gallery: item.gallery ?? [],
      attachments: (item.attachments ?? []).map((file) => ({
        label: {
          vi: file.label?.vi ?? "",
          en: file.label?.en ?? ""
        },
        fileUrl: file.fileUrl ?? ""
      })),
      lessonsLearned: {
        vi: item.lessonsLearned?.vi ?? [],
        en: item.lessonsLearned?.en ?? []
      }
    }))
  };
}

export function normalizeDocsData(raw: DocsData): DocsData {
  return {
    schemaVersion: raw.schemaVersion ?? LATEST_SCHEMA,
    items: (raw.items ?? []).map((item) => ({
      ...item,
      equipmentTags: item.equipmentTags ?? []
    }))
  };
}
