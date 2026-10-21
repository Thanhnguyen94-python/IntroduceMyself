import { notFound } from "next/navigation";
import { DatasetManager } from "@/components/admin/smt/dataset-manager";
import { DATASETS, TABULAR_DATASETS, type DatasetKey } from "@/lib/smt/datasets";
import { datasetVisible } from "@/lib/smt/modules";
import { workspaceContext } from "@/lib/smt/workspace";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ dataset: string }> }) {
  const def = DATASETS[(await params).dataset as DatasetKey];
  return { title: def ? `Nhập liệu · ${def.label}` : "Nhập liệu" };
}

export default async function SmtDataEntryPage({ params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  if (!TABULAR_DATASETS.includes(dataset as DatasetKey)) notFound();
  // Nhập liệu luôn ghi dữ liệu thật -> lọc thanh chọn theo Phạm vi quản lý của dữ liệu thật.
  // Bộ đang ẩn vẫn mở được bằng link trực tiếp (chỉ ẩn khỏi thanh chọn, không khoá).
  const ctx = await workspaceContext();
  const tabs = TABULAR_DATASETS.filter((k) => k === dataset || datasetVisible(ctx.liveModules, k));
  return <DatasetManager dataset={dataset as DatasetKey} base="/smt/nhap-lieu" tabs={tabs} />;
}
