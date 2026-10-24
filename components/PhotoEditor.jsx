"use client";
import { useEffect, useRef, useState } from "react";
const DEF = { b: 100, c: 100, s: 100, sh: 0, rot: 0 };
const SLIDERS = [["b", "Kecerahan", 50, 150], ["c", "Kontras", 50, 150], ["s", "Saturasi", 0, 200], ["sh", "Ketajaman", 0, 100]];

function sharpen(x, w, h, a) {
  const src = x.getImageData(0, 0, w, h), dst = x.createImageData(w, h), s = src.data, t = dst.data;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    const k = (y * w + i) * 4;
    for (let ch = 0; ch < 3; ch++) {
      const v = s[k + ch], n = s[(Math.max(y - 1, 0) * w + i) * 4 + ch], so = s[(Math.min(y + 1, h - 1) * w + i) * 4 + ch],
        we = s[(y * w + Math.max(i - 1, 0)) * 4 + ch], e = s[(y * w + Math.min(i + 1, w - 1)) * 4 + ch];
      t[k + ch] = v + a * (4 * v - n - so - we - e);
    }
    t[k + 3] = 255;
  }
  x.putImageData(dst, 0, 0);
}
function render(img, o, cv) {
  const sw = o.rot % 180 !== 0, w = sw ? img.height : img.width, h = sw ? img.width : img.height;
  cv.width = w; cv.height = h;
  const x = cv.getContext("2d");
  x.save(); x.translate(w / 2, h / 2); x.rotate(o.rot * Math.PI / 180); x.drawImage(img, -img.width / 2, -img.height / 2); x.restore();
  const d = x.getImageData(0, 0, w, h), p = d.data, b = (o.b - 100) * 2.55, c = o.c / 100, s = o.s / 100;
  for (let i = 0; i < p.length; i += 4) {
    const l = .299 * p[i] + .587 * p[i + 1] + .114 * p[i + 2];
    for (let k = 0; k < 3; k++) p[i + k] = (l + (p[i + k] - l) * s - 128) * c + 128 + b;
  }
  x.putImageData(d, 0, 0);
  if (o.sh > 0) sharpen(x, w, h, o.sh / 100);
}

export default function PhotoEditor({ src, name, onSave, onClose }) {
  const cv = useRef(null), im = useRef(null);
  const [o, setO] = useState(DEF), [ready, setReady] = useState(false);
  useEffect(() => { const i = new Image(); i.onload = () => { im.current = i; setReady(true); }; i.src = src; }, [src]);
  useEffect(() => { if (ready) render(im.current, o, cv.current); }, [ready, o]);
  useEffect(() => { const h = e => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  const out = () => { let d = cv.current.toDataURL("image/jpeg", .85); if (d.length > 1150000) d = cv.current.toDataURL("image/jpeg", .65); return d; };
  const thumb = () => { const c = document.createElement("canvas"), s = 120 / Math.max(cv.current.width, cv.current.height); c.width = Math.round(cv.current.width * s); c.height = Math.round(cv.current.height * s); c.getContext("2d").drawImage(cv.current, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", .6); };
  const download = () => { const a = document.createElement("a"); a.href = out(); a.download = "edit-" + name.replace(/\.\w+$/, "") + ".jpg"; a.click(); };
  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Editor foto" onClick={e => e.stopPropagation()} className="panel rounded-2xl p-4 w-full max-w-3xl max-h-[95dvh] overflow-y-auto grid md:grid-cols-[1fr_16rem] gap-4">
        <div className="bg-black/60 rounded-xl flex items-center justify-center min-h-[200px]">
          {!ready && <span className="text-sm muted">Memuat…</span>}
          <canvas ref={cv} className="max-w-full max-h-[60dvh] rounded-lg" aria-label="Pratinjau foto" />
        </div>
        <div className="space-y-3 text-sm">
          <h2 className="font-semibold text-base">✏️ Edit foto</h2>
          {SLIDERS.map(([k, t, mn, mx]) => (
            <div key={k}><label htmlFor={"s" + k} className="flex justify-between"><span>{t}</span><span className="muted">{o[k]}</span></label>
              <input id={"s" + k} type="range" min={mn} max={mx} value={o[k]} onChange={e => setO(x => ({ ...x, [k]: +e.target.value }))} className="w-full accent-yellow-500" /></div>))}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setO(x => ({ ...x, rot: (x.rot + 90) % 360 }))} className="panel rounded-lg px-3 py-1.5">⟳ Putar</button>
            <button onClick={() => setO(x => ({ ...x, s: 0 }))} className="panel rounded-lg px-3 py-1.5">Hitam-putih</button>
            <button onClick={() => setO(x => ({ ...x, b: 108, c: 112, s: 112, sh: 30 }))} className="panel rounded-lg px-3 py-1.5">✨ Auto perbaiki</button>
            <button onClick={() => setO(DEF)} className="panel rounded-lg px-3 py-1.5">Reset</button>
          </div>
          <p className="text-xs muted">Pengeditan dilakukan di perangkat Anda (tidak memakai AI), jadi wajah dan detail tidak diubah.</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => onSave(out(), thumb())} disabled={!ready} className="gold-grad text-ink font-semibold rounded-xl px-4 py-2 disabled:opacity-40">Terapkan ke lampiran</button>
            <button onClick={download} disabled={!ready} className="panel rounded-xl px-4 py-2 disabled:opacity-40">⬇️ Unduh</button>
            <button onClick={onClose} className="panel rounded-xl px-4 py-2">Batal</button></div>
        </div>
      </div>
    </div>);
}
