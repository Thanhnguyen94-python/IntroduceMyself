import Link from "next/link";
import { notFound } from "next/navigation";
import { getHub } from "@/lib/hubs/registry";
import { listHubDocs } from "@/lib/hubs/docs";
import { L, LList } from "@/components/ui/localized";
import { Reveal } from "@/components/ui/reveal";
import { MediaCarousel } from "@/components/ui/media-carousel";
import type { HubBlockId } from "@/lib/hubs/types";

type Props = { params: Promise<{ hub: string }> };

export default async function HubHomePage({ params }: Props) {
  const { hub: slug } = await params;
  const hub = await getHub(slug);
  if (!hub) notFound();

  const docs = await listHubDocs(hub.slug);
  const latest = hub.updates[0];

  // Các khối bên dưới hero, thứ tự + bật/tắt lấy từ hub.layout (Admin → Project Hubs → Bố cục).
  const blocks: Record<HubBlockId, React.ReactNode> = {
    features: (
      <>
      {/* Tính năng */}
      {hub.features.length > 0 && (
        <section>
          <Reveal>
            <p className="eyebrow">
              <L t={{ vi: "Tính năng", en: "Features" }} />
            </p>
            <h2 className="section-title mt-2">
              <L t={{ vi: "Robot làm được gì?", en: "What can it do?" }} />
            </h2>
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hub.features.map((feature, idx) => (
              <Reveal key={idx} delay={idx * 60} className="card">
                <p className="text-2xl">{feature.icon}</p>
                <h3 className="mt-2 font-semibold">
                  <L t={feature.title} />
                </h3>
                <p className="muted mt-1 text-sm">
                  <L t={feature.text} />
                </p>
              </Reveal>
            ))}
          </div>
        </section>
      )}
      </>
    ),
    "specs-docs": (
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Thông số */}
        {hub.specs.length > 0 && (
          <Reveal className="card">
            <h2 className="text-lg font-bold">
              <L t={{ vi: "Thông số chính", en: "Key specs" }} />
            </h2>
            <dl className="mt-3 divide-y text-sm" style={{ borderColor: "var(--border)" }}>
              {hub.specs.map((spec, idx) => (
                <div key={idx} className="flex justify-between gap-4 py-2" style={{ borderColor: "var(--border)" }}>
                  <dt className="muted">
                    <L t={spec.label} />
                  </dt>
                  <dd className="text-right font-medium">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        )}

        {/* Lối tắt tài liệu theo nhóm */}
        <Reveal delay={80} className="card">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">
              <L t={{ vi: "Bắt đầu từ đâu?", en: "Where to start?" }} />
            </h2>
            <Link href={`/${hub.slug}/docs`} className="text-sm font-semibold text-brand-600 dark:text-brand-300">
              <L t={{ vi: "Tất cả tài liệu →", en: "All docs →" }} />
            </Link>
          </div>
          <ol className="mt-3 space-y-2">
            {docs.slice(0, 6).map((doc, idx) => (
              <li key={doc.path}>
                <Link
                  href={doc.path}
                  className="group flex items-start gap-3 rounded-xl border p-3 transition hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-slate-800/60"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">{idx + 1}</span>
                  <span className="min-w-0">
                    <span className="block font-medium group-hover:text-brand-600 dark:group-hover:text-brand-300">{doc.title}</span>
                    {doc.description && <span className="muted block truncate text-xs">{doc.description}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>
    ),
    latest: (
      <>
      {latest && (
        <Reveal className="card">
          <p className="eyebrow">
            <L t={{ vi: "Bản cập nhật mới nhất", en: "Latest update" }} />
          </p>
          <h2 className="mt-2 text-lg font-bold">
            v{latest.version} · <L t={latest.title} />
          </h2>
          <LList t={latest.notes} className="muted mt-2 list-disc space-y-1 pl-5 text-sm" />
        </Reveal>
      )}
      </>
    )
  };

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border p-6 sm:p-10" style={{ borderColor: "var(--border)" }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <p className="eyebrow">Project Hub · {hub.firmware?.chip ?? "Open hardware"}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              <span className="gradient-text">{hub.name}</span>
            </h1>
            <p className="mt-3 text-lg font-medium">
              <L t={hub.tagline} />
            </p>
            <p className="muted mt-3 max-w-2xl">
              <L t={hub.description} />
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {hub.firmware && (
                <Link href={`/${hub.slug}/flash`} className="btn-primary">
                  ⚡ <L t={{ vi: "Nạp firmware ngay", en: "Flash firmware" }} />
                </Link>
              )}
              <Link href={docs[0]?.path ?? `/${hub.slug}/docs`} className="btn-ghost">
                📘 <L t={{ vi: "Đọc hướng dẫn", en: "Read the docs" }} />
              </Link>
            </div>
            {latest && (
              <Link href={`/${hub.slug}/updates`} className="chip mt-5 gap-2 hover:border-brand-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                v{latest.version} · <L t={latest.title} />
              </Link>
            )}
          </Reveal>
          {hub.media.length > 0 && (
            <Reveal delay={120}>
              <MediaCarousel items={hub.media} interval={hub.mediaInterval} autoplayVideo={hub.autoplayVideo} alt={hub.name} />
            </Reveal>
          )}
        </div>
      </section>

      {hub.layout
        .filter((block) => block.enabled)
        .map((block) => (
          <div key={block.id}>{blocks[block.id]}</div>
        ))}
    </div>
  );
}
