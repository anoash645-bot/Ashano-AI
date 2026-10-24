export const MAX_FILES = 6;
const TEXT = /\.(txt|md|csv|json|jsx?|tsx?|py|html?|css|java|c|cpp|cs|go|rs|php|rb|sql|xml|ya?ml|log|sh|ini)$/i;
const uid = () => Math.random().toString(36).slice(2, 10);
const wait = ms => new Promise(r => setTimeout(r, ms));
const readAs = (f, how) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error(`Gagal membaca ${f.name}`)); r[how](f); });
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Gambar tidak dapat dibuka (format tidak didukung browser).")); i.src = src; });

function draw(src, w, h, max, q) {
  w = w || 800; h = h || 600;
  const s = Math.min(1, max / Math.max(w, h)), c = document.createElement("canvas");
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", q);
}
function shrink(src, w, h, max, q) { let o = draw(src, w, h, max, q); if (o.length > 1100000) o = draw(src, w, h, Math.min(max, 900), 0.6); return o; }
const cut = s => (s.length > 15000 ? s.slice(0, 15000) + "\n…(dipotong, file terlalu panjang)" : s);

export async function processFile(f) {
  const id = uid(), name = f.name || "lampiran", t = f.type || "";
  if (t.startsWith("image/")) {
    if (f.size > 15e6) throw new Error(`${name}: gambar terlalu besar (maks 15 MB).`);
    const u = URL.createObjectURL(f);
    try {
      const img = await loadImg(u), w = img.naturalWidth, h = img.naturalHeight;
      return { id, name, kind: "image", images: [shrink(img, w, h, 1280, 0.78)], thumb: draw(img, w, h, 120, 0.6) };
    } finally { URL.revokeObjectURL(u); }
  }
  if (t.startsWith("video/")) {
    if (f.size > 100e6) throw new Error(`${name}: video terlalu besar (maks 100 MB).`);
    const u = URL.createObjectURL(f), v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = u;
    try {
      await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error(`${name}: browser tidak bisa membaca video ini.`)); });
      const dur = v.duration; if (!isFinite(dur) || dur <= 0) throw new Error(`${name}: durasi video tidak terbaca.`);
      const frames = []; let thumb;
      for (let i = 0; i < 5; i++) {
        const p = new Promise(r => { v.onseeked = r; });
        v.currentTime = dur * (i + 0.5) / 5;
        await Promise.race([p, wait(4000)]);
        if (i === 0) thumb = draw(v, v.videoWidth, v.videoHeight, 120, 0.6);
        frames.push(shrink(v, v.videoWidth, v.videoHeight, 1024, 0.72));
      }
      return { id, name, kind: "video", dur: Math.round(dur), images: frames, thumb };
    } finally { URL.revokeObjectURL(u); }
  }
  const isDocx = /\.docx$/i.test(name);
  if (t === "application/pdf" || /\.pdf$/i.test(name) || isDocx) {
    if (f.size > 3e6) throw new Error(`${name}: dokumen terlalu besar (maks 3 MB).`);
    const b64 = (await readAs(f, "readAsDataURL")).split(",")[1];
    const r = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: b64, kind: isDocx ? "docx" : "pdf" }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${name}: ${d.error || "gagal membaca PDF."}`);
    return { id, name, kind: isDocx ? "docx" : "pdf", text: cut(d.text) };
  }
  if (t.startsWith("text/") || t === "application/json" || TEXT.test(name)) {
    if (f.size > 2e6) throw new Error(`${name}: file teks terlalu besar (maks 2 MB).`);
    return { id, name, kind: "text", text: cut(await readAs(f, "readAsText")) };
  }
  throw new Error(`${name}: format belum didukung. Gunakan gambar, video, PDF, Word (.docx), atau file teks/kode.`);
}
