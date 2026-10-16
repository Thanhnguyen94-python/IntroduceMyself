import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { FIRMWARE_BUCKET } from "@/lib/firmware-store";

export const dynamic = "force-dynamic";

// Vercel giới hạn body ~4.5 MB nên file firmware (3-8 MB) không đi qua server:
// server chỉ cấp signed upload URL, trình duyệt PUT thẳng file lên Supabase Storage.

const KINDS = new Set(["app", "merged", "wiring"]);

function slug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ message: "Supabase is not configured." }, { status: 500 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { kind?: string; board?: string; version?: string; fileName?: string }
    | null;
  const kind = payload?.kind ?? "";
  if (!KINDS.has(kind)) {
    return NextResponse.json({ message: "Invalid kind." }, { status: 400 });
  }

  const board = slug(payload?.board || "board") || "board";
  const version = slug(payload?.version || "unversioned") || "unversioned";
  const fileName = slug(payload?.fileName || `${kind}.bin`) || `${kind}.bin`;
  const objectPath = `${board}/${version}/${kind}-${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage.from(FIRMWARE_BUCKET).createSignedUploadUrl(objectPath);
  if (error || !data) {
    return NextResponse.json({ message: `Cannot create upload URL: ${error?.message ?? "unknown"}` }, { status: 500 });
  }

  const publicUrl = supabase.storage.from(FIRMWARE_BUCKET).getPublicUrl(objectPath).data.publicUrl;
  return NextResponse.json({ ok: true, path: objectPath, signedUrl: data.signedUrl, publicUrl });
}
