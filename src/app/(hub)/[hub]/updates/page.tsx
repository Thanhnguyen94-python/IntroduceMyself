import Link from "next/link";
import { notFound } from "next/navigation";
import { getHub } from "@/lib/hubs/registry";
import { listFirmwareReleases } from "@/lib/firmware-store";
import { L, LList } from "@/components/ui/localized";
import { Reveal } from "@/components/ui/reveal";

type Props = { params: Promise<{ hub: string }> };

export const metadata = { title: "Updates" };

async function loadReleases(board: string | undefined) {
  if (!board) return [];
  try {
    return await listFirmwareReleases({ publishedOnly: true, board });
  } catch {
    // Supabase chưa cấu hình (môi trường local) -> chỉ hiện changelog trong hub.json.
    return [];
  }
}

export default async function HubUpdatesPage({ params }: Props) {
  const { hub: slug } = await params;
  const hub = await getHub(slug);
  if (!hub) notFound();

  const releases = await loadReleases(hub.firmware?.board);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="eyebrow">{hub.name}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          <L t={{ vi: "Nhật ký cập nhật", en: "Changelog" }} />
        </h1>
      </div>

      {releases.length > 0 && (
        <section className="card space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold">
              <L t={{ vi: "Bản firmware đang phát hành", en: "Published firmware" }} />
            </h2>
            {hub.firmware && (
              <Link href={`/${hub.slug}/flash`} className="text-sm font-semibold text-brand-600 dark:text-brand-300">
                <L t={{ vi: "Nạp ngay →", en: "Flash now →" }} />
              </Link>
            )}
          </div>
          <ul className="divide-y text-sm" style={{ borderColor: "var(--border)" }}>
            {releases.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-semibold">
                  v{it.version}
                  {it.channel === "beta" && <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">BETA</span>}
                  {it.title && <span className="muted ml-2 font-normal">{it.title}</span>}
                </span>
                <span className="muted text-xs">{new Date(it.updated_at).toLocaleDateString("vi-VN")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ol className="relative space-y-6 border-l pl-6" style={{ borderColor: "var(--border)" }}>
        {hub.updates.map((update, idx) => (
          <Reveal as="li" key={`${update.version}-${idx}`} delay={idx * 60} className="relative">
            <span className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-500 dark:border-slate-900" />
            <p className="muted text-xs">{update.date}</p>
            <h2 className="mt-1 text-lg font-bold">
              v{update.version} · <L t={update.title} />
              {update.channel === "beta" && <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 align-middle text-[10px] text-white">BETA</span>}
            </h2>
            <LList t={update.notes} className="muted mt-2 list-disc space-y-1 pl-5 text-sm" />
          </Reveal>
        ))}
      </ol>
    </div>
  );
}
