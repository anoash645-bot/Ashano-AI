"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PutryCard from "./PutryCard";
import Markdown from "./Markdown";
import { processFile, MAX_FILES } from "@/lib/files";
import PhotoEditor from "./PhotoEditor";
import Settings from "./Settings";

const uid = () => Math.random().toString(36).slice(2, 10);
const SUGGEST = ["Bagaimana cuaca di Jakarta hari ini?", "Cari berita terbaru tentang teknologi AI", "Jelaskan rumus abc dengan contoh soal", "Bandingkan Python vs JavaScript dalam tabel"];

export default function Chat() {
  const [convs, setConvs] = useState([]);
  const [cur, setCur] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [dark, setDark] = useState(true);
  const [copied, setCopied] = useState(null);
  const [ready, setReady] = useState(false);
  const end = useRef(null);
  const abort = useRef(null);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const imgCache = useRef({});
  const [files, setFiles] = useState([]);
  const [busyFile, setBusyFile] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState({ style: "seimbang", custom: "", lang: "id-ID" });
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const recRef = useRef(null);
  useEffect(() => { try { const p = JSON.parse(localStorage.getItem("ashano_prefs") || "null"); if (p) setPrefs(x => ({ ...x, ...p })); } catch {} }, []);
  const savePrefs = p => { setPrefs(p); try { localStorage.setItem("ashano_prefs", JSON.stringify(p)); } catch {} };

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("rai_convs") || "[]"); setConvs(c); setCur(c[0]?.id ?? null);
      setDark(localStorage.getItem("rai_theme") !== "light");
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem("rai_convs", JSON.stringify(convs)); } catch {} }, [convs, ready]);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); if (ready) try { localStorage.setItem("rai_theme", dark ? "dark" : "light"); } catch {} }, [dark, ready]);
  const conv = convs.find(c => c.id === cur);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [conv?.messages.length, loading]);

  const newChat = () => { setCur(null); setOpen(false); };
  const del = id => { setConvs(c => c.filter(x => x.id !== id)); if (cur === id) setCur(null); };
  const copy = async (t, id) => { try { await navigator.clipboard.writeText(t); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch {} };

  const patch = (id, mid, fn) => setConvs(c => c.map(x => x.id === id ? { ...x, messages: x.messages.map(m => m.id === mid ? fn(m) : m) } : x));

  async function run(id, text, history, images = []) {
    const aid = uid(); setLoading(true);
    setConvs(c => c.map(x => x.id === id ? { ...x, messages: [...x.messages, { id: aid, role: "assistant", content: "" }] } : x));
    const ctrl = new AbortController(); abort.current = ctrl;
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ message: text, images, prefs: { style: prefs.style, custom: prefs.custom }, history: history.filter(m => !m.error && (m.full || m.content)).map(m => ({ role: m.role, content: m.full || m.content })) }) });
      if ((r.headers.get("content-type") || "").includes("text/plain")) {
        const reader = r.body.getReader(), dec = new TextDecoder(); let acc = "", raw = "";
        while (true) { const { done, value } = await reader.read(); if (done) break; raw += dec.decode(value, { stream: true });
          const st = [...raw.matchAll(/\u0001([^\u0002]*)\u0002/g)].pop()?.[1] ?? "";
          const t = raw.replace(/\u0001[^\u0002]*\u0002/g, "").replace(/\u0001[^\u0002]*$/, ""); acc = t;
          patch(id, aid, m => ({ ...m, content: t, status: st })); }
        patch(id, aid, m => ({ ...m, status: "" }));
        if (!acc) patch(id, aid, m => ({ ...m, content: "Maaf, tidak ada jawaban yang diterima. Coba kirim ulang.", error: true }));
      } else {
        const d = await r.json();
        patch(id, aid, m => r.ok ? { ...m, content: d.reply, special: d.special, demo: d.demo } : { ...m, content: d.error || "Terjadi kesalahan.", error: true });
      }
    } catch (e) {
      if (e.name !== "AbortError") patch(id, aid, m => ({ ...m, content: "Koneksi terputus. Periksa internet Anda lalu coba lagi.", error: true }));
      else patch(id, aid, m => m.content ? m : { ...m, content: "_Dihentikan._" });
    }
    abort.current = null; setLoading(false);
  }

  async function addFiles(list) {
    const arr = [...list]; setNotice("");
    if (files.length + arr.length > MAX_FILES) { setNotice(`Maksimal ${MAX_FILES} lampiran per pesan.`); return; }
    setBusyFile(true);
    for (const f of arr) {
      try { const a = await processFile(f); setFiles(x => (x.length >= MAX_FILES ? x : [...x, a])); }
      catch (e) { setNotice(e.message || `Gagal memproses ${f.name}`); }
    }
    setBusyFile(false);
  }

  function send(text) {
    text = (text ?? input).trim();
    if ((!text && !files.length) || loading || busyFile) return;
    const images = files.flatMap(a => a.images || []);
    if (images.length > 8) { setNotice("Terlalu banyak gambar/frame video (maks 8). Kurangi lampiran."); return; }
    const notes = files.map(a => ["text", "pdf", "docx"].includes(a.kind) ? `\n\n[File: ${a.name}]\n${a.text}\n[Akhir file]`
      : a.kind === "video" ? `\n\n[Lampiran video "${a.name}": ${a.images.length} frame diambil merata dari video berdurasi ${a.dur} detik. Audio tidak diproses.]`
      : `\n\n[Lampiran gambar: ${a.name}]`).join("");
    const full = (text || "Tolong analisis lampiran ini.") + notes;
    let id = cur; const history = conv?.messages ?? [];
    const um = { id: uid(), role: "user", content: text, full, atts: files.map(({ name, kind, thumb }) => ({ name, kind, thumb })) };
    imgCache.current[um.id] = images;
    if (!id) { id = uid(); setConvs(c => [{ id, title: (text || files[0]?.name || "Lampiran").slice(0, 40), messages: [um] }, ...c]); setCur(id); }
    else setConvs(c => c.map(x => x.id === id ? { ...x, messages: [...x.messages, um] } : x));
    setInput(""); setFiles([]); setNotice(""); if (taRef.current) taRef.current.style.height = "auto";
    run(id, full, history, images);
  }

  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setNotice("Browser ini belum mendukung input suara. Coba Chrome atau Edge."); return; }
    if (listening) { recRef.current?.stop(); return; }
    const r = new SR(); r.lang = prefs.lang; r.interimResults = false;
    r.onresult = e => { const t = [...e.results].map(x => x[0].transcript).join(" "); setInput(v => (v ? v + " " : "") + t); };
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); setNotice("Mikrofon tidak bisa diakses. Periksa izin mikrofon di browser."); };
    recRef.current = r; setListening(true); r.start();
  }
  function speak(m) {
    if (!("speechSynthesis" in window)) { setNotice("Browser ini belum mendukung suara."); return; }
    const ss = window.speechSynthesis;
    if (speakingId === m.id) { ss.cancel(); setSpeakingId(null); return; }
    ss.cancel();
    const u = new SpeechSynthesisUtterance(m.content.replace(/```[\s\S]*?```/g, " (blok kode dilewati) ").replace(/[*#`>_]/g, ""));
    u.lang = prefs.lang; u.onend = u.onerror = () => setSpeakingId(null);
    setSpeakingId(m.id); ss.speak(u);
  }
  function exportChat() {
    if (!conv) return;
    const md = `# ${conv.title}\n\n` + conv.messages.map(m => `**${m.role === "user" ? "Anda" : "Ashano AI"}:**\n\n${m.content}`).join("\n\n---\n\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    a.download = `ashano-ai-${conv.id}.md`; a.click(); URL.revokeObjectURL(a.href);
  }

  function regenerate() {
    if (loading || !conv) return;
    const msgs = conv.messages; let u = msgs.length - 1;
    while (u >= 0 && msgs[u].role !== "user") u--;
    if (u < 0) return;
    const text = msgs[u].full || msgs[u].content, before = msgs.slice(0, u);
    setConvs(c => c.map(x => x.id === conv.id ? { ...x, messages: msgs.slice(0, u + 1) } : x));
    run(conv.id, text, before, imgCache.current[msgs[u].id] || []);
  }

  const lastUserId = [...(conv?.messages || [])].reverse().find(x => x.role === "user")?.id;
  function editLast(m) {
    if (loading || !conv) return;
    const i = conv.messages.findIndex(x => x.id === m.id);
    setConvs(c => c.map(x => x.id === conv.id ? { ...x, messages: x.messages.slice(0, i) } : x));
    setInput(m.content || ""); taRef.current?.focus();
  }
  const list = convs.filter(c => (c.title + c.messages.map(m => m.content).join(" ")).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex h-[100dvh]">
      {open && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setOpen(false)} />}
      <aside aria-label="Riwayat percakapan" className={`panel fixed md:static z-30 inset-y-0 left-0 w-72 flex flex-col p-3 transition-transform ${open ? "" : "-translate-x-full"} md:translate-x-0`}>
        <div className="flex items-center gap-2 px-1 mb-3"><div className="w-9 h-9 rounded-xl gold-grad flex items-center justify-center font-bold text-ink">A</div><span className="font-semibold">Ashano AI</span></div>
        <button onClick={newChat} className="gold-grad text-ink font-semibold rounded-xl py-2.5 mb-3 hover:opacity-90">＋ Percakapan baru</button>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari riwayat…" aria-label="Cari riwayat" className="panel rounded-xl px-3 py-2 text-sm mb-2 bg-transparent outline-none focus:ring-2 ring-gold" />
        <nav className="flex-1 overflow-y-auto space-y-1">
          {list.length === 0 && <p className="muted text-sm px-2 py-4">Belum ada riwayat.</p>}
          {list.map(c => (
            <div key={c.id} className={`group flex items-center rounded-lg ${c.id === cur ? "bg-purple-500/20" : "hover:bg-purple-500/10"}`}>
              <button onClick={() => { setCur(c.id); setOpen(false); }} className="flex-1 text-left text-sm px-3 py-2 truncate">{c.title}</button>
              <button onClick={() => del(c.id)} aria-label={`Hapus percakapan ${c.title}`} className="px-2 text-red-400 md:opacity-0 group-hover:opacity-100 focus:opacity-100">🗑</button>
            </div>))}
        </nav>
        <div className="border-t border-[var(--line)] pt-3 mt-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
          <button onClick={() => setShowSettings(true)} className="hover:text-gold">⚙️ Pengaturan</button>
          <button onClick={exportChat} disabled={!conv} className="hover:text-gold disabled:opacity-40">⬇️ Ekspor</button>
          <Link href="/about" className="hover:text-gold">About</Link><Link href="/story" className="hover:text-gold">Our Story</Link>
          <button onClick={() => setDark(!dark)} className="hover:text-gold ml-auto" aria-label="Ganti tema">{dark ? "☀️ Terang" : "🌙 Gelap"}</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 p-3 panel border-x-0 border-t-0">
          <button onClick={() => setOpen(true)} aria-label="Buka menu" className="text-xl">☰</button><span className="font-semibold">Ashano AI</span>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-6" aria-live="polite">
          <div className="max-w-3xl mx-auto space-y-5">
            {!conv?.messages.length && (
              <div className="text-center pt-10 md:pt-20 fade">
                <div className="w-16 h-16 mx-auto rounded-2xl gold-grad flex items-center justify-center text-3xl font-bold text-ink glow">A</div>
                <h1 className="mt-5 text-2xl md:text-3xl font-semibold">Halo! Saya Ashano AI. Ada yang bisa saya bantu hari ini?</h1>
                <p className="text-gold mt-2">Your World. Your Intelligence.</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-8 text-left">
                  {SUGGEST.map(s => <button key={s} onClick={() => send(s)} className="panel rounded-xl p-3 text-sm hover:border-gold transition">{s}</button>)}
                </div>
              </div>)}
            {conv?.messages.map(m => (
              <div key={m.id} className={`fade flex ${m.role === "user" ? "justify-end" : ""}`}>
                <div className={`max-w-[92%] md:max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-gradient-to-br from-plum to-purple-900 text-white" : "panel"} ${m.error ? "border-red-500" : ""}`}>
                  {m.role === "assistant" && <div className="text-xs text-gold mb-1 font-semibold">Ashano AI{m.demo ? " · DEMO" : ""}</div>}
                  {m.status && <div className="text-xs text-gold animate-pulse mb-1" role="status">{m.status}</div>}
                  {m.role === "user" ? <>{m.atts?.length > 0 && <div className="flex flex-wrap gap-2 mb-2">{m.atts.map((a, i) => a.thumb ? <img key={i} src={a.thumb} alt={a.name} className="h-16 w-16 rounded-lg object-cover" /> : <span key={i} className="text-xs bg-white/15 rounded-lg px-2 py-1">📄 {a.name}</span>)}</div>}{m.content && <p className="whitespace-pre-wrap">{m.content}</p>}{m.id === lastUserId && !loading && <button onClick={() => editLast(m)} className="block mt-1 text-xs text-white/60 hover:text-gold">✏️ Edit</button>}</> : m.content ? <Markdown text={m.content} /> : null}
                  {m.special && <PutryCard />}
                  {m.role === "assistant" && m.content && !(loading && m.id === conv.messages[conv.messages.length - 1].id) && (
                    <div className="flex gap-4 mt-2 text-xs muted">
                      {!m.error && <button onClick={() => copy(m.content, m.id)} className="hover:text-gold">{copied === m.id ? "✓ Tersalin" : "📋 Salin jawaban"}</button>}
                      {!m.error && <button onClick={() => speak(m)} className="hover:text-gold">{speakingId === m.id ? "⏹ Berhenti" : "🔊 Bacakan"}</button>}
                      {m.id === conv.messages[conv.messages.length - 1].id && <button onClick={regenerate} className="hover:text-gold">🔄 Ulangi jawaban</button>}
                    </div>)}
                </div>
              </div>))}
            {loading && !conv?.messages[conv.messages.length - 1]?.content && <div className="panel rounded-2xl px-4 py-3 inline-flex gap-1.5" role="status" aria-label="Ashano AI sedang mengetik"><span className="dot" /><span className="dot" style={{ animationDelay: ".2s" }} /><span className="dot" style={{ animationDelay: ".4s" }} /></div>}
            <div ref={end} />
          </div>
        </div>
        <div className="p-3 md:p-4">
          <div className="max-w-3xl mx-auto">
          {notice && <p role="alert" className="text-sm text-red-400 mb-2">{notice}</p>}
          {(files.length > 0 || busyFile) && <div className="flex flex-wrap gap-2 mb-2">
            {files.map(a => <div key={a.id} className="panel rounded-xl p-1.5 flex items-center gap-2 text-xs">
              {a.thumb ? <img src={a.thumb} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="text-lg">📄</span>}
              <span className="max-w-[9rem] truncate">{a.name}{a.kind === "video" ? " (video)" : ""}</span>
              {a.kind === "image" && <button type="button" onClick={() => setEditing(a)} aria-label={`Edit ${a.name}`} className="px-1">✏️</button>}
              <button type="button" onClick={() => setFiles(x => x.filter(y => y.id !== a.id))} aria-label={`Hapus ${a.name}`} className="text-red-400 px-1">✕</button></div>)}
            {busyFile && <span className="text-xs muted self-center">Memproses lampiran…</span>}</div>}
          <form onSubmit={e => { e.preventDefault(); send(); }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }} className="panel rounded-2xl flex items-end gap-2 p-2 focus-within:ring-2 ring-gold">
            <input ref={fileRef} type="file" multiple hidden accept="image/*,video/*,.pdf,.docx,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.sql,.xml,.yml,.yaml,.log,.sh" onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Lampirkan file" className="px-2 py-2 text-xl hover:text-gold">📎</button>
            <button type="button" onClick={toggleMic} aria-label={listening ? "Hentikan mikrofon" : "Bicara (input suara)"} aria-pressed={listening} className={`px-2 py-2 text-xl hover:text-gold ${listening ? "animate-pulse text-red-400" : ""}`}>🎤</button>
            <textarea ref={taRef} onPaste={e => { const f = [...e.clipboardData.files]; if (f.length) { e.preventDefault(); addFiles(f); } }} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }} rows={1} maxLength={4000} aria-label="Tulis pesan"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Tanya apa saja ke Ashano AI…" className="flex-1 bg-transparent outline-none resize-none px-3 py-2 max-h-40" />
            {loading
              ? <button type="button" onClick={() => abort.current?.abort()} aria-label="Hentikan jawaban" className="bg-red-500/80 text-white font-bold rounded-xl px-4 py-2">■</button>
              : <button disabled={(!input.trim() && !files.length) || busyFile} aria-label="Kirim" className="gold-grad text-ink font-bold rounded-xl px-4 py-2 disabled:opacity-40">➤</button>}
          </form></div>
          <p className="text-center text-xs muted mt-2">Created with passion by Richmond Longdong.</p>
        </div>
      </main>
      {showSettings && <Settings prefs={prefs} onSave={p => { savePrefs(p); setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
      {editing && <PhotoEditor src={editing.images[0]} name={editing.name} onClose={() => setEditing(null)}
        onSave={(img, th) => { setFiles(x => x.map(y => y.id === editing.id ? { ...y, images: [img], thumb: th } : y)); setEditing(null); }} />}
    </div>);
}
