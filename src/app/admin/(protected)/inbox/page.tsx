import { Suspense } from "react";
import { Inbox } from "@/components/admin/inbox/inbox";

export const metadata = { title: "Hộp thư" };

export default function AdminInboxPage() {
  return (
    <Suspense fallback={<section className="card">Đang tải hộp thư...</section>}>
      <Inbox />
    </Suspense>
  );
}
