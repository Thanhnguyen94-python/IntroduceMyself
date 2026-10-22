import type { ExperienceData, ProjectsData, SiteData } from "@/lib/content/types";

const LATEST_SCHEMA = 1;

function normalizeTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

// Bỏ dòng trống (ô nhập "mỗi dòng 1 ý" ở Admin).
function cleanLines(list: string[] | undefined) {
  return (list ?? []).map((line) => line.trim()).filter(Boolean);
}

export function normalizeSiteData(raw: SiteData): SiteData {
  return {
    ...raw,
    schemaVersion: raw.schemaVersion ?? LATEST_SCHEMA,
    profile: {
      ...raw.profile,
      avatarUrl: raw.profile?.avatarUrl ?? ""
    },
    privacy: {
      showPhone: raw.privacy?.showPhone ?? false,
      showPersonalInfo: raw.privacy?.showPersonalInfo ?? false
    },
    highlights: {
      vi: cleanLines(raw.highlights?.vi),
      en: cleanLines(raw.highlights?.en)
    },
    languages: {
      vi: cleanLines(raw.languages?.vi),
      en: cleanLines(raw.languages?.en)
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
      },
      images: (item.images ?? []).map((img: any) => {
        if (typeof img === "string") {
          return {
            src: img,
            description: {
              vi: "",
              en: ""
            }
          };
        }

        return {
          src: img?.src ?? "",
          description: {
            vi: img?.description?.vi ?? "",
            en: img?.description?.en ?? ""
          }
        };
      })
    }))
  };
}

export function normalizeProjectsData(raw: ProjectsData): ProjectsData {
  return {
    schemaVersion: raw.schemaVersion ?? LATEST_SCHEMA,
    items: (raw.items ?? []).map((item) => ({
      id: item.id ?? "",
      slug: item.slug ?? "",
      title: {
        vi: normalizeTextValue(item.title?.vi),
        en: normalizeTextValue(item.title?.en)
      },
      category: item.category,
      status: item.status,
      summary: {
        vi: normalizeTextValue(item.summary?.vi),
        en: normalizeTextValue(item.summary?.en)
      },
      objective: {
        vi: normalizeTextValue(item.objective?.vi),
        en: normalizeTextValue(item.objective?.en)
      },
      description: {
        vi: normalizeTextValue(item.description?.vi),
        en: normalizeTextValue(item.description?.en)
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
