export default function Loading() {
  return (
    <main className="min-h-dvh max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 w-40 rounded bg-app-surface-2 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden bg-app-surface">
            <div className="aspect-[4/5] bg-app-surface-2" />
            <div className="p-4 space-y-2">
              <div className="h-3 w-1/2 rounded bg-app-surface-2" />
              <div className="h-4 w-3/4 rounded bg-app-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
