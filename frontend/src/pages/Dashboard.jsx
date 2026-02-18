export default function Dashboard() {
  return (
    <section className="section-shell">
      <div className="container-premium">
        <div className="grid-12 items-start gap-y-8">
          <aside className="md:col-span-2 md:sticky md:top-28">
            <div className="panel-glass p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-[#C6A75E]">Member Area</p>
              <nav className="mt-5 space-y-2 text-sm">
                <button type="button" className="w-full rounded-xl border border-[#C6A75E]/40 bg-[#C6A75E]/10 px-3 py-2 text-left text-[#C6A75E]">
                  Overview
                </button>
                <button type="button" className="w-full rounded-xl border border-white/15 px-3 py-2 text-left hover:border-[#C6A75E]/50">
                  My Bookings
                </button>
                <button type="button" className="w-full rounded-xl border border-white/15 px-3 py-2 text-left hover:border-[#C6A75E]/50">
                  Saved Guides
                </button>
                <button type="button" className="w-full rounded-xl border border-white/15 px-3 py-2 text-left hover:border-[#C6A75E]/50">
                  Account Security
                </button>
              </nav>
            </div>
          </aside>

          <div className="space-y-8 md:col-span-10">
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[#C6A75E]">User Dashboard</p>
              <h1 className="text-4xl font-semibold">Welcome Back, Member</h1>
            </header>

            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Active Bookings", "03"],
                ["Completed Sessions", "18"],
                ["Saved Guides", "07"],
                ["Member Tier", "Elite"],
              ].map(([label, value]) => (
                <article key={label} className="card-premium hover-glow p-5">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#F5F5F5]/65">{label}</p>
                  <p className="mt-3 text-3xl font-semibold text-[#C6A75E]">{value}</p>
                </article>
              ))}
            </section>

            <section className="card-premium overflow-hidden p-0">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-2xl font-semibold">Booking History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-[0.1em] text-[#F5F5F5]/70">
                    <tr>
                      <th className="px-6 py-4">Reference</th>
                      <th className="px-6 py-4">Guide</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-t border-white/10">
                        <td className="px-6 py-4">MBK-2026-{index + 101}</td>
                        <td className="px-6 py-4">Guide {index + 1}</td>
                        <td className="px-6 py-4">19 Feb 2026</td>
                        <td className="px-6 py-4">THB 9,000</td>
                        <td className="px-6 py-4">
                          <span className="rounded-full border border-[#C6A75E]/35 bg-[#C6A75E]/10 px-3 py-1 text-xs text-[#C6A75E]">
                            Confirmed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
