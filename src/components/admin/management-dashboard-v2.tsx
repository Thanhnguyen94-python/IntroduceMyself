"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TextareaHTMLAttributes } from "react";
import type { ExperienceData, ExperienceItem, ProjectItem, ProjectsData } from "@/lib/content/types";
import type { ShowcaseData, ShowcaseItem } from "@/lib/showcase-types";
import type { SiteVisibilityConfig } from "@/lib/site-visibility-types";
import { OverviewTab } from "@/components/admin/dashboard-tabs/overview-tab";
import { JourneyTab } from "@/components/admin/dashboard-tabs/journey-tab";
import { ProjectsTab } from "@/components/admin/dashboard-tabs/projects-tab";
import { ShowcaseTab } from "@/components/admin/dashboard-tabs/showcase-tab";
import { MediaTab } from "@/components/admin/dashboard-tabs/media-tab";

type AdminTab = "overview" | "journey" | "projects" | "showcase" | "media";
const pageSize = 8;

function formatMonthYear(input: string) {
  if (!input) return "--/----";
  const [year = "", month = ""] = input.split("-");
  if (!year) return input;
  return `${month || "01"}/${year}`;
}

function formatJourneyPeriod(item: ExperienceItem) {
  const start = formatMonthYear(item.startDate);
  const end = item.isCurrent ? "Hiện tại" : formatMonthYear(item.endDate);
  return `${start} → ${end}`;
}

function periodSortValue(input: string) {
  const [year = "0", month = "0"] = input.split("-");
  return Number(year) * 12 + Number(month || "0");
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = `${Math.max(140, ref.current.scrollHeight)}px`;
  }, [props.value]);
  return <textarea ref={ref} {...props} />;
}

function createEmptyJourneyItem(): ExperienceItem {
  return {
    id: `journey-${Date.now()}`,
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

function createEmptyProjectItem(): ProjectItem {
  const id = `project-${Date.now()}`;
  return {
    id,
    slug: id,
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

function createEmptyShowcaseItem(): ShowcaseItem {
  return {
    id: `sp-${Date.now()}`,
    category: "3d",
    name: { vi: "", en: "" },
    description: { vi: "", en: "" },
    image: "",
    gallery: [],
    oldPrice: 0,
    salePrice: 0,
    stockText: { vi: "", en: "" },
    tags: []
  };
}

export function ManagementDashboardV2() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [journeyItems, setJourneyItems] = useState<ExperienceItem[]>([]);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);

  const [visibility, setVisibility] = useState<SiteVisibilityConfig>({
    schemaVersion: 1,
    pages: { overview: true, journey: true, projects: true, showcase: true, docs: true }
  });

  const [journeySearch, setJourneySearch] = useState("");
  const [projectsSearch, setProjectsSearch] = useState("");
  const [showcaseSearch, setShowcaseSearch] = useState("");

  const [journeyPage, setJourneyPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState(1);
  const [showcasePage, setShowcasePage] = useState(1);

  const [editingJourney, setEditingJourney] = useState<ExperienceItem | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [editingShowcase, setEditingShowcase] = useState<ShowcaseItem | null>(null);

  const [journeyModalOpen, setJourneyModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [showcaseModalOpen, setShowcaseModalOpen] = useState(false);

  const [savingItem, setSavingItem] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [mediaBucket, setMediaBucket] = useState<"images" | "videos" | "docs">("images");
  const [mediaFolder, setMediaFolder] = useState("admin");
  const [mediaUrl, setMediaUrl] = useState("");

  useEffect(() => {
    async function loadAll() {
      try {
        const [journeyRes, projectsRes, showcaseRes, visibilityRes] = await Promise.all([
          fetch("/api/journey", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/showcase/products", { cache: "no-store" }),
          fetch("/api/site/visibility", { cache: "no-store" })
        ]);

        const journeyPayload = (await journeyRes.json().catch(() => null)) as ExperienceData | null;
        const projectsPayload = (await projectsRes.json().catch(() => null)) as ProjectsData | null;
        const showcasePayload = (await showcaseRes.json().catch(() => null)) as ShowcaseData | null;
        const visibilityPayload = (await visibilityRes.json().catch(() => null)) as SiteVisibilityConfig | null;

        if (journeyPayload?.items) setJourneyItems(journeyPayload.items);
        if (projectsPayload?.items) setProjectItems(projectsPayload.items);
        if (showcasePayload?.items) setShowcaseItems(showcasePayload.items);
        if (visibilityPayload?.pages) setVisibility(visibilityPayload);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  const sortedJourney = useMemo(
    () => [...journeyItems].sort((a, b) => periodSortValue(b.startDate) - periodSortValue(a.startDate)),
    [journeyItems]
  );

  const filteredJourney = useMemo(() => {
    const keyword = journeySearch.trim().toLowerCase();
    if (!keyword) return sortedJourney;
    return sortedJourney.filter((item) => `${item.company} ${item.role.vi} ${item.role.en} ${item.id}`.toLowerCase().includes(keyword));
  }, [sortedJourney, journeySearch]);

  const filteredProjects = useMemo(() => {
    const keyword = projectsSearch.trim().toLowerCase();
    if (!keyword) return projectItems;
    return projectItems.filter((item) => `${item.title.vi} ${item.title.en} ${item.slug} ${item.category}`.toLowerCase().includes(keyword));
  }, [projectItems, projectsSearch]);

  const filteredShowcase = useMemo(() => {
    const keyword = showcaseSearch.trim().toLowerCase();
    if (!keyword) return showcaseItems;
    return showcaseItems.filter((item) => `${item.name.vi} ${item.name.en} ${item.id} ${item.category} ${item.tags.join(" ")}`.toLowerCase().includes(keyword));
  }, [showcaseItems, showcaseSearch]);

  const pagedJourney = filteredJourney.slice((journeyPage - 1) * pageSize, journeyPage * pageSize);
  const pagedProjects = filteredProjects.slice((projectsPage - 1) * pageSize, projectsPage * pageSize);
  const pagedShowcase = filteredShowcase.slice((showcasePage - 1) * pageSize, showcasePage * pageSize);

  const journeyTotalPages = Math.max(1, Math.ceil(filteredJourney.length / pageSize));
  const projectsTotalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const showcaseTotalPages = Math.max(1, Math.ceil(filteredShowcase.length / pageSize));

  useEffect(() => setJourneyPage(1), [journeySearch]);
  useEffect(() => setProjectsPage(1), [projectsSearch]);
  useEffect(() => setShowcasePage(1), [showcaseSearch]);

  async function uploadToStorage(file: File) {
    const [firstUrl = ""] = await uploadManyToStorage([file]);
    if (!firstUrl) {
      return "";
    }
    setMediaUrl(firstUrl);
    return firstUrl;
  }

  async function uploadManyToStorage(files: File[]) {
    if (!files.length) return [] as string[];
    setUploading(true);
    const urls: string[] = [];
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        body.append("bucket", mediaBucket);
        body.append("folder", mediaFolder || "admin");

        const response = await fetch("/api/admin/storage/upload", { method: "POST", body });
        const payload = (await response.json().catch(() => ({}))) as { message?: string; publicUrl?: string };
        if (!response.ok || !payload.publicUrl) {
          setMessage(payload.message ?? `Upload thất bại: ${file.name}`);
          continue;
        }
        urls.push(payload.publicUrl);
      }
      if (urls.length) {
        setMediaUrl(urls[urls.length - 1]);
      }
      return urls;
    } finally {
      setUploading(false);
    }
  }

  async function saveVisibility() {
    setSavingVisibility(true);
    const response = await fetch("/api/admin/site/visibility", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visibility)
    });
    setSavingVisibility(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? "Lưu cài đặt hiển thị thất bại.");
      return;
    }
    setMessage("Đã lưu cài đặt hiển thị.");
  }

  async function saveJourneyItem() {
    if (!editingJourney) return;
    setSavingItem(true);
    const exists = journeyItems.some((it) => it.id === editingJourney.id);
    const response = await fetch("/api/admin/journey", {
      method: exists ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: editingJourney })
    });
    setSavingItem(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? "Không lưu được hành trình.");
      return;
    }
    setJourneyItems((prev) => {
      const idx = prev.findIndex((it) => it.id === editingJourney.id);
      if (idx >= 0) return prev.map((it, i) => (i === idx ? editingJourney : it));
      return [...prev, editingJourney];
    });
    setJourneyModalOpen(false);
    setEditingJourney(null);
    setMessage("Đã lưu hành trình.");
  }

  async function saveProjectItem() {
    if (!editingProject) return;
    setSavingItem(true);
    const exists = projectItems.some((it) => it.id === editingProject.id);
    const response = await fetch("/api/admin/projects", {
      method: exists ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: editingProject })
    });
    setSavingItem(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? "Không lưu được dự án.");
      return;
    }
    setProjectItems((prev) => {
      const idx = prev.findIndex((it) => it.id === editingProject.id);
      if (idx >= 0) return prev.map((it, i) => (i === idx ? editingProject : it));
      return [...prev, editingProject];
    });
    setProjectModalOpen(false);
    setEditingProject(null);
    setMessage("Đã lưu dự án.");
  }

  async function saveShowcaseItem() {
    if (!editingShowcase) return;
    setSavingItem(true);
    const normalizedShowcase: ShowcaseItem = {
      ...editingShowcase,
      gallery: editingShowcase.gallery ?? [],
      image: editingShowcase.gallery?.[0] ?? editingShowcase.image
    };
    const exists = showcaseItems.some((it) => it.id === normalizedShowcase.id);
    const response = await fetch("/api/admin/showcase/products", {
      method: exists ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: normalizedShowcase })
    });
    setSavingItem(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? "Không lưu được sản phẩm.");
      return;
    }
    setShowcaseItems((prev) => {
      const idx = prev.findIndex((it) => it.id === normalizedShowcase.id);
      if (idx >= 0) return prev.map((it, i) => (i === idx ? normalizedShowcase : it));
      return [...prev, normalizedShowcase];
    });
    setShowcaseModalOpen(false);
    setEditingShowcase(null);
    setMessage("Đã lưu sản phẩm.");
  }

  async function deleteJourney(id: string) {
    if (!window.confirm("Xóa mốc hành trình này?")) return;
    const response = await fetch("/api/admin/journey", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) return;
    setJourneyItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function deleteProject(id: string) {
    if (!window.confirm("Xóa dự án này?")) return;
    const response = await fetch("/api/admin/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) return;
    setProjectItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function deleteShowcase(id: string) {
    if (!window.confirm("Xóa sản phẩm này?")) return;
    const response = await fetch("/api/admin/showcase/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) return;
    setShowcaseItems((prev) => prev.filter((it) => it.id !== id));
  }

  const tabs: Array<{ key: AdminTab; label: string }> = [
    { key: "overview", label: "Tổng quan & Cài đặt hiển thị" },
    { key: "journey", label: "Quản lý Hành trình" },
    { key: "projects", label: "Quản lý Dự án" },
    { key: "showcase", label: "Quản lý Sản phẩm" },
    { key: "media", label: "Kho Media Storage" }
  ];

  if (loading) {
    return <section className="card">Đang tải dashboard quản trị...</section>;
  }

  return (
    <section className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-600 dark:text-brand-300">Management Dashboard</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Journey: {journeyItems.length} · Projects: {projectItems.length} · Showcase: {showcaseItems.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/orders" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
            Dashboard đơn hàng
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              window.location.href = "/admin/login";
            }}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border)" }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="card h-fit space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${activeTab === tab.key ? "bg-brand-600 text-white" : "border"}`}
              style={activeTab === tab.key ? undefined : { borderColor: "var(--border)" }}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          {message && <div className="card text-sm text-emerald-600 dark:text-emerald-400">{message}</div>}

          {activeTab === "overview" && (
            <OverviewTab visibility={visibility} setVisibility={setVisibility} onSave={saveVisibility} saving={savingVisibility} />
          )}

          {activeTab === "journey" && (
            <JourneyTab
              search={journeySearch}
              setSearch={setJourneySearch}
              items={pagedJourney}
              page={journeyPage}
              totalPages={journeyTotalPages}
              onPrevPage={() => setJourneyPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setJourneyPage((p) => Math.min(journeyTotalPages, p + 1))}
              onAdd={() => { setEditingJourney(createEmptyJourneyItem()); setJourneyModalOpen(true); }}
              onEdit={(item) => { setEditingJourney(structuredClone(item)); setJourneyModalOpen(true); }}
              onDelete={deleteJourney}
              formatJourneyPeriod={formatJourneyPeriod}
            />
          )}

          {activeTab === "projects" && (
            <ProjectsTab
              search={projectsSearch}
              setSearch={setProjectsSearch}
              items={pagedProjects}
              page={projectsPage}
              totalPages={projectsTotalPages}
              onPrevPage={() => setProjectsPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setProjectsPage((p) => Math.min(projectsTotalPages, p + 1))}
              onAdd={() => { setEditingProject(createEmptyProjectItem()); setProjectModalOpen(true); }}
              onEdit={(item) => { setEditingProject(structuredClone(item)); setProjectModalOpen(true); }}
              onDelete={deleteProject}
            />
          )}

          {activeTab === "showcase" && (
            <ShowcaseTab
              search={showcaseSearch}
              setSearch={setShowcaseSearch}
              items={pagedShowcase}
              page={showcasePage}
              totalPages={showcaseTotalPages}
              onPrevPage={() => setShowcasePage((p) => Math.max(1, p - 1))}
              onNextPage={() => setShowcasePage((p) => Math.min(showcaseTotalPages, p + 1))}
              onAdd={() => { setEditingShowcase(createEmptyShowcaseItem()); setShowcaseModalOpen(true); }}
              onEdit={(item) => {
                const cloned = structuredClone(item);
                const gallery = cloned.gallery?.length ? cloned.gallery : (cloned.image ? [cloned.image] : []);
                setEditingShowcase({ ...cloned, gallery, image: gallery[0] ?? cloned.image });
                setShowcaseModalOpen(true);
              }}
              onDelete={deleteShowcase}
            />
          )}

          {activeTab === "media" && (
            <MediaTab
              bucket={mediaBucket}
              setBucket={setMediaBucket}
              folder={mediaFolder}
              setFolder={setMediaFolder}
              uploading={uploading}
              mediaUrl={mediaUrl}
              onPickFile={uploadToStorage}
            />
          )}
        </div>
      </div>

      {journeyModalOpen && editingJourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setJourneyModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-4 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold">{journeyItems.some((it) => it.id === editingJourney.id) ? "Sửa" : "Thêm"} Hành trình</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={editingJourney.id} onChange={(e) => setEditingJourney({ ...editingJourney, id: e.target.value })} placeholder="ID" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingJourney.company} onChange={(e) => setEditingJourney({ ...editingJourney, company: e.target.value })} placeholder="Company" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingJourney.role.vi} onChange={(e) => setEditingJourney({ ...editingJourney, role: { ...editingJourney.role, vi: e.target.value } })} placeholder="Role (VI)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingJourney.role.en} onChange={(e) => setEditingJourney({ ...editingJourney, role: { ...editingJourney.role, en: e.target.value } })} placeholder="Role (EN)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingJourney.startDate} onChange={(e) => setEditingJourney({ ...editingJourney, startDate: e.target.value })} placeholder="Start (YYYY-MM)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingJourney.endDate} onChange={(e) => setEditingJourney({ ...editingJourney, endDate: e.target.value })} placeholder="End (YYYY-MM)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingJourney.isCurrent} onChange={(e) => setEditingJourney({ ...editingJourney, isCurrent: e.target.checked })} />Đang làm hiện tại</label>
              <input value={editingJourney.equipmentTags.join(", ")} onChange={(e) => setEditingJourney({ ...editingJourney, equipmentTags: parseCsv(e.target.value) })} placeholder="Equipment tags (a, b, c)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Quản lý Album ảnh (Gallery) · ảnh đầu tiên là ảnh đại diện</label>
                <div className="space-y-2">
                  {editingJourney.images.map((image, index) => (
                    <div key={`${editingJourney.id}-image-${index}`} className="grid gap-2 rounded-lg border p-2 md:grid-cols-[1fr_88px_auto]" style={{ borderColor: "var(--border)" }}>
                      <div className="space-y-2">
                        <input
                          value={image.src}
                          onChange={(e) => {
                            const images = [...editingJourney.images];
                            images[index] = { ...images[index], src: e.target.value };
                            setEditingJourney({ ...editingJourney, images });
                          }}
                          placeholder={`URL ảnh #${index + 1}`}
                          className="rounded border px-3 py-2 text-sm"
                          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                        />
                        <div className="grid gap-2 md:grid-cols-2">
                          <input
                            value={image.description?.vi ?? ""}
                            onChange={(e) => {
                              const images = [...editingJourney.images];
                              images[index] = {
                                ...images[index],
                                description: {
                                  ...(images[index].description ?? { vi: "", en: "" }),
                                  vi: e.target.value
                                }
                              };
                              setEditingJourney({ ...editingJourney, images });
                            }}
                            placeholder="Mô tả ảnh (VI)"
                            className="rounded border px-3 py-2 text-sm"
                            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                          />
                          <input
                            value={image.description?.en ?? ""}
                            onChange={(e) => {
                              const images = [...editingJourney.images];
                              images[index] = {
                                ...images[index],
                                description: {
                                  ...(images[index].description ?? { vi: "", en: "" }),
                                  en: e.target.value
                                }
                              };
                              setEditingJourney({ ...editingJourney, images });
                            }}
                            placeholder="Image description (EN)"
                            className="rounded border px-3 py-2 text-sm"
                            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                          />
                        </div>
                      </div>
                      {image.src ? (
                        <img src={image.src} alt={`Journey ${index + 1}`} className="h-16 w-[88px] rounded object-cover" />
                      ) : (
                        <div className="h-16 w-[88px] rounded bg-slate-200 dark:bg-slate-700" />
                      )}
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => setEditingJourney({ ...editingJourney, images: moveItem(editingJourney.images, index, index - 1) })}
                          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                          style={{ borderColor: "var(--border)" }}
                        >↑</button>
                        <button
                          type="button"
                          disabled={index === editingJourney.images.length - 1}
                          onClick={() => setEditingJourney({ ...editingJourney, images: moveItem(editingJourney.images, index, index + 1) })}
                          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                          style={{ borderColor: "var(--border)" }}
                        >↓</button>
                        <button
                          type="button"
                          onClick={() => setEditingJourney({ ...editingJourney, images: editingJourney.images.filter((_, i) => i !== index) })}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white"
                        >Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingJourney({ ...editingJourney, images: [...editingJourney.images, { src: "", description: { vi: "", en: "" } }] })}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold"
                    style={{ borderColor: "var(--border)" }}
                  >+ Thêm URL ảnh</button>
                  <label className="inline-flex cursor-pointer rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white">
                    Upload nhiều ảnh
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      disabled={uploading}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (!files.length) return;
                        const urls = await uploadManyToStorage(files);
                        if (!urls.length) return;
                        const appended = urls.map((src) => ({ src, description: { vi: "", en: "" } }));
                        setEditingJourney({ ...editingJourney, images: [...editingJourney.images, ...appended] });
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Responsibilities / Trách nhiệm</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingJourney.responsibilities.vi.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, responsibilities: { ...editingJourney.responsibilities, vi: parseLines(e.target.value) } })} placeholder="VI - mỗi dòng 1 ý" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingJourney.responsibilities.en.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, responsibilities: { ...editingJourney.responsibilities, en: parseLines(e.target.value) } })} placeholder="EN - one line per bullet" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Problem → Root cause → Action</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingJourney.problemRootCauseAction.vi.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, problemRootCauseAction: { ...editingJourney.problemRootCauseAction, vi: parseLines(e.target.value) } })} placeholder="VI - mỗi dòng 1 ý" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingJourney.problemRootCauseAction.en.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, problemRootCauseAction: { ...editingJourney.problemRootCauseAction, en: parseLines(e.target.value) } })} placeholder="EN - one line per bullet" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Training activities</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingJourney.trainingActivities.vi.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, trainingActivities: { ...editingJourney.trainingActivities, vi: parseLines(e.target.value) } })} placeholder="VI - mỗi dòng 1 ý" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingJourney.trainingActivities.en.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, trainingActivities: { ...editingJourney.trainingActivities, en: parseLines(e.target.value) } })} placeholder="EN - one line per bullet" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Achievements / Thành tựu</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingJourney.achievements.vi.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, achievements: { ...editingJourney.achievements, vi: parseLines(e.target.value) } })} placeholder="VI - mỗi dòng 1 ý" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingJourney.achievements.en.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, achievements: { ...editingJourney.achievements, en: parseLines(e.target.value) } })} placeholder="EN - one line per bullet" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Improvements / Cải tiến</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingJourney.improvements.vi.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, improvements: { ...editingJourney.improvements, vi: parseLines(e.target.value) } })} placeholder="VI - mỗi dòng 1 ý" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingJourney.improvements.en.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, improvements: { ...editingJourney.improvements, en: parseLines(e.target.value) } })} placeholder="EN - one line per bullet" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setJourneyModalOpen(false)} className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>Hủy</button>
              <button disabled={savingItem} onClick={saveJourneyItem} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingItem ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </div>
        </div>
      )}

      {projectModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setProjectModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-4 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold">{projectItems.some((it) => it.id === editingProject.id) ? "Sửa" : "Thêm"} Dự án</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={editingProject.id} onChange={(e) => setEditingProject({ ...editingProject, id: e.target.value })} placeholder="ID" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingProject.slug} onChange={(e) => setEditingProject({ ...editingProject, slug: e.target.value })} placeholder="Slug" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingProject.title.vi} onChange={(e) => setEditingProject({ ...editingProject, title: { ...editingProject.title, vi: e.target.value } })} placeholder="Title (VI)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingProject.title.en} onChange={(e) => setEditingProject({ ...editingProject, title: { ...editingProject.title, en: e.target.value } })} placeholder="Title (EN)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <select value={editingProject.category} onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value as ProjectItem["category"] })} className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <option value="3d-jig">3D/Jig</option><option value="app-software">App/Software</option><option value="smt-improvement">SMT</option><option value="ai-iot">AI/IoT</option>
              </select>
              <select value={editingProject.status} onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as ProjectItem["status"] })} className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Quản lý Album ảnh (Gallery) · ảnh đầu tiên là ảnh đại diện</label>
                <div className="space-y-2">
                  {editingProject.gallery.map((url, index) => (
                    <div key={`${editingProject.id}-gallery-${index}`} className="grid gap-2 rounded-lg border p-2 md:grid-cols-[1fr_88px_auto]" style={{ borderColor: "var(--border)" }}>
                      <input
                        value={url}
                        onChange={(e) => {
                          const gallery = [...editingProject.gallery];
                          gallery[index] = e.target.value;
                          setEditingProject({ ...editingProject, gallery });
                        }}
                        placeholder={`URL ảnh #${index + 1}`}
                        className="rounded border px-3 py-2 text-sm"
                        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                      />
                      {url ? (
                        <img src={url} alt={`Project ${index + 1}`} className="h-16 w-[88px] rounded object-cover" />
                      ) : (
                        <div className="h-16 w-[88px] rounded bg-slate-200 dark:bg-slate-700" />
                      )}
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => setEditingProject({ ...editingProject, gallery: moveItem(editingProject.gallery, index, index - 1) })}
                          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                          style={{ borderColor: "var(--border)" }}
                        >↑</button>
                        <button
                          type="button"
                          disabled={index === editingProject.gallery.length - 1}
                          onClick={() => setEditingProject({ ...editingProject, gallery: moveItem(editingProject.gallery, index, index + 1) })}
                          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                          style={{ borderColor: "var(--border)" }}
                        >↓</button>
                        <button
                          type="button"
                          onClick={() => setEditingProject({ ...editingProject, gallery: editingProject.gallery.filter((_, i) => i !== index) })}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white"
                        >Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProject({ ...editingProject, gallery: [...editingProject.gallery, ""] })}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold"
                    style={{ borderColor: "var(--border)" }}
                  >+ Thêm URL ảnh</button>
                  <label className="inline-flex cursor-pointer rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white">
                    Upload nhiều ảnh
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      disabled={uploading}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (!files.length) return;
                        const urls = await uploadManyToStorage(files);
                        if (!urls.length) return;
                        setEditingProject({ ...editingProject, gallery: [...editingProject.gallery, ...urls] });
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Summary / Tóm tắt</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingProject.summary.vi} onChange={(e) => setEditingProject({ ...editingProject, summary: { ...editingProject.summary, vi: e.target.value } })} placeholder="VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingProject.summary.en} onChange={(e) => setEditingProject({ ...editingProject, summary: { ...editingProject.summary, en: e.target.value } })} placeholder="EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Objective / Mục tiêu</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingProject.objective.vi} onChange={(e) => setEditingProject({ ...editingProject, objective: { ...editingProject.objective, vi: e.target.value } })} placeholder="VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingProject.objective.en} onChange={(e) => setEditingProject({ ...editingProject, objective: { ...editingProject.objective, en: e.target.value } })} placeholder="EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Description / Nội dung chi tiết</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingProject.description.vi} onChange={(e) => setEditingProject({ ...editingProject, description: { ...editingProject.description, vi: e.target.value } })} placeholder="VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingProject.description.en} onChange={(e) => setEditingProject({ ...editingProject, description: { ...editingProject.description, en: e.target.value } })} placeholder="EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Lessons learned / Bài học rút ra</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingProject.lessonsLearned.vi.join("\n")} onChange={(e) => setEditingProject({ ...editingProject, lessonsLearned: { ...editingProject.lessonsLearned, vi: parseLines(e.target.value) } })} placeholder="VI - mỗi dòng 1 ý" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingProject.lessonsLearned.en.join("\n")} onChange={(e) => setEditingProject({ ...editingProject, lessonsLearned: { ...editingProject.lessonsLearned, en: parseLines(e.target.value) } })} placeholder="EN - one line per bullet" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>

              <input value={editingProject.equipmentTags.join(", ")} onChange={(e) => setEditingProject({ ...editingProject, equipmentTags: parseCsv(e.target.value) })} placeholder="Equipment tags (a, b, c)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setProjectModalOpen(false)} className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>Hủy</button>
              <button disabled={savingItem} onClick={saveProjectItem} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingItem ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </div>
        </div>
      )}

      {showcaseModalOpen && editingShowcase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowcaseModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-4 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold">{showcaseItems.some((it) => it.id === editingShowcase.id) ? "Sửa" : "Thêm"} Sản phẩm</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={editingShowcase.id} onChange={(e) => setEditingShowcase({ ...editingShowcase, id: e.target.value })} placeholder="ID" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <select value={editingShowcase.category} onChange={(e) => setEditingShowcase({ ...editingShowcase, category: e.target.value as ShowcaseItem["category"] })} className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <option value="3d">In 3D</option>
                <option value="display">Showcase</option>
              </select>
              <input value={editingShowcase.name.vi} onChange={(e) => setEditingShowcase({ ...editingShowcase, name: { ...editingShowcase.name, vi: e.target.value } })} placeholder="Tên sản phẩm (VI)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingShowcase.name.en} onChange={(e) => setEditingShowcase({ ...editingShowcase, name: { ...editingShowcase.name, en: e.target.value } })} placeholder="Product name (EN)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Quản lý Album ảnh (Gallery) · gallery[0] là ảnh chính</label>
                <div className="space-y-2">
                  {(editingShowcase.gallery ?? []).map((url, index) => (
                    <div key={`${editingShowcase.id}-gallery-${index}`} className="grid gap-2 rounded-lg border p-2 md:grid-cols-[1fr_88px_auto]" style={{ borderColor: "var(--border)" }}>
                      <input
                        value={url}
                        onChange={(e) => {
                          const gallery = [...(editingShowcase.gallery ?? [])];
                          gallery[index] = e.target.value;
                          setEditingShowcase({ ...editingShowcase, gallery, image: gallery[0] ?? editingShowcase.image });
                        }}
                        placeholder={`URL ảnh #${index + 1}`}
                        className="rounded border px-3 py-2 text-sm"
                        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                      />
                      {url ? (
                        <img src={url} alt={`Showcase ${index + 1}`} className="h-16 w-[88px] rounded object-cover" />
                      ) : (
                        <div className="h-16 w-[88px] rounded bg-slate-200 dark:bg-slate-700" />
                      )}
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            const gallery = moveItem([...(editingShowcase.gallery ?? [])], index, index - 1);
                            setEditingShowcase({ ...editingShowcase, gallery, image: gallery[0] ?? "" });
                          }}
                          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                          style={{ borderColor: "var(--border)" }}
                        >↑</button>
                        <button
                          type="button"
                          disabled={index === (editingShowcase.gallery ?? []).length - 1}
                          onClick={() => {
                            const gallery = moveItem([...(editingShowcase.gallery ?? [])], index, index + 1);
                            setEditingShowcase({ ...editingShowcase, gallery, image: gallery[0] ?? "" });
                          }}
                          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                          style={{ borderColor: "var(--border)" }}
                        >↓</button>
                        <button
                          type="button"
                          onClick={() => {
                            const gallery = (editingShowcase.gallery ?? []).filter((_, i) => i !== index);
                            setEditingShowcase({ ...editingShowcase, gallery, image: gallery[0] ?? "" });
                          }}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white"
                        >Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const gallery = [...(editingShowcase.gallery ?? []), ""];
                      setEditingShowcase({ ...editingShowcase, gallery, image: gallery[0] ?? editingShowcase.image });
                    }}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold"
                    style={{ borderColor: "var(--border)" }}
                  >+ Thêm URL ảnh</button>
                  <label className="inline-flex cursor-pointer rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white">
                    Upload nhiều ảnh
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      disabled={uploading}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (!files.length) return;
                        const urls = await uploadManyToStorage(files);
                        if (!urls.length) return;
                        const gallery = [...(editingShowcase.gallery ?? []), ...urls];
                        setEditingShowcase({ ...editingShowcase, gallery, image: gallery[0] ?? editingShowcase.image });
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border p-3 md:col-span-2" style={{ borderColor: "var(--border)" }}>
                <h4 className="mb-2 text-sm font-semibold">Description / Mô tả</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <AutoTextarea value={editingShowcase.description.vi} onChange={(e) => setEditingShowcase({ ...editingShowcase, description: { ...editingShowcase.description, vi: e.target.value } })} placeholder="VI" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <AutoTextarea value={editingShowcase.description.en} onChange={(e) => setEditingShowcase({ ...editingShowcase, description: { ...editingShowcase.description, en: e.target.value } })} placeholder="EN" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                </div>
              </div>

              <input type="number" value={editingShowcase.oldPrice} onChange={(e) => setEditingShowcase({ ...editingShowcase, oldPrice: Number(e.target.value || 0) })} placeholder="Giá gốc" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input type="number" value={editingShowcase.salePrice} onChange={(e) => setEditingShowcase({ ...editingShowcase, salePrice: Number(e.target.value || 0) })} placeholder="Giá sale" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingShowcase.stockText.vi} onChange={(e) => setEditingShowcase({ ...editingShowcase, stockText: { ...editingShowcase.stockText, vi: e.target.value } })} placeholder="Trạng thái kho (VI)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingShowcase.stockText.en} onChange={(e) => setEditingShowcase({ ...editingShowcase, stockText: { ...editingShowcase.stockText, en: e.target.value } })} placeholder="Stock text (EN)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingShowcase.tags.join(", ")} onChange={(e) => setEditingShowcase({ ...editingShowcase, tags: parseCsv(e.target.value) })} placeholder="Tags (a, b, c)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowcaseModalOpen(false)} className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>Hủy</button>
              <button disabled={savingItem} onClick={saveShowcaseItem} className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingItem ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
