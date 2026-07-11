'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Gavel, Loader2, Check, AlertCircle, Trash2 } from 'lucide-react';
import { composeLotsNow, purgeAllPacks } from '@/lib/actions/packs';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-hammer px-6 py-3 inline-flex whitespace-nowrap disabled:opacity-70">
      {pending ? (
        <><Loader2 size={16} strokeWidth={2} className="animate-spin" /> Composition en cours…</>
      ) : (
        <><Gavel size={16} strokeWidth={2} /> Composer les lots du jour</>
      )}
    </button>
  );
}

function PurgeBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      onClick={(e) => { if (!confirm('Supprimer TOUS les lots ? (les produits ne sont pas touchés)')) e.preventDefault(); }}
      className="text-xs px-3 py-2 rounded-lg border border-app-accent/30 text-app-accent hover:bg-app-accent/10 transition-colors duration-120 inline-flex items-center gap-1.5 disabled:opacity-60"
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={2} />} Vider les lots
    </button>
  );
}

function Feedback({ state }) {
  if (!state) return null;
  const good = state.ok && (state.created > 0 || state.deleted > 0);
  return (
    <p className={`text-xs max-w-xs md:text-right inline-flex items-start gap-1.5 ${good ? 'text-app-success' : state.ok ? 'text-app-muted' : 'text-app-accent'}`}>
      {good ? <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />}
      <span>{state.message}</span>
    </p>
  );
}

export default function ComposeLotsButton() {
  const [state, action] = useActionState(composeLotsNow, null);
  const [purgeState, purgeAction] = useActionState(purgeAllPacks, null);
  return (
    <div className="flex flex-col items-stretch md:items-end gap-2">
      <form action={action}>
        <SubmitBtn />
      </form>
      <Feedback state={state} />
      <form action={purgeAction}>
        <PurgeBtn />
      </form>
      <Feedback state={purgeState} />
    </div>
  );
}
