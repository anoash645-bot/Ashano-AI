"use client";
import { useState } from "react";
import katex from "katex";

function Tex({ tex, block }) {
  let h = null;
  try { h = katex.renderToString(tex, { throwOnError: false, displayMode: !!block }); } catch {}
  return h ? <span className={block ? "block my-3 overflow-x-auto" : ""} dangerouslySetInnerHTML={{ __html: h }} /> : <code>{tex}</code>;
}

function Inline({ text }) {
  return text.split(/(\$(?!\s)[^$\n]*[^$\s]\$(?!\d)|\\\([^\n]+?\\\)|\*\*[^*]+\*\*|`[^`\n]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+\*)/g).map((p, i) => {
    const mt = /^\$(?!\s)[^$\n]*[^$\s]\$$/.test(p) ? p.slice(1, -1) : /^\\\(.+\\\)$/.test(p) ? p.slice(2, -2) : null;
    if (mt !== null) return <Tex key={i} tex={mt} />;
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^`[^`\n]+`$/.test(p)) return <code key={i} className="px-1.5 py-0.5 rounded bg-purple-500/20 text-[0.9em]">{p.slice(1, -1)}</code>;
    const a = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (a) return <a key={i} href={a[2]} target="_blank" rel="noopener noreferrer" className="text-gold underline">{a[1]}</a>;
    if (/^\*[^*\n]+\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

function Code({ lang, code }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[var(--line)] bg-black/70 text-gray-100">
      <div className="flex justify-between items-center px-3 py-1.5 text-xs bg-white/10">
        <span>{lang || "kode"}</span>
        <button onClick={async () => { try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }} className="hover:text-gold">{ok ? "✓ Tersalin" : "Salin kode"}</button>
      </div>
      <pre className="p-3 text-sm overflow-x-auto"><code>{code}</code></pre>
    </div>);
}

export default function Markdown({ text }) {
  const lines = text.split("\n"), out = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const l = lines[i];
    const f = l.match(/^```(\w*)/);
    if (f) { const buf = []; i++; while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]); i++; out.push(<Code key={k++} lang={f[1]} code={buf.join("\n")} />); continue; }
    if (/^\s*(\$\$|\\\[)/.test(l)) {
      const op = l.trim().startsWith("$$") ? "$$" : "\\[", cl = op === "$$" ? "$$" : "\\]";
      let buf = l.trim().slice(op.length);
      if (buf.endsWith(cl)) { buf = buf.slice(0, -cl.length); i++; }
      else { i++; const acc = [buf]; while (i < lines.length && !lines[i].trim().endsWith(cl)) acc.push(lines[i++]); if (i < lines.length) acc.push(lines[i++].trim().slice(0, -cl.length)); buf = acc.join("\n"); }
      out.push(<Tex key={k++} block tex={buf.trim()} />); continue;
    }
    if (l.trim().startsWith("|") && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1] || "")) {
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const head = cells(l); i += 2; const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      out.push(<div key={k++} className="my-3 overflow-x-auto"><table className="text-sm border-collapse"><thead><tr>{head.map((c, j) => <th key={j} className="border border-[var(--line)] px-3 py-1.5 text-left bg-purple-500/10"><Inline text={c} /></th>)}</tr></thead><tbody>{rows.map((r, a) => <tr key={a}>{r.map((c, j) => <td key={j} className="border border-[var(--line)] px-3 py-1.5"><Inline text={c} /></td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) { out.push(<div key={k++} className={`font-semibold mt-3 mb-1 ${h[1].length < 3 ? "text-lg" : "text-base"}`}><Inline text={h[2]} /></div>); i++; continue; }
    if (/^\s*([-*•]|\d+\.)\s+/.test(l)) {
      const ord = /^\s*\d+\./.test(l), items = [];
      while (i < lines.length && /^\s*([-*•]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+\.)\s+/, ""));
      const Tag = ord ? "ol" : "ul";
      out.push(<Tag key={k++} className={`my-2 pl-6 space-y-1 ${ord ? "list-decimal" : "list-disc"}`}>{items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</Tag>); continue;
    }
    if (l.startsWith("> ")) { out.push(<blockquote key={k++} className="my-2 pl-3 border-l-2 border-gold muted"><Inline text={l.slice(2)} /></blockquote>); i++; continue; }
    if (!l.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|> |\s*\||\s*(\$\$|\\\[)|\s*([-*•]|\d+\.)\s+)/.test(lines[i])) buf.push(lines[i++]);
    out.push(<p key={k++} className="my-1.5 whitespace-pre-wrap"><Inline text={buf.join("\n")} /></p>);
  }
  return <div className="leading-relaxed">{out}</div>;
}
