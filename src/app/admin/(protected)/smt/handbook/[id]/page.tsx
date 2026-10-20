import { notFound } from "next/navigation";
import { HandbookEditor } from "@/components/admin/handbook/handbook-editor";
import { getEntry } from "@/lib/handbook/store";
import { emptyEntry } from "@/lib/handbook/types";

export const metadata = { title: "SMT · Sửa sổ tay" };
export const dynamic = "force-dynamic";

// /admin/smt/handbook/new = thêm mục, /admin/smt/handbook/<id> = sửa.
export default async function AdminHandbookEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return <HandbookEditor initial={emptyEntry()} />;
  const entry = await getEntry(id).catch(() => null);
  if (!entry) notFound();
  return <HandbookEditor key={entry.id} initial={entry} />;
}
