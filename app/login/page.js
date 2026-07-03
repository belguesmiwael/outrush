'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, error: null, info: null });

  async function submit(e) {
    e.preventDefault();
    if (status.loading) return;
    setStatus({ loading: true, error: null, info: null });
    const supabase = createClient();
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatus({ loading: false, error: null, info: 'Compte créé — vérifiez votre email pour confirmer.' });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const rawNext = params.get('next') || '/';
      // anti open-redirect : uniquement des chemins internes
      const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
      router.push(next);
      router.refresh();
    } catch (err) {
      setStatus({ loading: false, error: 'Identifiants invalides ou compte inexistant.', info: null });
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <form onSubmit={submit} className="card-hunt w-full max-w-sm p-8 space-y-5 rise-in">
        <h1 className="font-display font-extrabold text-3xl">
          OUT<span className="text-app-accent">RUSH</span>
        </h1>
        <p className="text-app-muted text-sm">
          {mode === 'login' ? 'La chasse reprend là où vous l\'avez laissée.' : 'Rejoignez la chasse mondiale.'}
        </p>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-widest text-app-muted">Email</span>
          <input
            type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-app-surface-2 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-app-accent transition-colors duration-120"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-widest text-app-muted">Mot de passe</span>
          <input
            type="password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-app-surface-2 border border-white/10 rounded-lg px-3 py-2.5 outline-none focus:border-app-accent transition-colors duration-120"
          />
        </label>
        {status.error ? <p className="text-sm" style={{ color: 'var(--app-danger)' }}>{status.error}</p> : null}
        {status.info ? <p className="text-sm" style={{ color: 'var(--app-success)' }}>{status.info}</p> : null}
        <button
          type="submit" disabled={status.loading}
          className="w-full font-display font-bold py-3 rounded-lg bg-app-accent text-white transition-transform duration-120 ease-out-expo active:scale-[0.97] disabled:opacity-60"
        >
          {status.loading ? 'Un instant…' : mode === 'login' ? 'Entrer' : 'Créer mon compte'}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full text-sm text-app-muted hover:text-app-text transition-colors duration-120"
        >
          {mode === 'login' ? 'Pas de compte ? Créer un compte' : 'Déjà chasseur ? Se connecter'}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh grid place-items-center"><div className="skeleton w-80 h-96 rounded-2xl" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
