'use client';
import { useActionState } from 'react';
import { runAdminCommand } from '@/lib/actions/admin-command';

const SUGGESTIONS = [
  'Génère 40 packs',
  'Lance un flash sur les dormants pendant 24h',
  'Combien de dormants ?',
];

export default function AdminCommandBar() {
  const [state, action, pending] = useActionState(runAdminCommand, null);

  return (
    <div className="card-hunt p-5 space-y-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 0% 0%, oklch(62% 0.24 25 / 0.12), transparent 55%)' }} />
      <div className="relative space-y-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-app-accent" />
          </span>
          <h2 className="font-display font-bold">AI Brain — pilotez en une phrase</h2>
        </div>

        <form action={action} className="flex gap-2">
          <input
            name="instruction"
            maxLength={300}
            placeholder="Ex : génère 40 packs premium…"
            className="flex-1 rounded-xl bg-app-surface-2 border border-white/8 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]/60 transition-shadow duration-120"
          />
          <button
            disabled={pending}
            className="rounded-xl px-6 py-3 font-display font-bold bg-app-accent text-white disabled:opacity-50 transition-transform duration-120 hover:scale-[1.02] active:scale-95"
          >
            {pending ? '…' : 'Exécuter'}
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <span key={s} className="text-xs text-app-muted bg-app-surface-2 rounded-full px-3 py-1.5 border border-white/5">
              {s}
            </span>
          ))}
        </div>

        {state ? (
          <p className={`text-sm rise-in ${state.ok ? 'text-app-success' : 'text-app-accent'}`}>
            {state.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
