'use client';
import { useState, useTransition } from 'react';
import { relaunchScan, relaunchAllScans, deleteScan } from '@/lib/actions/scan';

function StatusBadge({ status }) {
  const map = {
    ready: ['Prête', 'var(--app-success)'],
    enriching: ['En analyse', 'var(--app-accent)'],
    queued: ['En file', 'var(--app-text-muted)'],
    not_found: ['Introuvable', 'var(--app-accent)'],
    duplicate: ['Doublon', 'var(--app-text-muted)'],
    published: ['Publié', 'var(--app-success)'],
  };
  const [label, color] = map[status] ?? [status, 'var(--app-text)'];
  return <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color, background: 'rgba(255,255,255,0.05)' }}>{label}</span>;
}

export default function ScanManager({ scans = [] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(null);

  function relaunch(id) {
    setBusy(id);
    const fd = new FormData(); fd.set('scanId', id);
    start(async () => { await relaunchScan(fd); setBusy(null); });
  }
  function remove(id) {
    if (!confirm('Supprimer ce scan ?')) return;
    setBusy(id);
    const fd = new FormData(); fd.set('scanId', id);
    start(async () => { await deleteScan(fd); setBusy(null); });
  }
  function relaunchAll() {
    setBusy('all');
    start(async () => { await relaunchAllScans(); setBusy(null); });
  }

  const pendingCount = scans.filter((s) => ['enriching', 'queued', 'not_found'].includes(s.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display font-bold text-xl">Scans ({scans.length})</h2>
        {pendingCount > 0 ? (
          <button onClick={relaunchAll} disabled={pending}
            className="rounded-lg px-4 py-2 text-sm font-display font-bold bg-app-accent text-white disabled:opacity-50 transition-transform duration-120 hover:scale-[1.02] active:scale-95">
            {busy === 'all' ? 'Relance en cours…' : `↻ Relancer tous (${pendingCount})`}
          </button>
        ) : null}
      </div>

      {scans.length === 0 ? (
        <div className="card-hunt p-10 text-center text-app-muted">Aucun scan — le viseur attend.</div>
      ) : (
        <div className="space-y-2">
          {scans.map((s) => (
            <div key={s.id} className="card-hunt p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-app-surface-2 overflow-hidden shrink-0">
                {s.product?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-media/${s.product.images[0]}`} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.product?.title?.fr ?? s.code}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={s.status} />
                  <span className="text-[11px] text-app-muted font-mono truncate">{s.code}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {['enriching', 'queued', 'not_found'].includes(s.status) ? (
                  <button onClick={() => relaunch(s.id)} disabled={pending}
                    className="text-xs px-3 py-1.5 rounded-lg border border-app-accent/30 text-app-accent hover:bg-[color:var(--app-accent)]/10 disabled:opacity-50 transition-colors duration-120">
                    {busy === s.id ? '…' : '↻ Relancer'}
                  </button>
                ) : null}
                <button onClick={() => remove(s.id)} disabled={pending}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-app-muted hover:text-app-accent hover:border-app-accent/30 disabled:opacity-50 transition-colors duration-120">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
