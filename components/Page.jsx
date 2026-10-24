import Link from "next/link";
export default function Page({ title, children }) {
  return (<main className="max-w-2xl mx-auto px-5 py-10 fade">
    <Link href="/" className="text-gold text-sm">← Kembali ke chat</Link>
    <h1 className="text-3xl font-semibold mt-4 mb-6">{title}</h1>
    <div className="space-y-4 leading-relaxed">{children}</div>
    <p className="muted text-xs mt-12">Created with passion by Richmond Longdong.</p></main>);
}
