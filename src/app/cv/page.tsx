"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getExperienceData, getSiteData } from "@/lib/content/loaders";

function CvInner() {
  const search = useSearchParams();
  const site = getSiteData();
  const exp = getExperienceData();

  useEffect(() => {
    if (search.get("print") === "1") {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [search]);

  return (
    <section className="mx-auto max-w-4xl rounded-xl border bg-white p-8 text-slate-900" style={{ borderColor: "#cbd5e1" }}>
      <h1 className="text-3xl font-bold">{site.profile.fullName} ({site.profile.displayName})</h1>
      <p className="mt-1 text-lg text-brand-700">{site.profile.title.vi}</p>
      <p className="mt-1 text-sm">📱 {site.profile.phone} | ✉ {site.profile.email}</p>
      <hr className="my-6" />
      <h2 className="text-xl font-semibold text-brand-700">Tóm tắt kinh nghiệm</h2>
      <ul className="mt-2 list-disc pl-5">
        {site.highlights.vi.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <h2 className="mt-6 text-xl font-semibold text-brand-700">Kinh nghiệm làm việc</h2>
      <div className="mt-3 space-y-4">
        {exp.items.map((item) => (
          <div key={item.id}>
            <p className="font-semibold">{item.company} - {item.role.vi}</p>
            <p className="text-sm text-slate-600">{item.startDate} - {item.endDate}</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {item.responsibilities.vi.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
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
