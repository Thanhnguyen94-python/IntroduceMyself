import { notFound } from "next/navigation";
import { EightDEditor } from "@/components/admin/smt/eight-d-editor";
import { getEightD } from "@/lib/smt/store";
import { newEightD } from "@/lib/smt/types";

export const metadata = { title: "SMT · Soạn 8D" };
export const dynamic = "force-dynamic";

// /admin/smt/8d/new = mở 8D mới, /admin/smt/8d/<id> = sửa.
export default async function SmtEightDPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return <EightDEditor initial={newEightD()} />;
  const report = await getEightD(id).catch(() => null);
  if (!report) notFound();
  return <EightDEditor key={report.id} initial={report} />;
}
