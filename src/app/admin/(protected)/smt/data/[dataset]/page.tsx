import { notFound } from "next/navigation";
import { DatasetManager } from "@/components/admin/smt/dataset-manager";
import { DATASETS, TABULAR_DATASETS, type DatasetKey } from "@/lib/smt/datasets";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ dataset: string }> }) {
  const def = DATASETS[(await params).dataset as DatasetKey];
  return { title: def ? `SMT · ${def.label}` : "SMT" };
}

export default async function SmtDatasetPage({ params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  if (!TABULAR_DATASETS.includes(dataset as DatasetKey)) notFound();
  return <DatasetManager dataset={dataset as DatasetKey} />;
}
