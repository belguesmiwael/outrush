'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Gavel, Loader2, Check, AlertCircle } from 'lucide-react';
import { composeLotsNow } from '@/lib/actions/packs';

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

export default function ComposeLotsButton() {
  const [state, action] = useActionState(composeLotsNow, null);
  return (
    <form action={action} className="flex flex-col items-stretch md:items-end gap-2">
      <SubmitBtn />
      {state ? (
        <p className={`text-xs max-w-xs md:text-right inline-flex items-start gap-1.5 ${state.ok && state.created > 0 ? 'text-app-success' : state.ok ? 'text-app-muted' : 'text-app-accent'}`}>
          {state.ok && state.created > 0 ? <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />}
          <span>{state.message}</span>
        </p>
      ) : null}
    </form>
  );
}
