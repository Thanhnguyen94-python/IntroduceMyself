import type { ExperienceItem } from "@/lib/content/types";

// Logic thống kê dùng chung giữa trang chủ và trang Tổng quan.

export function yearMonthValue(input: string) {
  const [y = "0", m = "01"] = (input || "").split("-");
  return Number(y) * 12 + Number(m);
}

export function isAcademicStage(item: ExperienceItem) {
  const text = `${item.company} ${item.role.vi} ${item.role.en} ${item.id}`.toLowerCase();
  return ["trường", "college", "university", "sinh viên", "student"].some((kw) => text.includes(kw));
}

function nowKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function computeCareerStats(items: ExperienceItem[]) {
  const work = items.filter((it) => !isAcademicStage(it));
  const now = nowKey();
  const earliest = work.reduce<ExperienceItem | null>(
    (min, it) => (!min || yearMonthValue(it.startDate) < yearMonthValue(min.startDate) ? it : min),
    null
  );
  const totalMonths = earliest ? Math.max(0, yearMonthValue(now) - yearMonthValue(earliest.startDate)) : 0;
  const leaderMonths = work
    .filter((it) => /tổ trưởng|team leader|leader|trưởng nhóm/i.test(`${it.role.vi} ${it.role.en}`))
    .reduce((sum, it) => sum + Math.max(0, yearMonthValue(it.endDate || now) - yearMonthValue(it.startDate)), 0);

  return {
    years: Math.floor(totalMonths / 12),
    leaderYears: Math.floor(leaderMonths / 12),
    companies: new Set(work.map((it) => it.company)).size,
    improvements: work.reduce((sum, it) => sum + (it.improvements.vi?.length ?? 0), 0),
    tools: new Set(work.flatMap((it) => it.equipmentTags)).size,
    workItems: [...work].sort((a, b) => yearMonthValue(b.startDate) - yearMonthValue(a.startDate))
  };
}
