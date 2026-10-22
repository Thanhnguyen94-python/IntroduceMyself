export type Lang = "vi" | "en";

export type LocalizedText = {
  vi: string;
  en: string;
};

export type LocalizedList = {
  vi: string[];
  en: string[];
};

export type AttachmentItem = {
  label: LocalizedText;
  fileUrl: string;
};

export type SiteData = {
  schemaVersion: number;
  profile: {
    fullName: string;
    displayName: string;
    title: LocalizedText;
    slogan: LocalizedText;
    muc_tieu: LocalizedText;
    avatarUrl?: string;
    location: string;
    birthDate: string;
    hometown: string;
    phone: string;
    email: string;
    zaloPhone: string;
  };
  // Quyền riêng tư trên Portfolio công khai (trang /cv vẫn hiển thị đầy đủ).
  privacy?: {
    showPhone: boolean;
    showPersonalInfo: boolean;
  };
  highlights: LocalizedList;
  // Ngoại ngữ (hiện ở CV)
  languages?: LocalizedList;
  skills: {
    group: LocalizedText;
    items: string[];
  }[];
};

export type ExperienceItem = {
  id: string;
  company: string;
  role: LocalizedText;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  equipmentTags: string[];
  responsibilities: LocalizedList;
  problemRootCauseAction: LocalizedList;
  trainingActivities: LocalizedList;
  achievements: LocalizedList;
  improvements: LocalizedList;
  images: {
    src: string;
    description: LocalizedText;
  }[];
};

export type ExperienceData = {
  schemaVersion: number;
  items: ExperienceItem[];
};

export type ProjectItem = {
  id: string;
  slug: string;
  title: LocalizedText;
  category: "3d-jig" | "app-software" | "smt-improvement"| "ai-iot";
  status: "ongoing" | "completed";
  summary: LocalizedText;
  objective: LocalizedText;
  description: LocalizedText;
  equipmentTags: string[];
  gallery: string[];
  attachments: AttachmentItem[];
  lessonsLearned: LocalizedList;
};

export type ProjectsData = {
  schemaVersion: number;
  items: ProjectItem[];
};
