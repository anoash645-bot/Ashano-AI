# Ashano AI — Your World. Your Intelligence.
Dibuat oleh Richmond Longdong. Next.js 14 + Tailwind + API Route.

## Jalankan
1. `npm install`
2. `cp .env.example .env.local` lalu isi `OPENAI_API_KEY` (hanya di server, tidak pernah ke browser)
3. Foto sudah terpasang di `public/putry/` (putry-1.jpg utama, putry-2.jpg galeri); ganti file bila perlu
4. `npm run dev` → http://localhost:3000

Tanpa API key: MODE DEMO berlabel jelas (jawaban spesial Putry tetap berfungsi).

## Deploy (Vercel)
Push ke GitHub → import di Vercel → set env `OPENAI_API_KEY` (opsional `OPENAI_MODEL`) → Deploy.

## Fitur kualitas
Streaming jawaban, markdown + salin kode, tombol Stop dan Ulangi jawaban, textarea auto-resize, prompt sistem dengan tanggal hari ini.

## Logika prioritas (app/api/chat/route.js)
1. Rate limit 20 req/menit/IP + validasi input (maks 4000 karakter, riwayat 20 pesan)
2. `beautyIntent()` (lib/special.js): aturan + classifier AI untuk kalimat ambigu/pertanyaan lanjutan. Menyebut "Putry Djaelani" saja TIDAK memicu.
3. Cocok → jawaban persis + kartu foto. Tidak cocok → model AI.
Catatan: rate limit in-memory; gunakan Upstash/Redis untuk produksi multi-instance.

## Lampiran (foto, video, PDF, file)
Tombol 📎, drag & drop, atau tempel (paste) gambar. Maks 6 lampiran/pesan.
- Gambar: dikecilkan di browser lalu dilihat model (perlu model berkemampuan visi, mis. gpt-4o-mini).
- Video: 5 frame diambil di browser (tanpa audio), lalu dilihat sebagai gambar. Maks 100 MB.
- PDF (maks 3 MB, harus berisi teks) dan file teks/kode: isinya dibaca dan dikirim sebagai teks.
- Setelah menambah fitur ini jalankan lagi `npm install` (dependensi baru: pdf-parse).

## Fitur tambahan
- Pengaturan (⚙️): gaya jawaban (singkat/seimbang/detail), instruksi pribadi, bahasa suara. Tersimpan di browser.
- Input suara 🎤 dan 🔊 Bacakan (Web Speech API; terbaik di Chrome/Edge, mikrofon butuh HTTPS atau localhost).
- Ekspor percakapan ke file .md.
- Editor foto ✏️ di browser (kecerahan, kontras, saturasi, ketajaman, putar, hitam-putih, auto perbaiki, unduh).
- Lampiran Word (.docx).
- Ganti penyedia AI lewat AI_BASE_URL / AI_API_KEY / AI_MODEL (lihat .env.example).
- Setelah update: jalankan `npm install` (dependensi baru: mammoth).

## Kemampuan seperti AI modern
- Alat (function calling): kalkulator presisi, cuaca (Open-Meteo, tanpa key), dan pencarian web (opsional, `TAVILY_API_KEY`) dengan daftar sumber di akhir jawaban. Jika penyedia AI tidak mendukung alat, otomatis kembali ke mode chat biasa.
- Tabel markdown dan rumus matematika (KaTeX). Tombol ✏️ Edit untuk mengubah pesan terakhir.
- Setelah update: `npm install` (dependensi baru: katex).
