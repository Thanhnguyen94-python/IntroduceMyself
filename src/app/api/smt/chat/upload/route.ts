import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { currentActor } from "@/lib/smt/accounts";
import { deny } from "@/lib/smt/api-helpers";

export const dynamic = "force-dynamic";

// Ảnh đính kèm chat. Trình duyệt đã nén (≤ 1600px, JPEG/WebP) trước khi gửi -> giới hạn 1.5 MB / ảnh.
// Supabase: bucket "images", thư mục smt-chat/<yyyy-mm>/. Local không có Supabase: public/uploads/smt-chat/.
const MAX_BYTES = 1.5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  if (!(await currentActor())) return deny("Cần đăng nhập.", 401);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return deny("Thiếu file.", 400);
  const ext = TYPES[file.type];
  if (!ext) return deny("Chỉ nhận ảnh JPG / PNG / WebP.", 400);
  if (file.size > MAX_BYTES) return deny("Ảnh quá lớn (tối đa 1.5 MB sau khi nén).", 400);
  const name = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.storage.from("images").upload(`smt-chat/${name}`, bytes, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ message: `Tải ảnh thất bại: ${error.message}` }, { status: 500 });
    return NextResponse.json({ ok: true, url: supabase.storage.from("images").getPublicUrl(`smt-chat/${name}`).data.publicUrl });
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") return NextResponse.json({ message: "Supabase chưa được cấu hình." }, { status: 500 });
  const dir = path.join(process.cwd(), "public", "uploads", "smt-chat", name.slice(0, 7));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name.slice(8)), bytes);
  return NextResponse.json({ ok: true, url: `/uploads/smt-chat/${name}` });
}
