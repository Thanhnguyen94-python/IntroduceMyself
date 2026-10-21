"use client";

import Link from "next/link";
import type { ExperienceItem, ProjectItem, SiteData } from "@/lib/content/types";
import type { HomeSectionId } from "@/lib/home-layout-types";
import { resolveMedia } from "@/lib/media-url";
import { useLanguage } from "@/components/providers/language-provider";
import { Reveal } from "@/components/ui/reveal";
import { HubBadge } from "@/components/hub/hub-links";

export type HomeData = {
  site: SiteData;
  stats: { years: number; leaderYears: number; companies: number; improvements: number; tools: number };
  journey: ExperienceItem[];
  caseStudies: ProjectItem[];
};

const categoryLabel: Record<ProjectItem["category"], { vi: string; en: string }> = {
  "3d-jig": { vi: "3D / Jig", en: "3D / Jig" },
  "app-software": { vi: "Phần mềm", en: "Software" },
  "smt-improvement": { vi: "Cải tiến SMT", en: "SMT improvement" },
  "ai-iot": { vi: "AI / IoT", en: "AI / IoT" }
};

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="section-title mt-2">{title}</h2>
      </div>
      {action}
    </Reveal>
  );
}

function coverOf(project: ProjectItem) {
  for (const src of project.gallery) {
    const media = resolveMedia(src);
    if (media.type === "image") return media.src;
  }
  return "";
}

function HeroSection({ data }: { data: HomeData }) {
  const { lang } = useLanguage();
  const { profile } = data.site;
  const avatar = resolveMedia(profile.avatarUrl || "/assets/images/profile-mr-jay.jpg");
  const avatarSrc = avatar.type === "image" ? avatar.src : "/assets/images/profile-mr-jay.jpg";

  return (
    <section className="relative overflow-hidden rounded-3xl border px-6 py-10 sm:px-10 sm:py-14" style={{ borderColor: "var(--border)" }}>
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative grid items-center gap-10 md:grid-cols-[1fr_280px]">
        <Reveal>
          <span className="chip gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {lang === "vi" ? "Sẵn sàng cho cơ hội mới" : "Open to new opportunities"}
          </span>
          <p className="mt-5 text-sm font-semibold text-brand-700 dark:text-brand-200">
            {profile.fullName} ({profile.displayName})
          </p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            <span className="gradient-text">{profile.title[lang] || profile.title.vi}</span>
          </h1>
          <p className="muted mt-4 max-w-2xl text-lg">{profile.slogan[lang] || profile.slogan.vi}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/du-an" className="btn-primary">
              {lang === "vi" ? "Xem Case Study" : "View case studies"} →
            </Link>
            <Link href="/cv" className="btn-ghost">
              📄 {lang === "vi" ? "CV & PDF" : "CV & PDF"}
            </Link>
            <Link href="/hanh-trinh" className="btn-ghost">
              {lang === "vi" ? "Hành trình chi tiết" : "Full journey"}
            </Link>
          </div>
          <p className="muted mt-5 text-sm">📍 {profile.location}</p>
        </Reveal>
        <Reveal delay={120} className="mx-auto w-full max-w-[280px]">
          <div className="relative">
            <div className="absolute inset-0 -rotate-6 rounded-3xl bg-gradient-to-br from-brand-500 to-sky-400 opacity-30" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc} alt={profile.fullName} className="relative h-[340px] w-full rounded-3xl object-cover shadow-2xl" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StatsSection({ data }: { data: HomeData }) {
  const { lang } = useLanguage();
  const vi = lang === "vi";
  const items = [
    { value: `${data.stats.years}+`, label: vi ? "Năm kinh nghiệm SMT" : "Years in SMT" },
    { value: `${data.stats.leaderYears}+`, label: vi ? "Năm dẫn dắt đội ngũ" : "Years leading teams" },
    { value: `${data.caseStudies.length || 0}+`, label: vi ? "Dự án tiêu biểu" : "Featured projects" },
    { value: `${data.stats.tools}+`, label: vi ? "Thiết bị & phần mềm" : "Machines & tools" }
  ];
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item, idx) => (
        <Reveal key={item.label} delay={idx * 70} className="card text-center">
          <p className="gradient-text text-3xl font-extrabold sm:text-4xl">{item.value}</p>
          <p className="muted mt-1 text-sm">{item.label}</p>
        </Reveal>
      ))}
    </section>
  );
}

function CaseStudiesSection({ data }: { data: HomeData }) {
  const { lang } = useLanguage();
  if (!data.caseStudies.length) return null;
  return (
    <section>
      <SectionHeading
        eyebrow="Case Study"
        title={lang === "vi" ? "Bài toán thật, giải pháp thật" : "Real problems, real solutions"}
        action={
          <Link href="/du-an" className="text-sm font-semibold text-brand-600 dark:text-brand-300">
            {lang === "vi" ? "Tất cả dự án →" : "All projects →"}
          </Link>
        }
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {data.caseStudies.map((project, idx) => {
          const cover = coverOf(project);
          const objective = (project.objective[lang] || project.objective.vi || "").split("\n")[0];
          return (
            <Reveal key={project.id} delay={idx * 80}>
              <Link href={`/du-an/${project.slug}`} className="card group flex h-full flex-col overflow-hidden p-0">
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-200 dark:bg-slate-800">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  )}
                  <span className="chip glass absolute left-3 top-3">{categoryLabel[project.category]?.[lang] ?? project.category}</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-bold group-hover:text-brand-600 dark:group-hover:text-brand-300">{project.title[lang] || project.title.vi}</h3>
                  {objective && <p className="muted mt-2 line-clamp-3 text-sm">{objective.replace(/^\d+\.\s*/, "")}</p>}
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    <HubBadge slug={project.slug} asLink={false} />
                    {project.equipmentTags.slice(0, 3).map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function HighlightsSection({ data }: { data: HomeData }) {
  const { lang } = useLanguage();
  const items = data.site.highlights[lang]?.length ? data.site.highlights[lang] : data.site.highlights.vi;
  if (!items.length) return null;
  return (
    <section>
      <SectionHeading eyebrow={lang === "vi" ? "Điểm mạnh" : "Highlights"} title={lang === "vi" ? "Tôi mang lại gì cho dây chuyền" : "What I bring to the line"} />
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item, idx) => (
          <Reveal key={idx} delay={idx * 50} className="card flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">✓</span>
            <p className="text-sm">{item}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SkillsSection({ data }: { data: HomeData }) {
  const { lang } = useLanguage();
  if (!data.site.skills.length) return null;
  return (
    <section>
      <SectionHeading eyebrow={lang === "vi" ? "Kỹ năng" : "Skills"} title={lang === "vi" ? "Bộ công cụ hằng ngày" : "Everyday toolkit"} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.site.skills.map((group, idx) => (
          <Reveal key={idx} delay={idx * 60} className="card">
            <h3 className="font-semibold">{group.group[lang] || group.group.vi}</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {group.items.filter((it) => it !== "...").map((item) => (
                <span key={item} className="chip">
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function JourneySection({ data }: { data: HomeData }) {
  const { lang } = useLanguage();
  const items = data.journey.slice(0, 4);
  if (!items.length) return null;
  const period = (it: ExperienceItem) => `${it.startDate.slice(0, 4)} – ${it.isCurrent ? (lang === "vi" ? "nay" : "now") : it.endDate.slice(0, 4)}`;
  return (
    <section>
      <SectionHeading
        eyebrow={lang === "vi" ? "Hành trình" : "Journey"}
        title={lang === "vi" ? "Các chặng đường đã qua" : "Where I've been"}
        action={
          <Link href="/hanh-trinh" className="text-sm font-semibold text-brand-600 dark:text-brand-300">
            {lang === "vi" ? "Xem đầy đủ →" : "Full timeline →"}
          </Link>
        }
      />
      <ol className="relative space-y-4 border-l pl-6" style={{ borderColor: "var(--border)" }}>
        {items.map((it, idx) => (
          <Reveal as="li" key={it.id} delay={idx * 70} className="relative">
            <span className="absolute -left-[31px] top-5 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-500 dark:border-slate-900" />
            <div className="card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold">{it.role[lang] || it.role.vi}</h3>
                <span className="chip">{period(it)}</span>
              </div>
              <p className="muted text-sm">{it.company}</p>
              {(it.achievements[lang]?.[0] ?? it.achievements.vi?.[0]) && (
                <p className="mt-2 text-sm">🏆 {it.achievements[lang]?.[0] ?? it.achievements.vi[0]}</p>
              )}
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function ContactSection({ data }: { data: HomeData }) {
  const { lang } = useLanguage();
  return (
    <Reveal>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-600 px-6 py-10 text-white shadow-xl sm:px-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <h2 className="text-2xl font-bold sm:text-3xl">{lang === "vi" ? "Cùng tối ưu dây chuyền của bạn?" : "Let's optimize your line together"}</h2>
        <p className="mt-2 max-w-2xl text-white/85">
          {lang === "vi"
            ? "Tôi sẵn sàng trao đổi về vị trí kỹ sư / trưởng nhóm SMT, cải tiến năng suất và tự động hoá."
            : "Happy to talk about SMT engineer / lead roles, productivity improvement and automation."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`mailto:${data.site.profile.email}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
            ✉️ {data.site.profile.email}
          </a>
          <Link href="/cv" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold transition hover:bg-white/10">
            📄 {lang === "vi" ? "Tải CV PDF" : "Download CV"}
          </Link>
        </div>
      </section>
    </Reveal>
  );
}

export const HOME_SECTIONS: Record<HomeSectionId, (props: { data: HomeData }) => React.ReactNode> = {
  hero: HeroSection,
  stats: StatsSection,
  "case-studies": CaseStudiesSection,
  highlights: HighlightsSection,
  skills: SkillsSection,
  journey: JourneySection,
  contact: ContactSection
};

export function HomeSections({ order, data }: { order: HomeSectionId[]; data: HomeData }) {
  return (
    <div className="space-y-16">
      {order.map((id) => {
        const Section = HOME_SECTIONS[id];
        return Section ? <Section key={id} data={data} /> : null;
      })}
    </div>
  );
}
