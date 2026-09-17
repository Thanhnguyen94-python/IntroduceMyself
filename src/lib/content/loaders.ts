import siteJson from "@/content/pages/site.json";
import experienceJson from "@/content/experience/experience.json";
import projectsJson from "@/content/projects/projects.json";
import docsJson from "@/content/docs/docs.json";
import {
  normalizeDocsData,
  normalizeExperienceData,
  normalizeProjectsData,
  normalizeSiteData
} from "@/lib/content/normalizers";
import type { DocsData, ExperienceData, ProjectsData, SiteData } from "@/lib/content/types";

export const getSiteData = () => normalizeSiteData(siteJson as SiteData);
export const getExperienceData = () => normalizeExperienceData(experienceJson as ExperienceData);
export const getProjectsData = () => normalizeProjectsData(projectsJson as ProjectsData);
export const getDocsData = () => normalizeDocsData(docsJson as DocsData);
