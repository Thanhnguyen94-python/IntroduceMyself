import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { FIRMWARE_BUCKET, getFirmwareRelease, listFirmwareReleases, toView, type FirmwareRelease } from "@/lib/firmware-store";

export const dynamic = "force-dynamic";

async function ensureAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(session);
}

const EDITABLE_FIELDS = [
  "board",
  "chip",
  "version",
  "channel",
  "title",
  "notes",
  "hardware",
  "app_path",
  "app_size",
  "app_sha256",
  "merged_path",
  "merged_size",
  "wiring_image",
  "flash_parts",
  "is_published"
] as const;

function pickFields(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  if (typeof out.version === "string") out.version = out.version.trim();
  if (out.channel !== undefined && out.channel !== "stable" && out.channel !== "beta") out.channel = "stable";
  return out;
}

export async function GET() {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const items = await listFirmwareReleases({ publishedOnly: false });
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot load firmware releases.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// Tạo mới (không có id) hoặc cập nhật (có id) một bản firmware.
export async function POST(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ message: "Supabase is not configured." }, { status: 500 });
    }

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) {
      return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
    }
    const fields = pickFields(payload);
    const id = typeof payload.id === "string" ? payload.id : "";

    if (!id) {
      if (!fields.version) {
        return NextResponse.json({ message: "Thiếu số phiên bản." }, { status: 400 });
      }
      const { data, error } = await supabase.from("firmware_releases").insert(fields).select("*").single();
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, item: toView(data as FirmwareRelease) });
    }

    const { data, error } = await supabase
      .from("firmware_releases")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, item: toView(data as FirmwareRelease) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot save firmware release.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// Xoá bản firmware và các file của nó trong bucket.
export async function DELETE(request: Request) {
  try {
    if (!(await ensureAdminSession())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ message: "Supabase is not configured." }, { status: 500 });
    }

    const payload = (await request.json().catch(() => null)) as { id?: string } | null;
    const id = payload?.id ?? "";
    const release = id ? await getFirmwareRelease(id) : null;
    if (!release) {
      return NextResponse.json({ message: "Not found." }, { status: 404 });
    }

    const paths = [release.app_path, release.merged_path, ...release.flash_parts.map((part) => part.path)].filter(Boolean);
    if (paths.length) {
      await supabase.storage.from(FIRMWARE_BUCKET).remove(paths);
    }
    const { error } = await supabase.from("firmware_releases").delete().eq("id", id);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot delete firmware release.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
