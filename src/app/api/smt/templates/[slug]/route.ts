import { findTemplate } from "@/lib/smt/catalog";
import { smtAccess } from "@/lib/smt/gate";
import { readSmtSettings } from "@/lib/smt/store";
import { blankTemplate } from "@/lib/smt/workbooks";
import { buildXlsx } from "@/lib/smt/xlsx";

export const dynamic = "force-dynamic";

// Tải mẫu Excel trống (có công thức + danh sách chọn): /api/smt/templates/<slug>
// Link công khai, dùng được trên trang Tài liệu. Tắt khi công tắc "Mẫu báo cáo SMT" tắt.
export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const template = findTemplate(slug);
  if (!template) return new Response("Not found", { status: 404 });
  if (!(await smtAccess()).open) return new Response("Đang bảo trì", { status: 503 });
  const bytes = buildXlsx(blankTemplate(template.slug, await readSmtSettings()));
  const filename = `${template.code}_${template.slug}_template.xlsx`;
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
