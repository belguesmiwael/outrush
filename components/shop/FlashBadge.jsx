'use client';
import { useFlashLive } from '@/lib/flash/FlashLiveContext';

export default function FlashBadge({ productId, force = false, className = '' }) {
  const { map } = useFlashLive();
  const isFlash = force || (productId ? Boolean(map?.[productId]) : false);
  if (!isFlash) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[color:var(--app-accent)]/15 text-app-accent border border-[color:var(--app-accent)]/30 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-app-accent pulse-last" />
      Flash
    </span>
  );
}
