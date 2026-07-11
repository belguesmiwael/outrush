'use client';
import { useState } from 'react';
import Image from 'next/image';

function mediaUrl(path) {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${path}` : null;
}

/** Galerie produit : grande image + vignettes scrollables cliquables. */
export default function ProductGallery({ images = [], alt = '' }) {
  const [active, setActive] = useState(0);
  const list = images.filter(Boolean);

  if (!list.length) {
    return (
      <div className="card-premium aspect-square grid place-items-center font-display text-7xl text-app-accent/20">
        O
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Image principale (LCP → priority) */}
      <div className="card-premium overflow-hidden aspect-square relative bg-white/[0.02]">
        <Image
          key={active}
          src={mediaUrl(list[active])}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 45vw"
          priority
          className="object-contain rise-in in"
        />
      </div>

      {/* Vignettes */}
      {list.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {list.map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border transition-all duration-220 ${
                i === active ? 'border-app-accent ring-1 ring-[color:var(--app-accent)]/40' : 'border-white/10 opacity-60 hover:opacity-100'
              }`}
            >
              <Image src={mediaUrl(img)} alt="" width={64} height={64} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
