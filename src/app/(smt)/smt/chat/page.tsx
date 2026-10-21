import { redirect } from "next/navigation";
import { ChatRoom } from "@/components/smt-workspace/chat-room";
import { L } from "@/components/ui/localized";
import { isStaff } from "@/lib/smt/permissions";
import { readSmtSettings } from "@/lib/smt/store";
import { workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thảo luận" };

// Nhóm chat nội bộ: luôn là dữ liệu thật (không theo nút Demo / Thực tế), chỉ người đã đăng nhập.
export default async function SmtChatPage() {
  const ctx = await workspaceContext();
  if (!ctx.actor) redirect("/smt/dang-nhap?next=/smt/chat");
  const settings = await readSmtSettings();
  return (
    <div className="space-y-3">
      <p className="muted text-xs">
        <L t={{ vi: "Trao đổi công việc tại đây để được ghi nhận vào báo cáo ngày / tuần. Tin đánh dấu ⚠ Vấn đề sẽ được theo dõi đến khi xử lý xong.", en: "Discuss work here so it is captured in daily / weekly reports. Messages marked ⚠ Issue are tracked until resolved." }} />
      </p>
      <ChatRoom me={{ id: ctx.actor.id, name: ctx.actor.name, role: ctx.actor.role }} lines={settings.lines.map((l) => l.code)} defectCodes={settings.defectCatalog.map((d) => d.code)} staff={isStaff(ctx.actor)} />
    </div>
  );
}
