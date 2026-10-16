import { cached } from "../cache";

const WMO_VI: Record<number, string> = {
  0: "Trời quang",
  1: "Ít mây", 2: "Mây rải rác", 3: "U ám",
  45: "Sương mù", 48: "Sương mù đóng băng",
  51: "Mưa phùn nhẹ", 53: "Mưa phùn vừa", 55: "Mưa phùn nặng",
  61: "Mưa nhẹ", 63: "Mưa vừa", 65: "Mưa to",
  71: "Tuyết nhẹ", 73: "Tuyết vừa", 75: "Tuyết dày",
  80: "Mưa rào nhẹ", 81: "Mưa rào vừa", 82: "Mưa rào lớn",
  95: "Dông", 96: "Dông kèm mưa đá", 99: "Dông lớn kèm mưa đá"
};

type Geo = { name: string; country: string; lat: number; lon: number };
type Weather = {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  weather_code: number;
  wind_speed_10m: number;
};

export async function handleThoiTiet(args: Record<string, unknown>, lang: "vi" | "en") {
  const city = typeof args.city === "string" ? args.city.trim() : "";
  if (!city) throw new Error("Thiếu tham số 'city' (tên thành phố)");

  const geo = await cached<Geo>(`geo:${city.toLowerCase()}:${lang}`, 24 * 60 * 60 * 1000, async () => {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", city);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", lang === "vi" ? "vi" : "en");
    url.searchParams.set("format", "json");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Geocoding thất bại: ${res.status}`);
    const data = await res.json();
    const top = data?.results?.[0];
    if (!top) throw new Error(`Không tìm thấy thành phố: ${city}`);
    return { name: top.name, country: top.country ?? "", lat: top.latitude, lon: top.longitude };
  });

  const weather = await cached<Weather>(`weather:${geo.lat},${geo.lon}`, 5 * 60 * 1000, async () => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(geo.lat));
    url.searchParams.set("longitude", String(geo.lon));
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"
    );
    url.searchParams.set("timezone", "auto");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Weather API thất bại: ${res.status}`);
    const data = await res.json();
    return data.current as Weather;
  });

  const desc = WMO_VI[weather.weather_code] ?? (lang === "vi" ? "Không xác định" : "Unknown");

  const text =
    lang === "vi"
      ? `Thời tiết tại ${geo.name}${geo.country ? ", " + geo.country : ""}: ${desc}, ${weather.temperature_2m}°C (cảm giác ${weather.apparent_temperature}°C), độ ẩm ${weather.relative_humidity_2m}%, gió ${weather.wind_speed_10m} km/h.`
      : `Weather in ${geo.name}${geo.country ? ", " + geo.country : ""}: ${desc}, ${weather.temperature_2m}°C (feels like ${weather.apparent_temperature}°C), humidity ${weather.relative_humidity_2m}%, wind ${weather.wind_speed_10m} km/h.`;

  return {
    text,
    data: {
      city: geo.name,
      country: geo.country,
      temperature: weather.temperature_2m,
      feelsLike: weather.apparent_temperature,
      humidity: weather.relative_humidity_2m,
      windKmh: weather.wind_speed_10m,
      description: desc,
      code: weather.weather_code
    }
  };
}