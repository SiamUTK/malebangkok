export default function Booking() {
  return (
    <>
      <section className="section-shell border-b border-white/10 bg-[#141419]">
        <div className="container-premium">
          <div className="space-y-4">
            <span className="text-xs uppercase tracking-[0.18em] text-[#C6A75E]">Guide Discovery</span>
            <h1 className="text-4xl font-semibold">Find Your Elite Guide</h1>
            <p className="max-w-2xl text-[#F5F5F5]/70">
              Advanced filtering, verified profiles, and premium availability management.
            </p>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container-premium">
          <div className="grid-12 items-start">
            <aside className="panel-glass p-6 md:col-span-3 md:sticky md:top-28">
              <h2 className="text-lg font-semibold">Filters</h2>
              <div className="mt-6 space-y-5 text-sm">
                <div className="space-y-2">
                  <label className="block text-[#F5F5F5]/70">Session Type</label>
                  <div className="rounded-2xl border border-white/15 bg-[#141419] px-4 py-3">Private Therapy</div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[#F5F5F5]/70">Price Range</label>
                  <div className="rounded-2xl border border-white/15 bg-[#141419] px-4 py-3">THB 4,000 - THB 15,000</div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[#F5F5F5]/70">Languages</label>
                  <div className="rounded-2xl border border-white/15 bg-[#141419] px-4 py-3">English / Thai / Japanese</div>
                </div>
                <button type="button" className="accent-button w-full">
                  Apply Filters
                </button>
              </div>
            </aside>

            <div className="md:col-span-9">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[#F5F5F5]/70">Showing 12 verified guides</p>
                <button type="button" className="rounded-2xl border border-white/15 px-4 py-2 text-sm hover:border-[#C6A75E]/60">
                  Sort: Premium Rating
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <article key={index} className="card-premium hover-glow p-5">
                    <div className="h-44 rounded-2xl bg-white/10" />
                    <h3 className="mt-4 text-lg font-semibold">Guide Profile {index + 1}</h3>
                    <p className="mt-2 text-sm text-[#F5F5F5]/70">Lifestyle Therapy • VIP Hosting</p>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-[#C6A75E]">From THB 6,500</span>
                      <span className="text-[#F5F5F5]/65">4.9 ★</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-10 flex justify-center">
                <button type="button" className="rounded-2xl border border-white/15 px-7 py-3 text-sm uppercase tracking-[0.12em] hover:border-[#C6A75E]/60">
                  Load More Guides
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
