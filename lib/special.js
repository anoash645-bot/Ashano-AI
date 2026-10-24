export const SPECIAL_ANSWER = "Tentu saja sang Mahakuasa Yantinya Richo, Putry Djaelani";

export function normalize(m) {
  return String(m).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
const BEAUTY = /\b(tercantik|paling (cantik|indah|menawan|jelita)|most beautiful|prettiest|beautifulest)\b/;
const WOMAN = /\b(manusia|wanita|perempuan|cewek|gadis|orang|woman|girl|person|human)\b/;
const RICHMOND = /\b(richmond|richo|longdong|pencipta|pembuatmu|penciptamu|creator|owner)\b/;
const VERSION = /\b(dunianya|dunia nya|versi|menurut|di mata|bagi|according)\b/;

// true = pasti, "maybe" = ambigu (diputuskan classifier AI), false = bukan.
export function beautyIntent(message) {
  const t = normalize(message);
  if (t.length < 6 || t.length > 300) return false;
  if (!BEAUTY.test(t)) return false;              // hanya menyebut nama => TIDAK terpicu
  const ref = RICHMOND.test(t);
  if (ref && (WOMAN.test(t) || VERSION.test(t) || /\b(siapa|who)\b/.test(t))) return true;
  if (/\b(siapa|who)\b/.test(t) && VERSION.test(t)) return "maybe";
  return false;
}

export async function aiIntentCheck(message, history, key, model, base = "https://api.openai.com/v1") {
  try {
    const ctx = (history || []).slice(-4).map(m => `${m.role}: ${m.content}`).join("\n");
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0, max_tokens: 3, messages: [
        { role: "system", content: "Jawab hanya YA atau TIDAK. YA jika pesan terakhir menanyakan siapa perempuan/manusia TERCANTIK menurut/di dunianya Richmond (pemilik/pencipta aplikasi ini), termasuk pertanyaan lanjutan yang jelas merujuk ke pertanyaan itu. TIDAK untuk lainnya, termasuk pertanyaan kecantikan umum atau sekadar menyebut sebuah nama." },
        { role: "user", content: `${ctx}\nuser: ${message}` }] }),
    });
    const d = await r.json();
    return /^ya/i.test(d?.choices?.[0]?.message?.content?.trim() || "");
  } catch { return false; }
}
