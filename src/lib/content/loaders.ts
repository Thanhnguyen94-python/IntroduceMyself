import siteJson from "@/content/pages/site.json";
import experienceJson from "@/content/experience/experience.json";
import projectsJson from "@/content/projects/projects.json";
import {
  normalizeExperienceData,
  normalizeProjectsData,
  normalizeSiteData
} from "@/lib/content/normalizers";
import type { ExperienceData, ProjectsData, SiteData } from "@/lib/content/types";

export const getSiteData = () => normalizeSiteData(siteJson as SiteData);
export const getExperienceData = () => normalizeExperienceData(experienceJson as ExperienceData);
export const getProjectsData = () => normalizeProjectsData(projectsJson as unknown as ProjectsData);
