import { notFound } from "next/navigation";
import { EightDEditor } from "@/components/admin/smt/eight-d-editor";
import { getEightD } from "@/lib/smt/store";
import { newEightD } from "@/lib/smt/types";

export const metadata = { title: "Soạn 8D" };
export const dynamic = "force-dynamic";

export default async function SmtEightDEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return <EightDEditor initial={newEightD()} base="/smt/nhap-lieu/8d" />;
  const report = await getEightD(id).catch(() => null);
  if (!report) notFound();
  return <EightDEditor key={report.id} initial={report} base="/smt/nhap-lieu/8d" />;
}
