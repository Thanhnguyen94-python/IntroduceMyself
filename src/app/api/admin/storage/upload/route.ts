import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const allowedBuckets = new Set(["images", "videos", "docs"]);

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase is not configured." }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const bucket = String(formData?.get("bucket") ?? "images").trim();
  const folder = String(formData?.get("folder") ?? "admin").trim();
  const file = formData?.get("file");

  if (!allowedBuckets.has(bucket)) {
    return NextResponse.json({ message: "Invalid bucket." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Missing file." }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name || "upload.bin");
  const objectPath = `${folder}/${Date.now()}-${safeName}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

  if (uploadError) {
    return NextResponse.json({ message: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  try {
    await supabase.from("media_assets").insert({
      bucket,
      path: objectPath,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size
    });
  } catch {
    // Metadata insert is non-blocking for upload success.
  }

  return NextResponse.json({
    ok: true,
    bucket,
    path: objectPath,
    publicUrl: publicData.publicUrl
  });
}
