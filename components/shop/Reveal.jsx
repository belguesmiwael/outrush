'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Révèle son contenu en fondu-montée quand il entre dans le viewport.
 * Subtil, une seule fois, respecte prefers-reduced-motion (via CSS).
 */
export default function Reveal({ children, className = '', delay = 0, as = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? 'in' : ''} ${className}`}
      style={{ animationDelay: shown ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}
