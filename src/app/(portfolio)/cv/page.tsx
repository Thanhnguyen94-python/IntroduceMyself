"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getExperienceData, getSiteData } from "@/lib/content/loaders";
import { pickList, pickText } from "@/lib/content/i18n";
import { useLanguage } from "@/components/providers/language-provider";
import type { Lang } from "@/lib/content/types";

type CvTemplate = "midnight" | "mint" | "sunrise" | "clean";
type CvPalette = "blue" | "amber" | "emerald" | "violet";
type AvatarShape = "circle" | "rectangle" | "hexagon";

type SectionConfig = {
  summary: boolean;
  highlights: boolean;
  work: boolean;
  education: boolean;
  skills: boolean;
  tools: boolean;
};

type CustomSectionPlacement =
  | "beforeSummary"
  | "beforeHighlights"
  | "beforeWork"
  | "beforeEducation"
  | "beforeSkills"
  | "betweenSkillsTools"
  | "afterTools"
  | "end";
type CustomSection = { id: string; title: string; content: string; placement: CustomSectionPlacement };

const EXPORT_PASSWORD = "Thanh94@@";

const templateOptions: { value: CvTemplate; labelVi: string; labelEn: string }[] = [
  { value: "midnight", labelVi: "Sidebar Tối", labelEn: "Midnight Sidebar" },
  { value: "mint", labelVi: "Xanh Mint", labelEn: "Mint Professional" },
  { value: "sunrise", labelVi: "Sunrise Nổi bật", labelEn: "Sunrise Executive" },
  { value: "clean", labelVi: "Tối giản ATS", labelEn: "ATS Clean" }
];

const paletteOptions: { value: CvPalette; labelVi: string; labelEn: string; color: string }[] = [
  { value: "blue", labelVi: "Xanh dương", labelEn: "Blue", color: "#2563eb" },
  { value: "amber", labelVi: "Cam vàng", labelEn: "Amber", color: "#f59e0b" },
  { value: "emerald", labelVi: "Xanh lá", labelEn: "Emerald", color: "#10b981" },
  { value: "violet", labelVi: "Tím", labelEn: "Violet", color: "#7c3aed" }
];

const paletteMap: Record<CvPalette, { accent: string; accentSoft: string; accentDeep: string }> = {
  blue: { accent: "#2563eb", accentSoft: "#dbeafe", accentDeep: "#1e40af" },
  amber: { accent: "#f59e0b", accentSoft: "#fef3c7", accentDeep: "#b45309" },
  emerald: { accent: "#10b981", accentSoft: "#d1fae5", accentDeep: "#065f46" },
  violet: { accent: "#7c3aed", accentSoft: "#ede9fe", accentDeep: "#5b21b6" }
};

const templateMap: Record<CvTemplate, { shell: string; sidebar: string; main: string; heading: string; divider: string; chip: string; twoColumn: boolean }> = {
  midnight: {
    shell: "bg-white border-slate-200",
    sidebar: "bg-slate-800 text-slate-100",
    main: "bg-white text-slate-900",
    heading: "text-slate-900",
    divider: "border-slate-200",
    chip: "bg-slate-100 text-slate-800",
    twoColumn: true
  },
  mint: {
    shell: "bg-[#f7fbf8] border-emerald-200",
    sidebar: "bg-[#e9f7ef] text-slate-900",
    main: "bg-[#fdfefd] text-slate-900",
    heading: "text-slate-900",
    divider: "border-emerald-200",
    chip: "bg-emerald-100 text-emerald-900",
    twoColumn: true
  },
  sunrise: {
    shell: "bg-white border-amber-200",
    sidebar: "bg-[#1f2937] text-white",
    main: "bg-white text-slate-900",
    heading: "text-slate-900",
    divider: "border-amber-200",
    chip: "bg-amber-100 text-amber-900",
    twoColumn: true
  },
  clean: {
    shell: "bg-white border-slate-200",
    sidebar: "bg-slate-50 text-slate-900",
    main: "bg-white text-slate-900",
    heading: "text-slate-900",
    divider: "border-slate-200",
    chip: "bg-slate-100 text-slate-800",
    twoColumn: false
  }
};

function isAcademicStage(company: string, roleVi: string, roleEn: string, id: string) {
  const text = `${company} ${roleVi} ${roleEn} ${id}`.toLowerCase();
  return text.includes("trường") || text.includes("college") || text.includes("university") || text.includes("sinh viên") || text.includes("student");
}

function normalizeTemplate(value: string | null): CvTemplate {
  if (value === "mint" || value === "sunrise" || value === "midnight" || value === "clean") return value;
  return "midnight";
}

function normalizePalette(value: string | null): CvPalette {
  if (value === "amber" || value === "emerald" || value === "violet" || value === "blue") return value;
  return "blue";
}

function normalizeLang(value: string | null): Lang | null {
  if (value === "vi" || value === "en") return value;
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function CvInner() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { lang: uiLang } = useLanguage();
  const site = getSiteData();
  const exp = getExperienceData();
  const queryLang = normalizeLang(search.get("lang"));
  const dataLang = queryLang ?? uiLang;
  const template = normalizeTemplate(search.get("template"));
  const palette = normalizePalette(search.get("palette"));
  const isPrintMode = search.get("print") === "1";

  const templateStyle = templateMap[template];
  const paletteStyle = paletteMap[palette];

  const [avatarUrl, setAvatarUrl] = useState("/assets/images/profile-mr-jay.jpg");
  const [avatarX, setAvatarX] = useState(50);
  const [avatarY, setAvatarY] = useState(50);
  const [avatarSize, setAvatarSize] = useState(200);
  const [avatarShape, setAvatarShape] = useState<AvatarShape>("circle");

  const [customName, setCustomName] = useState(site.profile.fullName);
  const [customTitle, setCustomTitle] = useState(pickText(site.profile.title, dataLang));
  const [customSlogan, setCustomSlogan] = useState(pickText(site.profile.muc_tieu, dataLang));
  const [customEmail, setCustomEmail] = useState(site.profile.email);
  const [customPhone, setCustomPhone] = useState(site.profile.phone);
  const [customLocation, setCustomLocation] = useState(site.profile.location);

  const [sections, setSections] = useState<SectionConfig>({
    summary: true,
    highlights: true,
    work: true,
    education: true,
    skills: true,
    tools: true
  });
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionContent, setNewSectionContent] = useState("");
  const [newSectionPlacement, setNewSectionPlacement] = useState<CustomSectionPlacement>("beforeWork");

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCustomTitle(pickText(site.profile.title, dataLang));
    setCustomSlogan(pickText(site.profile.muc_tieu, dataLang));
  }, [dataLang, site.profile.title, site.profile.muc_tieu]);

  const workItems = useMemo(() => exp.items
    .filter((item) => !isAcademicStage(item.company, item.role.vi, item.role.en, item.id))
    .sort((a, b) => b.startDate.localeCompare(a.startDate)), [exp.items]);
  const educationItems = useMemo(() => exp.items
    .filter((item) => isAcademicStage(item.company, item.role.vi, item.role.en, item.id))
    .sort((a, b) => b.startDate.localeCompare(a.startDate)), [exp.items]);

  const topTools = useMemo(() => Array.from(new Set(workItems.flatMap((item) => item.equipmentTags))).slice(0, 14), [workItems]);

  useEffect(() => {
    if (isPrintMode) {
      const timer = setTimeout(() => window.print(), 650);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isPrintMode]);

  const updateQuery = (key: "template" | "palette" | "lang", value: string) => {
    const params = new URLSearchParams(search.toString());
    params.set(key, value);
    params.delete("print");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const onAvatarUpload = (file: File | null) => {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setAvatarUrl(nextUrl);
  };

  const addCustomSection = () => {
    if (!newSectionTitle.trim() || !newSectionContent.trim()) return;
    setCustomSections((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: newSectionTitle.trim(), content: newSectionContent.trim(), placement: newSectionPlacement }
    ]);
    setNewSectionTitle("");
    setNewSectionContent("");
    setNewSectionPlacement("beforeWork");
  };

  const removeCustomSection = (id: string) => {
    setCustomSections((prev) => prev.filter((item) => item.id !== id));
  };

  const openExportModal = () => {
    setPasswordError("");
    setExportPassword("");
    setIsPasswordModalOpen(true);
  };

  const confirmExportPdf = () => {
    if (exportPassword !== EXPORT_PASSWORD) {
      setPasswordError(dataLang === "vi" ? "Sai mật khẩu xuất file." : "Incorrect export password.");
      return;
    }
    const params = new URLSearchParams(search.toString());
    params.set("template", template);
    params.set("palette", palette);
    params.set("lang", dataLang);
    params.set("print", "1");
    router.replace(`${pathname}?${params.toString()}`);
    setIsPasswordModalOpen(false);
  };

  const updateAvatarPositionFromPointer = (clientX: number, clientY: number, currentTarget: HTMLDivElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setAvatarX(Math.round(clamp(x, 0, 100)));
    setAvatarY(Math.round(clamp(y, 0, 100)));
  };

  const onAvatarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDraggingAvatar(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateAvatarPositionFromPointer(e.clientX, e.clientY, e.currentTarget);
  };

  const onAvatarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingAvatar) return;
    updateAvatarPositionFromPointer(e.clientX, e.clientY, e.currentTarget);
  };

  const onAvatarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingAvatar(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const customSectionsByPlacement = useMemo(() => {
    return customSections.reduce<Record<CustomSectionPlacement, CustomSection[]>>((acc, section) => {
      acc[section.placement].push(section);
      return acc;
    }, {
      beforeSummary: [],
      beforeHighlights: [],
      beforeWork: [],
      beforeEducation: [],
      beforeSkills: [],
      betweenSkillsTools: [],
      afterTools: [],
      end: []
    });
  }, [customSections]);

  const renderCustomSections = (placement: CustomSectionPlacement) => {
    return customSectionsByPlacement[placement].map((section) => (
      <section key={section.id} className={`mt-5 border-t pt-4 ${templateStyle.divider}`}>
        <div className="mb-2 flex items-center justify-between gap-2 print:block">
          <h2 className={`text-xl font-bold ${templateStyle.heading}`} style={{ color: paletteStyle.accentDeep }}>{section.title}</h2>
          {!isPrintMode && (
            <button type="button" onClick={() => removeCustomSection(section.id)} className="rounded border px-2 py-1 text-xs" style={{ borderColor: "var(--border)" }}>
              {dataLang === "vi" ? "Xóa" : "Remove"}
            </button>
          )}
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{section.content}</p>
      </section>
    ));
  };

  const renderSidebarCustomSections = (placement: CustomSectionPlacement) => {
    return customSectionsByPlacement[placement].map((section) => (
      <section key={section.id} className="mt-6 border-t pt-4" style={{ borderColor: template === "midnight" ? "rgba(255,255,255,0.18)" : paletteStyle.accentSoft }}>
        <div className="mb-2 flex items-center justify-between gap-2 print:block">
          <h2 className="text-base font-bold" style={{ color: paletteStyle.accent }}>{section.title}</h2>
          {!isPrintMode && (
            <button type="button" onClick={() => removeCustomSection(section.id)} className="rounded border px-2 py-1 text-xs" style={{ borderColor: template === "midnight" ? "rgba(255,255,255,0.25)" : paletteStyle.accentSoft }}>
              {dataLang === "vi" ? "Xóa" : "Remove"}
            </button>
          )}
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: template === "midnight" ? "#f8fafc" : "#334155" }}>{section.content}</p>
      </section>
    ));
  };

  const avatarFrameClass = avatarShape === "circle" ? "rounded-full" : avatarShape === "rectangle" ? "rounded-lg" : "rounded-none";
  const avatarFrameStyle = {
    borderColor: paletteStyle.accent,
    width: avatarShape === "rectangle" ? `${Math.round(avatarSize * 0.72)}px` : `${avatarSize}px`,
    height: `${avatarSize}px`,
    clipPath: avatarShape === "hexagon" ? "polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)" : undefined,
    cursor: isDraggingAvatar ? "grabbing" : "grab"
  };
  const controlFieldStyle = {
    borderColor: "#334155",
    backgroundColor: "#1E293B",
    color: "#F1F5F9"
  };
  const overviewUrl = typeof window !== "undefined" ? `${window.location.origin}/tong-quan` : "/tong-quan";
  const overviewQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(overviewUrl)}`;

  return (
    <section className="mx-auto max-w-[1150px] space-y-4 cv-print-root">
      {!isPrintMode && !isCustomizerOpen && (
        <button
          type="button"
          onClick={() => setIsCustomizerOpen(true)}
          className="fixed bottom-24 right-6 z-40 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg md:bottom-6 md:right-24 print:hidden"
          style={{ backgroundColor: paletteStyle.accent }}
        >
          {dataLang === "vi" ? "Tùy chỉnh CV" : "Customize CV"}
        </button>
      )}

      {!isPrintMode && isCustomizerOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 p-4 print:hidden">
          <div className="mx-auto max-h-[92vh] w-full max-w-[1100px] overflow-y-auto rounded-2xl border bg-slate-900 p-4 text-slate-100 shadow-xl" style={{ borderColor: "#334155" }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{dataLang === "vi" ? "Tùy chỉnh CV" : "Customize CV"}</h3>
              <button
                type="button"
                onClick={() => setIsCustomizerOpen(false)}
                className="rounded border px-3 py-1.5 text-sm"
                style={{ borderColor: "#334155", color: "#F1F5F9" }}
              >
                {dataLang === "vi" ? "Đóng" : "Close"}
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold">{dataLang === "vi" ? "Mẫu CV" : "Template"}</label>
                  <select
                    value={template}
                    onChange={(e) => updateQuery("template", e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={controlFieldStyle}
                  >
                    {templateOptions.map((option) => (
                      <option key={option.value} value={option.value}>{dataLang === "vi" ? option.labelVi : option.labelEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">{dataLang === "vi" ? "Màu chủ đạo" : "Accent color"}</label>
                  <div className="grid grid-cols-4 gap-2 rounded-lg border p-2" style={controlFieldStyle}>
                    {paletteOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateQuery("palette", option.value)}
                        title={dataLang === "vi" ? option.labelVi : option.labelEn}
                        aria-label={dataLang === "vi" ? option.labelVi : option.labelEn}
                        className={`h-8 rounded border transition ${palette === option.value ? "ring-2 ring-offset-2 ring-offset-slate-800" : ""}`}
                        style={{ backgroundColor: option.color, borderColor: palette === option.value ? "#F8FAFC" : "#334155" }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Language</label>
                  <select
                    value={dataLang}
                    onChange={(e) => updateQuery("lang", e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={controlFieldStyle}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={openExportModal}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: paletteStyle.accent }}
                >
                  {dataLang === "vi" ? "Xuất PDF" : "Export PDF"}
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border p-3" style={{ borderColor: "#334155" }}>
                  <p className="text-sm font-semibold">{dataLang === "vi" ? "Tùy chỉnh nhanh nội dung" : "Quick content edits"}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input value={customName} onChange={(e) => setCustomName(e.target.value)} className="rounded border px-2 py-1.5 text-sm placeholder:text-slate-300" style={controlFieldStyle} placeholder={dataLang === "vi" ? "Họ tên" : "Full name"} />
                    <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className="rounded border px-2 py-1.5 text-sm placeholder:text-slate-300" style={controlFieldStyle} placeholder={dataLang === "vi" ? "Chức danh" : "Title"} />
                    <input value={customEmail} onChange={(e) => setCustomEmail(e.target.value)} className="rounded border px-2 py-1.5 text-sm placeholder:text-slate-300" style={controlFieldStyle} placeholder="Email" />
                    <input value={customPhone} onChange={(e) => setCustomPhone(e.target.value)} className="rounded border px-2 py-1.5 text-sm placeholder:text-slate-300" style={controlFieldStyle} placeholder={dataLang === "vi" ? "Điện thoại" : "Phone"} />
                    <input value={customLocation} onChange={(e) => setCustomLocation(e.target.value)} className="rounded border px-2 py-1.5 text-sm placeholder:text-slate-300 sm:col-span-2" style={controlFieldStyle} placeholder={dataLang === "vi" ? "Địa chỉ" : "Location"} />
                    <textarea value={customSlogan} onChange={(e) => setCustomSlogan(e.target.value)} className="rounded border px-2 py-1.5 text-sm placeholder:text-slate-300 sm:col-span-2" style={controlFieldStyle} rows={3} placeholder={dataLang === "vi" ? "Mục tiêu nghề nghiệp" : "Career objective"} />
                  </div>
                </div>

                <div className="rounded-xl border p-3" style={{ borderColor: "#334155" }}>
                  <p className="text-sm font-semibold">{dataLang === "vi" ? "Avatar & bố cục" : "Avatar & layout"}</p>
                  <div className="mt-2 grid gap-2">
                    <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="rounded border px-2 py-1.5 text-sm placeholder:text-slate-300" style={controlFieldStyle} placeholder={dataLang === "vi" ? "URL ảnh avatar" : "Avatar URL"} />
                    <input type="file" accept="image/*" onChange={(e) => onAvatarUpload(e.target.files?.[0] ?? null)} className="text-sm text-slate-100" />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="text-xs">X ({dataLang === "vi" ? "Vị trí ngang ảnh" : "Image horizontal position"}) <input type="range" min={0} max={100} value={avatarX} onChange={(e) => setAvatarX(Number(e.target.value))} className="w-full" /></label>
                      <label className="text-xs">Y ({dataLang === "vi" ? "Vị trí dọc ảnh" : "Image vertical position"}) <input type="range" min={0} max={100} value={avatarY} onChange={(e) => setAvatarY(Number(e.target.value))} className="w-full" /></label>
                      <label className="text-xs">Size <input type="range" min={160} max={260} value={avatarSize} onChange={(e) => setAvatarSize(Number(e.target.value))} className="w-full" /></label>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {dataLang === "vi"
                        ? "X/Y là tọa độ căn ảnh bên trong khung (không phải kích thước)."
                        : "X/Y controls image position inside the frame (not size)."}
                    </p>
                    <select value={avatarShape} onChange={(e) => setAvatarShape(e.target.value as AvatarShape)} className="rounded border px-2 py-1.5 text-sm" style={controlFieldStyle}>
                      <option value="circle">{dataLang === "vi" ? "Bo tròn" : "Circle"}</option>
                      <option value="rectangle">{dataLang === "vi" ? "Chữ nhật" : "Portrait Rectangle"}</option>
                      <option value="hexagon">{dataLang === "vi" ? "Lục giác" : "Hexagon"}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: "#334155" }}>
                <p className="text-sm font-semibold">{dataLang === "vi" ? "Bật/Tắt nội dung" : "Toggle content blocks"}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {([
                    ["summary", dataLang === "vi" ? "Mục tiêu" : "Summary"],
                    ["highlights", dataLang === "vi" ? "Điểm mạnh" : "Highlights"],
                    ["work", dataLang === "vi" ? "Kinh nghiệm" : "Work"],
                    ["education", dataLang === "vi" ? "Học vấn" : "Education"],
                    ["skills", dataLang === "vi" ? "Kỹ năng" : "Skills"],
                    ["tools", dataLang === "vi" ? "Thiết bị" : "Tools"]
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 rounded border px-2 py-1 text-sm" style={{ borderColor: "#334155" }}>
                      <input
                        type="checkbox"
                        checked={sections[key]}
                        onChange={(e) => setSections((prev) => ({ ...prev, [key]: e.target.checked }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: "#334155" }}>
                <p className="text-sm font-semibold">{dataLang === "vi" ? "Thêm bố cục mới" : "Add custom section"}</p>
                <div className="mt-2 grid gap-2">
                  <input value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} className="rounded border px-2 py-1.5 text-sm placeholder:text-slate-300" style={controlFieldStyle} placeholder={dataLang === "vi" ? "Tiêu đề" : "Title"} />
                  <textarea value={newSectionContent} onChange={(e) => setNewSectionContent(e.target.value)} className="rounded border px-2 py-1.5 text-sm placeholder:text-slate-300" style={controlFieldStyle} rows={3} placeholder={dataLang === "vi" ? "Nội dung..." : "Content..."} />
                  <select value={newSectionPlacement} onChange={(e) => setNewSectionPlacement(e.target.value as CustomSectionPlacement)} className="rounded border px-2 py-1.5 text-sm" style={controlFieldStyle}>
                    <option value="beforeSummary">{dataLang === "vi" ? "Trước Mục tiêu" : "Before Summary"}</option>
                    <option value="beforeHighlights">{dataLang === "vi" ? "Trước Điểm mạnh" : "Before Highlights"}</option>
                    <option value="beforeWork">{dataLang === "vi" ? "Trước Kinh nghiệm" : "Before Work"}</option>
                    <option value="beforeEducation">{dataLang === "vi" ? "Trước Học vấn" : "Before Education"}</option>
                    <option value="beforeSkills">{dataLang === "vi" ? "Trước Kỹ năng chính" : "Before Core skills"}</option>
                    <option value="betweenSkillsTools">{dataLang === "vi" ? "Giữa Kỹ năng và Công cụ" : "Between Skills and Tools"}</option>
                    <option value="afterTools">{dataLang === "vi" ? "Sau Công cụ/Thiết bị" : "After Tools/Equipment"}</option>
                    <option value="end">{dataLang === "vi" ? "Cuối CV" : "At the end of CV"}</option>
                  </select>
                  <button type="button" onClick={addCustomSection} className="w-fit rounded bg-slate-800 px-3 py-1.5 text-sm text-white">
                    {dataLang === "vi" ? "+ Thêm" : "+ Add"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <article
        className={`cv-print-area overflow-hidden rounded-2xl border shadow-sm print:shadow-none ${templateStyle.shell}`}
        style={{ borderColor: paletteStyle.accentSoft }}
      >
        <div
          className={`cv-layout grid min-h-[1120px] ${templateStyle.twoColumn ? "md:grid-cols-[280px_1fr]" : "md:grid-cols-1"}`}
          data-print-columns={templateStyle.twoColumn ? "two" : "one"}
        >
          <aside className={`p-6 ${templateStyle.sidebar}`}>
            <div
              className={`group relative mx-auto overflow-hidden border-4 ${avatarFrameClass}`}
              style={avatarFrameStyle}
              onPointerDown={onAvatarPointerDown}
              onPointerMove={onAvatarPointerMove}
              onPointerUp={onAvatarPointerUp}
              onPointerCancel={onAvatarPointerUp}
            >
              <img src={avatarUrl} alt={`${customName} profile`} className="h-full w-full object-cover" style={{ objectPosition: `${avatarX}% ${avatarY}%` }} />
              {!isPrintMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    avatarInputRef.current?.click();
                  }}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-[11px] text-white opacity-0 transition group-hover:opacity-100"
                >
                  {dataLang === "vi" ? "Đổi ảnh" : "Change photo"}
                </button>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => onAvatarUpload(e.target.files?.[0] ?? null)}
              className="hidden"
            />

            <h1 className="mt-5 text-2xl font-bold leading-tight">{customName}</h1>
            <p className="mt-1 text-sm font-semibold" style={{ color: template === "midnight" ? "#e2e8f0" : paletteStyle.accentDeep }}>
              {customTitle}
            </p>

            <div className="mt-5 space-y-2 text-sm">
              <p>📧 {customEmail}</p>
              <p>📱 {customPhone}</p>
              <p>📍 {customLocation}</p>
              <p>🎂 {site.profile.birthDate}</p>
            </div>

            {renderSidebarCustomSections("beforeSkills")}

            {sections.skills && (
              <div className="mt-6">
                <h2 className="text-base font-bold" style={{ color: paletteStyle.accent }}>{dataLang === "vi" ? "Kỹ năng chính" : "Core skills"}</h2>
                <div className="mt-2 space-y-2">
                  {site.skills.slice(0, 3).map((skillGroup) => (
                    <div key={skillGroup.group.vi}>
                      <p className="text-xs font-semibold uppercase tracking-wide">{pickText(skillGroup.group, dataLang)}</p>
                      <p className="mt-1 text-[11px]" style={{ color: template === "midnight" ? "#fff" : "#0f172a" }}>
                        {skillGroup.items.slice(0, 4).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {renderSidebarCustomSections("betweenSkillsTools")}

            {sections.tools && (
              <div className="mt-6">
                <h2 className="text-base font-bold" style={{ color: paletteStyle.accent }}>{dataLang === "vi" ? "Công cụ/Thiết bị" : "Tools/Equipment"}</h2>
                <p className="mt-2 text-[11px]" style={{ color: template === "midnight" ? "#fff" : "#0f172a" }}>{topTools.join(", ")}</p>
              </div>
            )}

            {renderSidebarCustomSections("afterTools")}

            <div className="mt-6 rounded-lg border p-3 text-center" style={{ borderColor: template === "midnight" ? "rgba(255,255,255,0.25)" : paletteStyle.accentSoft }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: template === "midnight" ? "#e2e8f0" : paletteStyle.accentDeep }}>
                {dataLang === "vi" ? "Xem CV chi tiết tại" : "View detailed CV at"}
              </p>
              <img src={overviewQrUrl} alt="QR to overview page" className="mx-auto mt-2 h-24 w-24 rounded bg-white p-1" />
              <p className="mt-2 break-all text-[11px] leading-relaxed" style={{ color: template === "midnight" ? "#f8fafc" : "#334155" }}>
                {overviewUrl}
              </p>
            </div>
          </aside>

          <main className={`p-6 ${templateStyle.main}`}>
            {renderCustomSections("beforeSummary")}

            {sections.summary && (
              <section>
                <h2 className={`text-xl font-bold ${templateStyle.heading}`} style={{ color: paletteStyle.accentDeep }}>{dataLang === "vi" ? "Mục tiêu nghề nghiệp" : "Career objective"}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{customSlogan}</p>
              </section>
            )}

            {renderCustomSections("beforeHighlights")}

            {sections.highlights && (
              <section className={`mt-5 border-t pt-4 ${templateStyle.divider}`}>
                <h2 className={`text-xl font-bold ${templateStyle.heading}`} style={{ color: paletteStyle.accentDeep }}>{dataLang === "vi" ? "Tóm tắt điểm mạnh" : "Highlights"}</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {pickList(site.highlights, dataLang).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            )}

            {renderCustomSections("beforeWork")}

            {sections.work && (
              <section className={`mt-5 border-t pt-4 ${templateStyle.divider}`}>
                <h2 className={`text-xl font-bold ${templateStyle.heading}`} style={{ color: paletteStyle.accentDeep }}>{dataLang === "vi" ? "Kinh nghiệm làm việc" : "Work experience"}</h2>
                <div className="mt-3 space-y-4">
                  {workItems.map((item) => (
                    <article key={item.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{item.company}</p>
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: paletteStyle.accentDeep }}>{item.startDate} - {item.endDate}</span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: paletteStyle.accentDeep }}>{pickText(item.role, dataLang)}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {pickList(item.responsibilities, dataLang).slice(0, 4).map((task) => (
                          <li key={task}>{task}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {renderCustomSections("beforeEducation")}

            {sections.education && educationItems.length > 0 && (
              <section className={`mt-5 border-t pt-4 ${templateStyle.divider}`}>
                <h2 className={`text-xl font-bold ${templateStyle.heading}`} style={{ color: paletteStyle.accentDeep }}>{dataLang === "vi" ? "Học vấn" : "Education"}</h2>
                <div className="mt-2 space-y-2">
                  {educationItems.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3" style={{ borderColor: paletteStyle.accentSoft }}>
                      <p className="font-semibold">{item.company}</p>
                      <p className="text-sm" style={{ color: paletteStyle.accentDeep }}>{pickText(item.role, dataLang)}</p>
                      <p className="text-xs text-slate-600">{item.startDate} - {item.endDate}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {renderCustomSections("end")}
          </main>
        </div>
      </article>

      {!isPrintMode && (
        <p className="text-center text-xs text-slate-500 print:hidden">
          {dataLang === "vi"
            ? "Xuất file PDF nhớ kiểm tra kỹ giúp Jay nhé."
            : "Please double-check the PDF export before sending it out."}
        </p>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-xl bg-white p-4">
            <h3 className="text-base font-semibold text-slate-900">{dataLang === "vi" ? "Xác nhận xuất PDF" : "Confirm PDF export"}</h3>
            <p className="mt-1 text-sm text-slate-600">{dataLang === "vi" ? "Nhập mật khẩu để xuất file cuối cùng." : "Enter password for final export."}</p>
            <input
              type="password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
              className="mt-3 w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "#cbd5e1" }}
              placeholder={dataLang === "vi" ? "Mật khẩu" : "Password"}
            />
            {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="rounded border px-3 py-1.5 text-sm" style={{ borderColor: "#cbd5e1" }}>
                {dataLang === "vi" ? "Hủy" : "Cancel"}
              </button>
              <button type="button" onClick={confirmExportPdf} className="rounded px-3 py-1.5 text-sm text-white" style={{ backgroundColor: paletteStyle.accent }}>
                {dataLang === "vi" ? "Xác nhận xuất" : "Confirm export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function CvPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading CV...</div>}>
      <CvInner />
    </Suspense>
  );
}
