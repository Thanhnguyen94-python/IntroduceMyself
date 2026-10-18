import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubHeader } from "@/components/layout/hub-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MaintenanceNotice } from "@/components/hub/maintenance-notice";
import { getHub, hubVisibilityKey, listHubs, toHubSummary } from "@/lib/hubs/registry";
import { readSiteVisibility } from "@/lib/site-visibility-store";
import { isPageEnabled } from "@/lib/site-visibility-types";

// Không gian Project Hub (/<hub>): tài liệu, nạp firmware, cập nhật cho maker.
// Đọc visibility mỗi request để nút bật/tắt trong Admin có hiệu lực ngay.
export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ hub: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hub: slug } = await params;
  const hub = await getHub(slug);
  if (!hub) return {};
  return {
    title: { default: `${hub.name} · Project Hub`, template: `%s · ${hub.name}` },
    description: hub.tagline.vi
  };
}

export default async function HubLayout({ children, params }: Props) {
  const { hub: slug } = await params;
  const hub = await getHub(slug);
  if (!hub) notFound();

  const [visibility, hubs] = await Promise.all([readSiteVisibility(), listHubs()]);
  const enabled = isPageEnabled(visibility, hubVisibilityKey(hub.slug));

  return (
    <>
      <HubHeader hub={toHubSummary(hub)} hasFirmware={Boolean(hub.firmware)} otherHubs={hubs.filter((it) => it.slug !== hub.slug).map(toHubSummary)} />
      <main className="mx-auto max-w-7xl px-4 py-8">{enabled ? children : <MaintenanceNotice />}</main>
      <SiteFooter variant="hub" />
    </>
  );
}
