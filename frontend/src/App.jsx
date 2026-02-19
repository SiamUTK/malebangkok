import { Loader2, AlertTriangle, Users } from "lucide-react";
import GuideCard from "./components/GuideCard";
import useGuides from "./hooks/useGuides";

export default function App() {
  const { guides, loading, error } = useGuides();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-zinc-900 to-black" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 sm:mb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-amber-400">MaleBangkok</p>
          <h1 className="text-3xl font-semibold uppercase tracking-[0.08em] sm:text-4xl md:text-5xl">Premium Guides</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Discover verified elite guides with premium service standards, clear ratings, and transparent hourly pricing.
          </p>
        </header>

        {loading && (
          <section className="flex min-h-[40vh] items-center justify-center">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/70 px-5 py-4 text-sm text-zinc-400 backdrop-blur-md">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              Loading premium guides...
            </div>
          </section>
        )}

        {!loading && error && (
          <section className="flex min-h-[40vh] items-center justify-center">
            <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-zinc-900/80 p-6 text-center shadow-2xl backdrop-blur-md">
              <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
              <h2 className="mt-3 text-xl font-semibold">Unable to load guides</h2>
              <p className="mt-2 text-sm text-zinc-400">{error}</p>
            </div>
          </section>
        )}

        {!loading && !error && guides.length === 0 && (
          <section className="flex min-h-[40vh] items-center justify-center">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-900/80 p-6 text-center shadow-2xl backdrop-blur-md">
              <Users className="mx-auto h-8 w-8 text-amber-400" />
              <h2 className="mt-3 text-xl font-semibold">No guides available</h2>
              <p className="mt-2 text-sm text-zinc-400">Please check back shortly for newly verified guide profiles.</p>
            </div>
          </section>
        )}

        {!loading && !error && guides.length > 0 && (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
