'use client';
import { useEffect } from 'react';

/** Ouvre la boîte d'impression du navigateur automatiquement. */
export default function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={{ position: 'fixed', top: 16, right: 16, padding: '10px 18px', background: '#e8442e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
    >
      🖨️ Imprimer
    </button>
  );
}
