import { HubEditor } from "@/components/admin/hub-editor/hub-editor";

export const metadata = { title: "Sửa Project Hub" };

export default async function AdminHubEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <HubEditor slug={slug} />;
}
