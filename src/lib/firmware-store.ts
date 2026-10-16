import { getSupabaseServerClient } from "@/lib/supabase/server";

export const FIRMWARE_BUCKET = "firmware";

export type FirmwareChannel = "stable" | "beta";

export type FlashPartRecord = {
  path: string;
  offset: number;
  size: number;
};

export type FirmwareRelease = {
  id: string;
  board: string;
  chip: string;
  version: string;
  channel: FirmwareChannel;
  title: string;
  notes: string;
  hardware: string;
  app_path: string;
  app_size: number;
  app_sha256: string;
  merged_path: string;
  merged_size: number;
  wiring_image: string;
  flash_parts: FlashPartRecord[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type FirmwareReleaseView = FirmwareRelease & {
  app_url: string;
  merged_url: string;
  part_urls: Array<{ url: string; offset: number; size: number }>;
  can_flash: boolean;
};

const COLUMNS =
  "id,board,chip,version,channel,title,notes,hardware,app_path,app_size,app_sha256,merged_path,merged_size,wiring_image,flash_parts,is_published,created_at,updated_at";

// So sánh phiên bản dạng "2.2.10" > "2.2.9"; phần không phải số so như chuỗi.
export function compareVersions(a: string, b: string) {
  const pa = a.trim().replace(/^v/i, "").split(/[.\-+]/);
  const pb = b.trim().replace(/^v/i, "").split(/[.\-+]/);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] ?? "0";
    const y = pb[i] ?? "0";
    const nx = Number(x);
    const ny = Number(y);
    if (Number.isFinite(nx) && Number.isFinite(ny)) {
      if (nx !== ny) return nx > ny ? 1 : -1;
    } else if (x !== y) {
      return x > y ? 1 : -1;
    }
  }
  return 0;
}

export function publicFileUrl(path: string) {
  if (!path) return "";
  const supabase = getSupabaseServerClient();
  if (!supabase) return "";
  return supabase.storage.from(FIRMWARE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function toView(row: FirmwareRelease): FirmwareReleaseView {
  const parts = Array.isArray(row.flash_parts) ? row.flash_parts : [];
  const merged_url = publicFileUrl(row.merged_path);
  return {
    ...row,
    flash_parts: parts,
    app_url: publicFileUrl(row.app_path),
    merged_url,
    part_urls: parts.map((part) => ({ url: publicFileUrl(part.path), offset: part.offset, size: part.size })),
    can_flash: parts.length > 0 || Boolean(merged_url)
  };
}

export async function listFirmwareReleases(options: { publishedOnly: boolean; board?: string }) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured.");

  let query = supabase.from("firmware_releases").select(COLUMNS).order("created_at", { ascending: false });
  if (options.publishedOnly) query = query.eq("is_published", true);
  if (options.board) query = query.eq("board", options.board);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as FirmwareRelease[]).map(toView);
}

export async function getFirmwareRelease(id: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.from("firmware_releases").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toView(data as FirmwareRelease) : null;
}

// Bản mới nhất đã publish cho board + kênh (so theo số phiên bản, không theo ngày tạo).
export async function getLatestFirmware(board: string, channel: FirmwareChannel) {
  const releases = await listFirmwareReleases({ publishedOnly: true, board });
  const candidates = releases.filter((it) => it.channel === channel && it.app_path);
  candidates.sort((a, b) => compareVersions(b.version, a.version));
  return candidates[0] ?? null;
}
