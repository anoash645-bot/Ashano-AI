const J = async (url, opt) => { const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(String(r.status)); return r.json(); };
const fn = (name, description, properties, required) => ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });

export const STATUS = { calculator: "🧮 Menghitung…", get_weather: "🌤️ Mengecek cuaca…", web_search: "🔎 Mencari di web…" };

export function getTools() {
  const t = [
    fn("calculator", "Hitung ekspresi matematika dengan tepat. Hanya angka, + - * / ^ % dan tanda kurung. Tulis desimal dengan titik (3.5), tanpa pemisah ribuan.", { expression: { type: "string" } }, ["expression"]),
    fn("get_weather", "Cuaca saat ini dan prakiraan 3 hari untuk sebuah kota.", { city: { type: "string", description: "Nama kota, mis. Jakarta" } }, ["city"]),
  ];
  if (process.env.TAVILY_API_KEY) t.push(fn("web_search", "Cari informasi terkini di internet: berita, harga, fakta yang bisa berubah, atau hal yang tidak kamu ketahui.", { query: { type: "string" } }, ["query"]));
  return t;
}

export async function runTool(name, a) {
  try {
    if (name === "calculator") {
      const e = String(a.expression || "").replace(/\^/g, "**");
      if (!/^[\d\s+\-*/().%]+$/.test(e) || e.length > 200) return { text: "Ekspresi tidak valid." };
      const v = Function(`"use strict";return (${e})`)();
      return { text: Number.isFinite(v) ? String(v) : "Hasil tidak terdefinisi." };
    }
    if (name === "get_weather") {
      const g = await J(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(String(a.city || ""))}&count=1&language=id`);
      const p = g.results?.[0]; if (!p) return { text: "Kota tidak ditemukan." };
      const w = await J(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`);
      return { text: JSON.stringify({ lokasi: `${p.name}, ${p.country}`, sekarang: w.current, prakiraan: w.daily, satuan: w.current_units, catatan: "weather_code = kode cuaca WMO. Sumber: Open-Meteo" }) };
    }
    if (name === "web_search" && process.env.TAVILY_API_KEY) {
      const d = await J("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` }, body: JSON.stringify({ query: String(a.query || "").slice(0, 300), max_results: 5 }) });
      const rs = (d.results || []).slice(0, 5);
      return { text: rs.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${(r.content || "").slice(0, 600)}`).join("\n\n") || "Tidak ada hasil.", sources: rs.filter(r => /^https?:\/\//.test(r.url)).map(r => ({ title: r.title || r.url, url: r.url })) };
    }
    return { text: "Alat tidak tersedia." };
  } catch { return { text: "Alat gagal dijalankan (koneksi atau layanan bermasalah)." }; }
}
