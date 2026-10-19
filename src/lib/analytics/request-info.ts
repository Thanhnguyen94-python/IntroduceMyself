// Thông tin suy ra từ request (không lưu IP): vị trí gần đúng từ header của Vercel, thiết bị từ User-Agent.

export type RequestInfo = {
  country: string | null;
  region: string | null;
  city: string | null;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  isBot: boolean;
};

const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch/i;

function header(request: Request, name: string) {
  const value = request.headers.get(name);
  if (!value) return null;
  try {
    return decodeURIComponent(value).slice(0, 80);
  } catch {
    return value.slice(0, 80);
  }
}

export function parseUserAgent(ua: string) {
  const s = ua || "";
  const isTablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(s);
  const isMobile = !isTablet && /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(s);

  let browser = "Khác";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung Internet";
  else if (/CocCoc|coc_coc/i.test(s)) browser = "Cốc Cốc";
  else if (/Zalo/i.test(s)) browser = "Zalo (trong app)";
  else if (/FBAN|FBAV|FB_IAB/.test(s)) browser = "Facebook (trong app)";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s)) browser = "Safari";

  let os = "Khác";
  if (/Windows NT/.test(s)) os = "Windows";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/Mac OS X/.test(s)) os = "macOS";
  else if (/CrOS/.test(s)) os = "ChromeOS";
  else if (/Linux/.test(s)) os = "Linux";

  return { device: (isTablet ? "tablet" : isMobile ? "mobile" : "desktop") as RequestInfo["device"], browser, os, isBot: BOT_PATTERN.test(s) };
}

export function getRequestInfo(request: Request): RequestInfo {
  const ua = parseUserAgent(request.headers.get("user-agent") ?? "");
  return {
    country: header(request, "x-vercel-ip-country"),
    region: header(request, "x-vercel-ip-country-region"),
    city: header(request, "x-vercel-ip-city"),
    ...ua
  };
}
