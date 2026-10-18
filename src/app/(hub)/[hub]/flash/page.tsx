import { notFound } from "next/navigation";
import { getHub } from "@/lib/hubs/registry";
import { HubFlasher } from "@/components/hub/hub-flasher";
import { L } from "@/components/ui/localized";

type Props = { params: Promise<{ hub: string }> };

export const metadata = { title: "Flash firmware" };

// Trang nạp firmware công khai: ai cũng truy cập được, không cần đăng nhập.
export default async function HubFlashPage({ params }: Props) {
  const { hub: slug } = await params;
  const hub = await getHub(slug);
  if (!hub?.firmware) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{hub.name} · Web Flasher</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          <L t={{ vi: "Nạp firmware ngay trên trình duyệt", en: "Flash firmware from your browser" }} />
        </h1>
        <p className="muted mt-2 max-w-2xl">
          <L
            t={{
              vi: "Không cần cài ESP-IDF hay Arduino. Cắm robot vào máy tính bằng cáp USB rồi bấm nút, trình duyệt sẽ tự ghi firmware.",
              en: "No ESP-IDF or Arduino needed. Plug the robot in over USB and press the button; the browser writes the firmware for you."
            }}
          />
        </p>
      </div>
      <HubFlasher
        hubSlug={hub.slug}
        hubName={hub.name}
        board={hub.firmware.board}
        chip={hub.firmware.chip}
        fallbackManifest={hub.firmware.fallbackManifest}
      />
    </div>
  );
}
