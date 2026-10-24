import { NextResponse } from "next/server";
import { limited } from "@/lib/ratelimit";
export const runtime = "nodejs";

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  if (limited(ip, 10)) return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
  const { data, kind } = await req.json().catch(() => ({}));
  if (typeof data !== "string" || data.length > 4500000) return NextResponse.json({ error: "Data dokumen tidak valid atau terlalu besar." }, { status: 400 });
  const buf = Buffer.from(data, "base64");
  try {
    let text = "", pages;
    if (kind === "docx") {
      if (buf.subarray(0, 2).toString() !== "PK") return NextResponse.json({ error: "Bukan file .docx yang valid." }, { status: 400 });
      const m = await import("mammoth"), mammoth = m.default || m;
      text = ((await mammoth.extractRawText({ buffer: buf })).value || "").trim();
    } else {
      if (buf.subarray(0, 5).toString() !== "%PDF-") return NextResponse.json({ error: "Bukan file PDF yang valid." }, { status: 400 });
      const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default, r = await pdf(buf);
      text = (r.text || "").trim(); pages = r.numpages;
    }
    if (!text) return NextResponse.json({ error: "Dokumen ini tidak berisi teks (mungkin hasil scan/gambar)." }, { status: 422 });
    return NextResponse.json({ text: text.slice(0, 40000), pages });
  } catch { return NextResponse.json({ error: "Gagal membaca dokumen." }, { status: 500 }); }
}
