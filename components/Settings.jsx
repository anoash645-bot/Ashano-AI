"use client";
import { useEffect, useState } from "react";
const STYLES = [["singkat", "Singkat", "Ringkas dan langsung ke inti"], ["seimbang", "Seimbang", "Jelas dengan detail secukupnya"], ["detail", "Detail", "Mendalam, bertahap, dengan contoh"]];
export default function Settings({ prefs, onSave, onClose }) {
  const [p, setP] = useState(prefs);
  useEffect(() => { const h = e => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Pengaturan" onClick={e => e.stopPropagation()} className="panel rounded-2xl p-5 w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">⚙️ Pengaturan</h2>
        <fieldset className="mb-4"><legend className="text-sm font-medium mb-2">Gaya jawaban</legend>
          {STYLES.map(([v, t, d]) => (
            <label key={v} className="flex items-start gap-2 py-1 cursor-pointer text-sm">
              <input type="radio" name="style" checked={p.style === v} onChange={() => setP({ ...p, style: v })} className="mt-1 accent-yellow-500" />
              <span><b>{t}</b> <span className="muted">— {d}</span></span></label>))}
        </fieldset>
        <label htmlFor="custom" className="block text-sm font-medium mb-1">Instruksi pribadi (opsional)</label>
        <textarea id="custom" maxLength={500} rows={4} value={p.custom} onChange={e => setP({ ...p, custom: e.target.value })}
          placeholder="Contoh: Panggil saya Kak Richmond. Beri contoh kode dalam Python." className="w-full panel rounded-xl p-2 bg-transparent text-sm outline-none focus:ring-2 ring-gold" />
        <label htmlFor="lang" className="block text-sm font-medium mt-4 mb-1">Bahasa suara (mikrofon & bacakan)</label>
        <select id="lang" value={p.lang} onChange={e => setP({ ...p, lang: e.target.value })} className="panel rounded-xl p-2 bg-transparent text-sm w-full">
          <option value="id-ID">Bahasa Indonesia</option><option value="en-US">English (US)</option></select>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl panel text-sm">Batal</button>
          <button onClick={() => onSave(p)} className="px-4 py-2 rounded-xl gold-grad text-ink font-semibold text-sm">Simpan</button></div>
      </div>
    </div>);
}
