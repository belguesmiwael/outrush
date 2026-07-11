// Skeleton d'accueil (streaming) — structure instantanée sur mobile pendant le fetch.
export default function Loading() {
  return (
    <main className="min-h-dvh animate-pulse">
      <div className="h-14 border-b border-app-loot/10 bg-app-surface/40" />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="h-[320px] md:h-[380px] rounded-2xl bg-app-surface-2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-app-surface">
              <div className="aspect-[4/5] bg-app-surface-2" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-1/2 rounded bg-app-surface-2" />
                <div className="h-4 w-3/4 rounded bg-app-surface-2" />
                <div className="h-4 w-1/3 rounded bg-app-surface-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
