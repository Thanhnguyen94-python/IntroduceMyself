"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import journeyJson from "@/content/experience/experience.json";
import projectsJson from "@/content/projects/projects.json";
import { normalizeExperienceData, normalizeProjectsData } from "@/lib/content/normalizers";
import type { ExperienceData, ExperienceItem, ProjectItem, ProjectsData } from "@/lib/content/types";

function parseCommaSeparated(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLineSeparated(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function emptyJourneyItem(index: number): ExperienceItem {
  return {
    id: `journey-${index + 1}`,
    company: "",
    role: { vi: "", en: "" },
    startDate: "",
    endDate: "",
    isCurrent: false,
    equipmentTags: [],
    responsibilities: { vi: [], en: [] },
    problemRootCauseAction: { vi: [], en: [] },
    trainingActivities: { vi: [], en: [] },
    achievements: { vi: [], en: [] },
    improvements: { vi: [], en: [] },
    images: []
  };
}

function emptyProjectItem(index: number): ProjectItem {
  return {
    id: `project-${index + 1}`,
    slug: `project-${index + 1}`,
    title: { vi: "", en: "" },
    category: "3d-jig",
    status: "ongoing",
    summary: { vi: "", en: "" },
    objective: { vi: "", en: "" },
    description: { vi: "", en: "" },
    equipmentTags: [],
    gallery: [],
    attachments: [],
    lessonsLearned: { vi: [], en: [] }
  };
}

function isExperienceData(value: unknown): value is ExperienceData {
  return Boolean(value) && typeof value === "object" && Array.isArray((value as ExperienceData).items);
}

function isProjectsData(value: unknown): value is ProjectsData {
  return Boolean(value) && typeof value === "object" && Array.isArray((value as ProjectsData).items);
}

export function ContentAdminEditor() {
  const router = useRouter();
  const [journeyData, setJourneyData] = useState<ExperienceData>(normalizeExperienceData(journeyJson as ExperienceData));
  const [projectsData, setProjectsData] = useState<ProjectsData>(normalizeProjectsData(projectsJson as unknown as ProjectsData));
  const [loading, setLoading] = useState(true);
  const [journeySaving, setJourneySaving] = useState(false);
  const [projectsSaving, setProjectsSaving] = useState(false);
  const [journeyMessage, setJourneyMessage] = useState("");
  const [projectsMessage, setProjectsMessage] = useState("");

  useEffect(() => {
    async function loadContent() {
      try {
        const [journeyResponse, projectsResponse] = await Promise.all([
          fetch("/api/journey", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" })
        ]);

        const journeyPayload = (await journeyResponse.json().catch(() => null)) as unknown;
        if (journeyResponse.ok && isExperienceData(journeyPayload)) {
          setJourneyData(normalizeExperienceData(journeyPayload));
        }

        const projectsPayload = (await projectsResponse.json().catch(() => null)) as unknown;
        if (projectsResponse.ok && isProjectsData(projectsPayload)) {
          setProjectsData(normalizeProjectsData(projectsPayload));
        }
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, []);

  const updateJourneyItem = (index: number, patch: Partial<ExperienceItem>) => {
    setJourneyData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    }));
  };

  const updateProjectItem = (index: number, patch: Partial<ProjectItem>) => {
    setProjectsData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    }));
  };

  const saveJourney = async () => {
    setJourneySaving(true);
    setJourneyMessage("");

    const response = await fetch("/api/admin/journey", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(journeyData)
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setJourneyMessage(payload.message ?? "Lưu Hành trình thất bại.");
      setJourneySaving(false);
      return;
    }

    setJourneyMessage("Đã lưu Hành trình thành công.");
    setJourneySaving(false);
    router.refresh();
  };

  const saveProjects = async () => {
    setProjectsSaving(true);
    setProjectsMessage("");

    const response = await fetch("/api/admin/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectsData)
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setProjectsMessage(payload.message ?? "Lưu Dự án thất bại.");
      setProjectsSaving(false);
      return;
    }

    setProjectsMessage("Đã lưu Dự án thành công.");
    setProjectsSaving(false);
    router.refresh();
  };

  if (loading) {
    return <section className="card">Đang tải dữ liệu Hành trình và Dự án...</section>;
  }

  return (
    <section className="space-y-4">
      <div className="card flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-brand-600 dark:text-brand-300">Admin - Quản lý Hành trình & Dự án</h2>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-brand-600 dark:text-brand-300">Hành trình (Journey)</h3>
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => setJourneyData((prev) => ({ ...prev, items: [...prev.items, emptyJourneyItem(prev.items.length)] }))}
          >
            + Thêm mốc hành trình
          </button>
        </div>

        {journeyData.items.map((item, index) => (
          <article key={`${item.id}-${index}`} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="font-semibold">Mốc #{index + 1}</h4>
              <button
                type="button"
                className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white"
                onClick={() => setJourneyData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
              >
                Xóa
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <input value={item.id} onChange={(e) => updateJourneyItem(index, { id: e.target.value })} placeholder="ID" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={item.company} onChange={(e) => updateJourneyItem(index, { company: e.target.value })} placeholder="Company" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={item.role.vi} onChange={(e) => updateJourneyItem(index, { role: { ...item.role, vi: e.target.value } })} placeholder="Role (VI)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={item.role.en} onChange={(e) => updateJourneyItem(index, { role: { ...item.role, en: e.target.value } })} placeholder="Role (EN)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={item.startDate} onChange={(e) => updateJourneyItem(index, { startDate: e.target.value })} placeholder="Start date (YYYY-MM)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={item.endDate} onChange={(e) => updateJourneyItem(index, { endDate: e.target.value })} placeholder="End date (YYYY-MM)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={item.isCurrent} onChange={(e) => updateJourneyItem(index, { isCurrent: e.target.checked })} />
                Đang làm hiện tại
              </label>
              <input value={item.equipmentTags.join(", ")} onChange={(e) => updateJourneyItem(index, { equipmentTags: parseCommaSeparated(e.target.value) })} placeholder="Equipment tags (a, b, c)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <textarea rows={3} value={item.responsibilities.vi.join("\n")} onChange={(e) => updateJourneyItem(index, { responsibilities: { ...item.responsibilities, vi: parseLineSeparated(e.target.value) } })} placeholder="Responsibilities VI (mỗi dòng 1 ý)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={3} value={item.responsibilities.en.join("\n")} onChange={(e) => updateJourneyItem(index, { responsibilities: { ...item.responsibilities, en: parseLineSeparated(e.target.value) } })} placeholder="Responsibilities EN (one line = one item)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <textarea rows={3} value={item.problemRootCauseAction.vi.join("\n")} onChange={(e) => updateJourneyItem(index, { problemRootCauseAction: { ...item.problemRootCauseAction, vi: parseLineSeparated(e.target.value) } })} placeholder="Problem RCA VI" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={3} value={item.problemRootCauseAction.en.join("\n")} onChange={(e) => updateJourneyItem(index, { problemRootCauseAction: { ...item.problemRootCauseAction, en: parseLineSeparated(e.target.value) } })} placeholder="Problem RCA EN" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <textarea rows={2} value={item.trainingActivities.vi.join("\n")} onChange={(e) => updateJourneyItem(index, { trainingActivities: { ...item.trainingActivities, vi: parseLineSeparated(e.target.value) } })} placeholder="Training VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={2} value={item.trainingActivities.en.join("\n")} onChange={(e) => updateJourneyItem(index, { trainingActivities: { ...item.trainingActivities, en: parseLineSeparated(e.target.value) } })} placeholder="Training EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <textarea rows={2} value={item.achievements.vi.join("\n")} onChange={(e) => updateJourneyItem(index, { achievements: { ...item.achievements, vi: parseLineSeparated(e.target.value) } })} placeholder="Achievements VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={2} value={item.achievements.en.join("\n")} onChange={(e) => updateJourneyItem(index, { achievements: { ...item.achievements, en: parseLineSeparated(e.target.value) } })} placeholder="Achievements EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <textarea rows={2} value={item.improvements.vi.join("\n")} onChange={(e) => updateJourneyItem(index, { improvements: { ...item.improvements, vi: parseLineSeparated(e.target.value) } })} placeholder="Improvements VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={2} value={item.improvements.en.join("\n")} onChange={(e) => updateJourneyItem(index, { improvements: { ...item.improvements, en: parseLineSeparated(e.target.value) } })} placeholder="Improvements EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Images</p>
                <button
                  type="button"
                  className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                  onClick={() => updateJourneyItem(index, {
                    images: [...item.images, { src: "", description: { vi: "", en: "" } }]
                  })}
                >
                  + Add image
                </button>
              </div>
              {item.images.map((image, imageIndex) => (
                <div key={`${item.id}-img-${imageIndex}`} className="grid gap-2 rounded-lg border p-2 md:grid-cols-3" style={{ borderColor: "var(--border)" }}>
                  <input
                    value={image.src}
                    onChange={(e) => updateJourneyItem(index, {
                      images: item.images.map((it, idx) => (idx === imageIndex ? { ...it, src: e.target.value } : it))
                    })}
                    placeholder="Image URL"
                    className="rounded border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  />
                  <input
                    value={image.description.vi}
                    onChange={(e) => updateJourneyItem(index, {
                      images: item.images.map((it, idx) =>
                        idx === imageIndex ? { ...it, description: { ...it.description, vi: e.target.value } } : it
                      )
                    })}
                    placeholder="Description VI"
                    className="rounded border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  />
                  <div className="flex gap-2">
                    <input
                      value={image.description.en}
                      onChange={(e) => updateJourneyItem(index, {
                        images: item.images.map((it, idx) =>
                          idx === imageIndex ? { ...it, description: { ...it.description, en: e.target.value } } : it
                        )
                      })}
                      placeholder="Description EN"
                      className="w-full rounded border px-3 py-2 text-sm"
                      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                    />
                    <button
                      type="button"
                      className="rounded bg-red-500 px-2 py-1 text-xs text-white"
                      onClick={() => updateJourneyItem(index, {
                        images: item.images.filter((_, idx) => idx !== imageIndex)
                      })}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}

        <button disabled={journeySaving} onClick={saveJourney} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {journeySaving ? "Đang lưu Hành trình..." : "Lưu Hành trình"}
        </button>
        {journeyMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{journeyMessage}</p>}
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-brand-600 dark:text-brand-300">Dự án (Projects)</h3>
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => setProjectsData((prev) => ({ ...prev, items: [...prev.items, emptyProjectItem(prev.items.length)] }))}
          >
            + Thêm dự án
          </button>
        </div>

        {projectsData.items.map((item, index) => (
          <article key={`${item.id}-${index}`} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="font-semibold">Dự án #{index + 1}</h4>
              <button
                type="button"
                className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white"
                onClick={() => setProjectsData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
              >
                Xóa
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <input value={item.id} onChange={(e) => updateProjectItem(index, { id: e.target.value })} placeholder="ID" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={item.slug} onChange={(e) => updateProjectItem(index, { slug: e.target.value })} placeholder="Slug" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={item.title.vi} onChange={(e) => updateProjectItem(index, { title: { ...item.title, vi: e.target.value } })} placeholder="Title (VI)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={item.title.en} onChange={(e) => updateProjectItem(index, { title: { ...item.title, en: e.target.value } })} placeholder="Title (EN)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <select value={item.category} onChange={(e) => updateProjectItem(index, { category: e.target.value as ProjectItem["category"] })} className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <option value="3d-jig">3D/Jig</option>
                <option value="app-software">App/Software</option>
                <option value="smt-improvement">SMT Improvement</option>
                <option value="ai-iot">AI/IoT</option>
              </select>
              <select value={item.status} onChange={(e) => updateProjectItem(index, { status: e.target.value as ProjectItem["status"] })} className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>

              <textarea rows={2} value={item.summary.vi} onChange={(e) => updateProjectItem(index, { summary: { ...item.summary, vi: e.target.value } })} placeholder="Summary VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={2} value={item.summary.en} onChange={(e) => updateProjectItem(index, { summary: { ...item.summary, en: e.target.value } })} placeholder="Summary EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <textarea rows={3} value={item.objective.vi} onChange={(e) => updateProjectItem(index, { objective: { ...item.objective, vi: e.target.value } })} placeholder="Objective VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={3} value={item.objective.en} onChange={(e) => updateProjectItem(index, { objective: { ...item.objective, en: e.target.value } })} placeholder="Objective EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <textarea rows={3} value={item.description.vi} onChange={(e) => updateProjectItem(index, { description: { ...item.description, vi: e.target.value } })} placeholder="Description VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={3} value={item.description.en} onChange={(e) => updateProjectItem(index, { description: { ...item.description, en: e.target.value } })} placeholder="Description EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <input value={item.equipmentTags.join(", ")} onChange={(e) => updateProjectItem(index, { equipmentTags: parseCommaSeparated(e.target.value) })} placeholder="Equipment tags (a, b, c)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={2} value={item.gallery.join("\n")} onChange={(e) => updateProjectItem(index, { gallery: parseLineSeparated(e.target.value) })} placeholder="Gallery URLs (mỗi dòng 1 URL)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Attachments</p>
                <button
                  type="button"
                  className="rounded bg-slate-700 px-2 py-1 text-xs text-white"
                  onClick={() => updateProjectItem(index, {
                    attachments: [...item.attachments, { fileUrl: "", label: { vi: "", en: "" } }]
                  })}
                >
                  + Add attachment
                </button>
              </div>
              {item.attachments.map((attachment, attachmentIndex) => (
                <div key={`${item.id}-att-${attachmentIndex}`} className="grid gap-2 rounded-lg border p-2 md:grid-cols-3" style={{ borderColor: "var(--border)" }}>
                  <input
                    value={attachment.fileUrl}
                    onChange={(e) => updateProjectItem(index, {
                      attachments: item.attachments.map((it, idx) => (idx === attachmentIndex ? { ...it, fileUrl: e.target.value } : it))
                    })}
                    placeholder="File URL"
                    className="rounded border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  />
                  <input
                    value={attachment.label.vi}
                    onChange={(e) => updateProjectItem(index, {
                      attachments: item.attachments.map((it, idx) =>
                        idx === attachmentIndex ? { ...it, label: { ...it.label, vi: e.target.value } } : it
                      )
                    })}
                    placeholder="Label VI"
                    className="rounded border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  />
                  <div className="flex gap-2">
                    <input
                      value={attachment.label.en}
                      onChange={(e) => updateProjectItem(index, {
                        attachments: item.attachments.map((it, idx) =>
                          idx === attachmentIndex ? { ...it, label: { ...it.label, en: e.target.value } } : it
                        )
                      })}
                      placeholder="Label EN"
                      className="w-full rounded border px-3 py-2 text-sm"
                      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                    />
                    <button
                      type="button"
                      className="rounded bg-red-500 px-2 py-1 text-xs text-white"
                      onClick={() => updateProjectItem(index, {
                        attachments: item.attachments.filter((_, idx) => idx !== attachmentIndex)
                      })}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <textarea rows={2} value={item.lessonsLearned.vi.join("\n")} onChange={(e) => updateProjectItem(index, { lessonsLearned: { ...item.lessonsLearned, vi: parseLineSeparated(e.target.value) } })} placeholder="Lessons learned VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <textarea rows={2} value={item.lessonsLearned.en.join("\n")} onChange={(e) => updateProjectItem(index, { lessonsLearned: { ...item.lessonsLearned, en: parseLineSeparated(e.target.value) } })} placeholder="Lessons learned EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
            </div>
          </article>
        ))}

        <button disabled={projectsSaving} onClick={saveProjects} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {projectsSaving ? "Đang lưu Dự án..." : "Lưu Dự án"}
        </button>
        {projectsMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{projectsMessage}</p>}
      </div>
    </section>
  );
}
