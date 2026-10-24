"use client";
import { useState } from "react";
const PHOTOS = [
  { src: "/putry/putry-1.jpg", fit: "object-cover", pos: "50% 48%" },
  { src: "/putry/putry-2.jpg", fit: "object-contain", pos: "50% 50%" },
];
export default function PutryCard() {
  const [i, setI] = useState(0);
  const [failed, setFailed] = useState({});
  return (
    <figure className="fade mt-3 w-full max-w-xs mx-auto sm:mx-0">
      <div className="glow rounded-3xl p-[3px] gold-grad">
        <div className="rounded-[22px] bg-ink overflow-hidden aspect-[4/5] flex items-center justify-center">
          {failed[i] ? (
            <div role="img" aria-label="Foto belum tersedia" className="text-center p-6">
              <div className="mx-auto w-24 h-24 rounded-full gold-grad flex items-center justify-center text-3xl font-bold text-ink">PD</div>
              <p className="mt-3 text-xs text-gray-400">Foto belum tersedia</p>
            </div>
          ) : (
            <img key={i} src={PHOTOS[i].src} style={{ objectPosition: PHOTOS[i].pos }} alt="Foto Putry Djaelani" loading="lazy"
              onError={() => setFailed(f => ({ ...f, [i]: true }))}
              className={`w-full h-full ${PHOTOS[i].fit} fade`} />
          )}
        </div>
      </div>
      <figcaption className="text-center mt-3">
        <div className="font-semibold text-lg">Putry Djaelani</div>
        <div className="text-sm text-gold">Sang Mahakuasa Yantinya Richo ✨</div>
      </figcaption>
      <div className="flex justify-center gap-2 mt-2">
        {PHOTOS.map((_, k) => (
          <button key={k} onClick={() => setI(k)} aria-label={`Lihat foto ${k + 1}`}
            className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-gold" : "w-2 bg-gray-500"}`} />
        ))}
      </div>
    </figure>
  );
}
