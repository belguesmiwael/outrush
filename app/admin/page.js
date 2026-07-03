import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('app_settings').select('key, value, updated_at');

  return (
    <main className="p-6 md:p-10 max-w-3xl space-y-8">
      <h1 className="font-display font-bold text-3xl">Administration</h1>
      <section className="card-hunt p-6 space-y-4">
        <h2 className="font-display font-bold">Configuration</h2>
        {(settings ?? []).map((s) => (
          <div key={s.key} className="flex items-center justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
            <span className="text-app-muted">{s.key}</span>
            <span className="font-mono">{JSON.stringify(s.value)}</span>
          </div>
        ))}
        <p className="text-xs text-app-muted">Édition des marges cibles, budget scan et taux devises : formulaires au Jalon 3.</p>
      </section>
    </main>
  );
}
