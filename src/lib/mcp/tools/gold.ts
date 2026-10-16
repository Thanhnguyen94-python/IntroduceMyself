import { cached } from "../cache";

const BTMC_ENDPOINT = "https://api.btmc.vn/api/BTMCAPI/getpricebtmc";
const BTMC_KEY = process.env.BTMC_API_KEY ?? "3kd8ub1llcg9t45hnoh8hmn7t5kc2v";

type GoldItem = { name: string; buy: number; sell: number; updatedAt: string };

export async function handleGiaVang(args: Record<string, unknown>, lang: "vi" | "en") {
  const keyword = typeof args.keyword === "string" ? args.keyword.trim().toLowerCase() : "";

  const all = await cached<GoldItem[]>("gold:btmc", 3 * 60 * 1000, fetchBtmc);

  let items = all;
  if (keyword) {
    const filtered = all.filter((x) => x.name.toLowerCase().includes(keyword));
    items = filtered.length ? filtered : all;
  }
  items = items.slice(0, 6);

  if (!items.length) {
    return { text: "Không lấy được dữ liệu giá vàng từ BTMC.", data: { items: [] } };
  }

  const updatedAt = items[0].updatedAt;
  const lines = items.map(
    (x) => `- ${x.name}: mua ${formatVnd(x.buy)} – bán ${formatVnd(x.sell)}`
  );

  const header =
    lang === "vi"
      ? `Giá vàng (nguồn BTMC, cập nhật ${updatedAt}):`
      : `Gold prices (BTMC, updated ${updatedAt}):`;

  return {
    text: `${header}\n${lines.join("\n")}`,
    data: { source: "btmc", updatedAt, items }
  };
}

async function fetchBtmc(): Promise<GoldItem[]> {
  const url = `${BTMC_ENDPOINT}?key=${encodeURIComponent(BTMC_KEY)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`BTMC API thất bại: ${res.status}`);
  const json = await res.json();
  const list: Array<Record<string, string>> = json?.DataList?.Data ?? [];

  return list
  .map((row: Record<string, string>) => ({
    name: String(row["@n_1"] ?? "").trim(),
    buy: toNumber(row["@pb_1"]),
    sell: toNumber(row["@ps_1"]),
    updatedAt: String(row["@d_1"] ?? "")
  }))
  .filter((x: { name: string }) => Boolean(x.name));
}

function toNumber(raw: unknown) {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatVnd(n: number) {
  if (!n) return "N/A";
  return `${(n / 1_000_000).toFixed(2)} triệu đ/lượng`;
}