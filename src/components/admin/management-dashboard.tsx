"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TextareaHTMLAttributes } from "react";
import type { ExperienceData, ExperienceItem, ProjectsData, ProjectItem } from "@/lib/content/types";
import type { ShowcaseData, ShowcaseItem } from "@/lib/showcase-types";
import type { ManagedPageKey, SiteVisibilityConfig } from "@/lib/site-visibility-types";

type AdminTab = "overview" | "journey" | "projects" | "showcase" | "media";

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

function normalizeImageUrl(value: string) {
  const input = value.trim();
  if (!input) return value;

  const fileMatch = input.match(/https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  const openMatch = input.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  const fileId = fileMatch?.[1] ?? openMatch?.[1] ?? "";

  if (!fileId) return value;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
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

function FileInputButton({ onPick, disabled }: { onPick: (file: File) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        Upload
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.currentTarget.value = "";
        }}
      />
    </>
  );
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

const pageSize = 8;

export function ManagementDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const [journeyItems, setJourneyItems] = useState<ExperienceItem[]>([]);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);

  const [visibility, setVisibility] = useState<SiteVisibilityConfig>({
    schemaVersion: 1,
    pages: {
      overview: true,
      journey: true,
      projects: true,
      showcase: true,
      docs: true
    }
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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

  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
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
    return sortedJourney.filter((item) => {
      const text = `${item.company} ${item.role.vi} ${item.role.en} ${item.id}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [sortedJourney, journeySearch]);

  const filteredProjects = useMemo(() => {
    const keyword = projectsSearch.trim().toLowerCase();
    if (!keyword) return projectItems;
    return projectItems.filter((item) => {
      const text = `${item.title.vi} ${item.title.en} ${item.slug} ${item.category}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [projectItems, projectsSearch]);

  const filteredShowcase = useMemo(() => {
    const keyword = showcaseSearch.trim().toLowerCase();
    if (!keyword) return showcaseItems;
    return showcaseItems.filter((item) => {
      const text = `${item.name.vi} ${item.name.en} ${item.id} ${item.category} ${item.tags.join(" ")}`.toLowerCase();
      return text.includes(keyword);
    });
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
    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", mediaBucket);
    formData.append("folder", mediaFolder || "admin");

    const response = await fetch("/api/admin/storage/upload", {
      method: "POST",
      body: formData
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string; publicUrl?: string };
    setUploading(false);

    if (!response.ok || !payload.publicUrl) {
      setMessage(payload.message ?? "Upload thất bại.");
      return "";
    }

    setMediaUrl(payload.publicUrl);
    return payload.publicUrl;
  }

  async function saveVisibility() {
    setSavingVisibility(true);
    setMessage("");

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
    const exists = journeyItems.some((item) => item.id === editingJourney.id);

    const response = await fetch("/api/admin/journey", {
      method: exists ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: editingJourney })
    });

    setSavingItem(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? "Không lưu được mốc hành trình.");
      return;
    }

    setJourneyItems((prev) => {
      const index = prev.findIndex((item) => item.id === editingJourney.id);
      if (index >= 0) {
        return prev.map((item, i) => (i === index ? editingJourney : item));
      }
      return [...prev, editingJourney];
    });

    setJourneyModalOpen(false);
    setEditingJourney(null);
    setMessage("Đã lưu mốc hành trình.");
  }

  async function saveProjectItem() {
    if (!editingProject) return;
    setSavingItem(true);
    const exists = projectItems.some((item) => item.id === editingProject.id);

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
      const index = prev.findIndex((item) => item.id === editingProject.id);
      if (index >= 0) {
        return prev.map((item, i) => (i === index ? editingProject : item));
      }
      return [...prev, editingProject];
    });

    setProjectModalOpen(false);
    setEditingProject(null);
    setMessage("Đã lưu dự án.");
  }

  async function saveShowcaseItem() {
    if (!editingShowcase) return;
    setSavingItem(true);
    const exists = showcaseItems.some((item) => item.id === editingShowcase.id);

    const response = await fetch("/api/admin/showcase/products", {
      method: exists ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: editingShowcase })
    });

    setSavingItem(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? "Không lưu được sản phẩm.");
      return;
    }

    setShowcaseItems((prev) => {
      const index = prev.findIndex((item) => item.id === editingShowcase.id);
      if (index >= 0) {
        return prev.map((item, i) => (i === index ? editingShowcase : item));
      }
      return [...prev, editingShowcase];
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
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? "Xóa thất bại.");
      return;
    }
    setJourneyItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function deleteProject(id: string) {
    if (!window.confirm("Xóa dự án này?")) return;
    const response = await fetch("/api/admin/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? "Xóa thất bại.");
      return;
    }
    setProjectItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function deleteShowcase(id: string) {
    if (!window.confirm("Xóa sản phẩm này?")) return;
    const response = await fetch("/api/admin/showcase/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(payload.message ?? "Xóa thất bại.");
      return;
    }
    setShowcaseItems((prev) => prev.filter((item) => item.id !== id));
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
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeTab === tab.key ? "bg-brand-600 text-white" : "border"
              }`}
              style={activeTab === tab.key ? undefined : { borderColor: "var(--border)" }}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          {message && (
            <div className="card text-sm text-emerald-600 dark:text-emerald-400">
              {message}
            </div>
          )}

          {activeTab === "overview" && (
            <section className="card space-y-3">
              <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">Hiển thị/Ẩn các trang chính</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {([
                  ["overview", "Tổng quan"],
                  ["journey", "Hành trình"],
                  ["projects", "Dự án"],
                  ["showcase", "Sản phẩm"],
                  ["docs", "Tài liệu"]
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                    <input
                      type="checkbox"
                      checked={visibility.pages[key]}
                      onChange={(e) =>
                        setVisibility((prev) => ({
                          ...prev,
                          pages: { ...prev.pages, [key]: e.target.checked }
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <button
                onClick={saveVisibility}
                disabled={savingVisibility}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingVisibility ? "Đang lưu..." : "Lưu cài đặt hiển thị"}
              </button>
            </section>
          )}

          {activeTab === "journey" && (
            <section className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  value={journeySearch}
                  onChange={(e) => setJourneySearch(e.target.value)}
                  placeholder="Tìm theo công ty, vai trò, ID"
                  className="w-full rounded-lg border px-3 py-2 text-sm md:w-80"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                />
                <button
                  onClick={() => {
                    setEditingJourney(createEmptyJourneyItem());
                    setJourneyModalOpen(true);
                  }}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  + Thêm mới
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <table className="min-w-full text-sm">
                  <thead style={{ background: "color-mix(in srgb, var(--surface) 92%, #000 8%)" }}>
                    <tr>
                      <th className="px-3 py-2 text-left">Preview</th>
                      <th className="px-3 py-2 text-left">Tiêu đề</th>
                      <th className="px-3 py-2 text-left">Thời gian</th>
                      <th className="px-3 py-2 text-left">Trạng thái</th>
                      <th className="px-3 py-2 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedJourney.map((item) => (
                      <tr key={item.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="px-3 py-2">
                          {item.images[0]?.src ? (
                            <img src={item.images[0].src} alt={item.company} className="h-12 w-16 rounded object-cover" />
                          ) : (
                            <div className="h-12 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold">{item.company}</p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>{item.role.vi}</p>
                        </td>
                        <td className="px-3 py-2">{formatJourneyPeriod(item)}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs ${item.isCurrent ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                            {item.isCurrent ? "Đang làm" : "Đã kết thúc"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => {
                                setEditingJourney(structuredClone(item));
                                setJourneyModalOpen(true);
                              }}
                              className="rounded bg-brand-600 px-2 py-1 text-xs text-white"
                            >
                              Sửa
                            </button>
                            <button onClick={() => deleteJourney(item.id)} className="rounded bg-red-500 px-2 py-1 text-xs text-white">Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p style={{ color: "var(--muted)" }}>Trang {journeyPage}/{journeyTotalPages}</p>
                <div className="flex gap-2">
                  <button disabled={journeyPage <= 1} onClick={() => setJourneyPage((p) => Math.max(1, p - 1))} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: "var(--border)" }}>Trước</button>
                  <button disabled={journeyPage >= journeyTotalPages} onClick={() => setJourneyPage((p) => Math.min(journeyTotalPages, p + 1))} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: "var(--border)" }}>Tiếp</button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "projects" && (
            <section className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  value={projectsSearch}
                  onChange={(e) => setProjectsSearch(e.target.value)}
                  placeholder="Tìm theo tiêu đề, slug, category"
                  className="w-full rounded-lg border px-3 py-2 text-sm md:w-80"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                />
                <button
                  onClick={() => {
                    setEditingProject(createEmptyProjectItem());
                    setProjectModalOpen(true);
                  }}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  + Thêm mới
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <table className="min-w-full text-sm">
                  <thead style={{ background: "color-mix(in srgb, var(--surface) 92%, #000 8%)" }}>
                    <tr>
                      <th className="px-3 py-2 text-left">Preview</th>
                      <th className="px-3 py-2 text-left">Tiêu đề</th>
                      <th className="px-3 py-2 text-left">Thể loại</th>
                      <th className="px-3 py-2 text-left">Trạng thái</th>
                      <th className="px-3 py-2 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedProjects.map((item) => (
                      <tr key={item.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="px-3 py-2">
                          {item.gallery[0] ? (
                            <img src={item.gallery[0]} alt={item.title.vi} className="h-12 w-16 rounded object-cover" />
                          ) : (
                            <div className="h-12 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold">{item.title.vi}</p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>{item.slug}</p>
                        </td>
                        <td className="px-3 py-2">{item.category}</td>
                        <td className="px-3 py-2">{item.status}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <button onClick={() => { setEditingProject(structuredClone(item)); setProjectModalOpen(true); }} className="rounded bg-brand-600 px-2 py-1 text-xs text-white">Sửa</button>
                            <button onClick={() => deleteProject(item.id)} className="rounded bg-red-500 px-2 py-1 text-xs text-white">Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p style={{ color: "var(--muted)" }}>Trang {projectsPage}/{projectsTotalPages}</p>
                <div className="flex gap-2">
                  <button disabled={projectsPage <= 1} onClick={() => setProjectsPage((p) => Math.max(1, p - 1))} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: "var(--border)" }}>Trước</button>
                  <button disabled={projectsPage >= projectsTotalPages} onClick={() => setProjectsPage((p) => Math.min(projectsTotalPages, p + 1))} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: "var(--border)" }}>Tiếp</button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "showcase" && (
            <section className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  value={showcaseSearch}
                  onChange={(e) => setShowcaseSearch(e.target.value)}
                  placeholder="Tìm theo tên, ID, tag"
                  className="w-full rounded-lg border px-3 py-2 text-sm md:w-80"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                />
                <button
                  onClick={() => {
                    setEditingShowcase(createEmptyShowcaseItem());
                    setShowcaseModalOpen(true);
                  }}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  + Thêm mới
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
                <table className="min-w-full text-sm">
                  <thead style={{ background: "color-mix(in srgb, var(--surface) 92%, #000 8%)" }}>
                    <tr>
                      <th className="px-3 py-2 text-left">Preview</th>
                      <th className="px-3 py-2 text-left">Tiêu đề</th>
                      <th className="px-3 py-2 text-left">Thể loại</th>
                      <th className="px-3 py-2 text-left">Trạng thái</th>
                      <th className="px-3 py-2 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedShowcase.map((item) => (
                      <tr key={item.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="px-3 py-2">
                          {item.image ? <img src={item.image} alt={item.name.vi} className="h-12 w-16 rounded object-cover" /> : <div className="h-12 w-16 rounded bg-slate-200 dark:bg-slate-700" />}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold">{item.name.vi}</p>
                          <p className="text-xs" style={{ color: "var(--muted)" }}>{item.id}</p>
                        </td>
                        <td className="px-3 py-2">{item.category}</td>
                        <td className="px-3 py-2">{item.stockText.vi || "--"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <button onClick={() => { setEditingShowcase(structuredClone(item)); setShowcaseModalOpen(true); }} className="rounded bg-brand-600 px-2 py-1 text-xs text-white">Sửa</button>
                            <button onClick={() => deleteShowcase(item.id)} className="rounded bg-red-500 px-2 py-1 text-xs text-white">Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p style={{ color: "var(--muted)" }}>Trang {showcasePage}/{showcaseTotalPages}</p>
                <div className="flex gap-2">
                  <button disabled={showcasePage <= 1} onClick={() => setShowcasePage((p) => Math.max(1, p - 1))} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: "var(--border)" }}>Trước</button>
                  <button disabled={showcasePage >= showcaseTotalPages} onClick={() => setShowcasePage((p) => Math.min(showcaseTotalPages, p + 1))} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: "var(--border)" }}>Tiếp</button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "media" && (
            <section className="card space-y-3">
              <h2 className="text-lg font-semibold text-brand-600 dark:text-brand-300">Kho Media Storage</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={mediaBucket}
                  onChange={(e) => setMediaBucket(e.target.value as "images" | "videos" | "docs")}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <option value="images">images</option>
                  <option value="videos">videos</option>
                  <option value="docs">docs</option>
                </select>
                <input
                  value={mediaFolder}
                  onChange={(e) => setMediaFolder(e.target.value)}
                  placeholder="Folder (vd: projects, showcase, journey)"
                  className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                />
                <div className="md:col-span-3">
                  <FileInputButton onPick={uploadToStorage} disabled={uploading} />
                </div>
              </div>

              {mediaUrl && (
                <div className="space-y-2">
                  <input readOnly value={mediaUrl} className="w-full rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <button onClick={() => navigator.clipboard.writeText(mediaUrl)} className="rounded bg-slate-700 px-3 py-2 text-xs font-semibold text-white">Copy URL</button>
                </div>
              )}
            </section>
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
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editingJourney.isCurrent} onChange={(e) => setEditingJourney({ ...editingJourney, isCurrent: e.target.checked })} />
                Đang làm hiện tại
              </label>
              <input value={editingJourney.equipmentTags.join(", ")} onChange={(e) => setEditingJourney({ ...editingJourney, equipmentTags: parseCsv(e.target.value) })} placeholder="Equipment tags (a, b, c)" className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Ảnh đại diện (URL)</label>
                <div className="flex gap-2">
                  <input
                    value={editingJourney.images[0]?.src ?? ""}
                    onChange={(e) => {
                      const images = editingJourney.images.length > 0 ? [...editingJourney.images] : [{ src: "", description: { vi: "", en: "" } }];
                      images[0] = { ...images[0], src: normalizeImageUrl(e.target.value) };
                      setEditingJourney({ ...editingJourney, images });
                    }}
                    className="w-full rounded border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  />
                  <FileInputButton
                    disabled={uploading}
                    onPick={async (file) => {
                      const url = await uploadToStorage(file);
                      if (!url) return;
                      const images = editingJourney.images.length > 0 ? [...editingJourney.images] : [{ src: "", description: { vi: "", en: "" } }];
                      images[0] = { ...images[0], src: url };
                      setEditingJourney({ ...editingJourney, images });
                    }}
                  />
                </div>
              </div>

              <AutoTextarea value={editingJourney.responsibilities.vi.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, responsibilities: { ...editingJourney.responsibilities, vi: parseLines(e.target.value) } })} placeholder="Responsibilities VI (mỗi dòng 1 ý)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <AutoTextarea value={editingJourney.achievements.vi.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, achievements: { ...editingJourney.achievements, vi: parseLines(e.target.value) } })} placeholder="Achievements VI (mỗi dòng 1 ý)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <AutoTextarea value={editingJourney.improvements.vi.join("\n")} onChange={(e) => setEditingJourney({ ...editingJourney, improvements: { ...editingJourney.improvements, vi: parseLines(e.target.value) } })} placeholder="Improvements VI (mỗi dòng 1 ý)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
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
                <option value="3d-jig">3D/Jig</option>
                <option value="app-software">App/Software</option>
                <option value="smt-improvement">SMT Improvement</option>
                <option value="ai-iot">AI/IoT</option>
              </select>
              <select value={editingProject.status} onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as ProjectItem["status"] })} className="rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold">Ảnh preview (gallery[0])</label>
                <div className="flex gap-2">
                  <input
                    value={editingProject.gallery[0] ?? ""}
                    onChange={(e) => {
                      const gallery = [...editingProject.gallery];
                      gallery[0] = normalizeImageUrl(e.target.value);
                      setEditingProject({ ...editingProject, gallery });
                    }}
                    className="w-full rounded border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  />
                  <FileInputButton
                    disabled={uploading}
                    onPick={async (file) => {
                      const url = await uploadToStorage(file);
                      if (!url) return;
                      const gallery = [...editingProject.gallery];
                      gallery[0] = url;
                      setEditingProject({ ...editingProject, gallery });
                    }}
                  />
                </div>
              </div>

              <AutoTextarea value={editingProject.summary.vi} onChange={(e) => setEditingProject({ ...editingProject, summary: { ...editingProject.summary, vi: e.target.value } })} placeholder="Summary VI" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <AutoTextarea value={editingProject.objective.vi} onChange={(e) => setEditingProject({ ...editingProject, objective: { ...editingProject.objective, vi: e.target.value } })} placeholder="Objective VI" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <AutoTextarea value={editingProject.description.vi} onChange={(e) => setEditingProject({ ...editingProject, description: { ...editingProject.description, vi: e.target.value } })} placeholder="Description VI" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />

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
                <label className="text-sm font-semibold">Ảnh chính</label>
                <div className="flex gap-2">
                  <input value={editingShowcase.image} onChange={(e) => setEditingShowcase({ ...editingShowcase, image: normalizeImageUrl(e.target.value) })} className="w-full rounded border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
                  <FileInputButton disabled={uploading} onPick={async (file) => {
                    const url = await uploadToStorage(file);
                    if (!url) return;
                    setEditingShowcase({ ...editingShowcase, image: url });
                  }} />
                </div>
              </div>

              <AutoTextarea value={editingShowcase.description.vi} onChange={(e) => setEditingShowcase({ ...editingShowcase, description: { ...editingShowcase.description, vi: e.target.value } })} placeholder="Mô tả (VI)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
              <input value={editingShowcase.gallery?.join(", ") ?? ""} onChange={(e) => setEditingShowcase({ ...editingShowcase, gallery: parseCsv(e.target.value).map((url) => normalizeImageUrl(url)) })} placeholder="Gallery URL (csv)" className="rounded border px-3 py-2 text-sm md:col-span-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />
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
