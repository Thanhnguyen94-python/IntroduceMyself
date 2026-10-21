import { redirect } from "next/navigation";
import { TABULAR_DATASETS } from "@/lib/smt/datasets";
import { datasetVisible } from "@/lib/smt/modules";
import { workspaceContext } from "@/lib/smt/workspace";

export default async function DataEntryIndex() {
  const ctx = await workspaceContext();
  const first = TABULAR_DATASETS.find((k) => datasetVisible(ctx.liveModules, k));
  redirect(first ? `/smt/nhap-lieu/${first}` : "/smt/nhap-lieu/8d");
}
