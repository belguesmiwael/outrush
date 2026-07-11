export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col animate-pulse">
      <div className="h-14 border-b border-app-loot/10 bg-app-surface/40" />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          <div className="aspect-square rounded-2xl bg-app-surface-2" />
          <div className="space-y-4">
            <div className="h-5 w-24 rounded bg-app-surface-2" />
            <div className="h-8 w-3/4 rounded bg-app-surface-2" />
            <div className="h-4 w-28 rounded bg-app-surface-2" />
            <div className="h-12 w-40 rounded bg-app-surface-2" />
            <div className="h-14 w-full rounded-xl bg-app-surface-2 mt-4" />
            <div className="h-24 w-full rounded-xl bg-app-surface" />
          </div>
        </div>
      </main>
    </div>
  );
}
