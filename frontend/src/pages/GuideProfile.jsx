export default function GuideProfile() {
  return (
    <section className="section-shell">
      <div className="container-premium">
        <div className="grid-12 items-start gap-y-8">
          <div className="md:col-span-8 space-y-8">
            <div className="panel-glass p-6 sm:p-8">
              <div className="grid gap-6 md:grid-cols-12 md:items-end">
                <div className="md:col-span-4">
                  <div className="h-52 rounded-2xl bg-white/10" />
                </div>
                <div className="space-y-3 md:col-span-8">
                  <span className="text-xs uppercase tracking-[0.16em] text-[#C6A75E]">Verified Elite Guide</span>
                  <h1 className="text-3xl font-semibold">Guide Name Placeholder</h1>
                  <p className="text-[#F5F5F5]/75">Therapeutic presence • Luxury companionship • Cultural hosting</p>
                  <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F5]/70">
                    <span className="rounded-full border border-white/20 px-3 py-1">Bangkok Central</span>
                    <span className="rounded-full border border-white/20 px-3 py-1">4.9 Rating</span>
                    <span className="rounded-full border border-white/20 px-3 py-1">ID Verified</span>
                  </div>
                </div>
              </div>
            </div>

            <section className="card-premium p-6 sm:p-8">
              <div className="flex flex-wrap gap-3 border-b border-white/10 pb-5 text-sm">
                <button type="button" className="rounded-xl border border-[#C6A75E]/50 px-4 py-2 text-[#C6A75E]">Overview</button>
                <button type="button" className="rounded-xl border border-white/15 px-4 py-2">Services</button>
                <button type="button" className="rounded-xl border border-white/15 px-4 py-2">Reviews</button>
                <button type="button" className="rounded-xl border border-white/15 px-4 py-2">Availability</button>
              </div>
              <div className="pt-6 text-sm text-[#F5F5F5]/75">
                Profile information block for private introduction, etiquette standards, and member expectations.
              </div>
            </section>

            <section className="card-premium p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">Services</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  "Private Therapy Session",
                  "Lifestyle Concierge Companion",
                  "Wellness & Mindset Support",
                  "VIP Evening Hosting",
                ].map((service) => (
                  <article key={service} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="font-medium">{service}</h3>
                    <p className="mt-2 text-sm text-[#F5F5F5]/65">Custom duration • Premium protocol</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="card-premium p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">Member Reviews</h2>
              <div className="mt-6 space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <article key={index} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm text-[#F5F5F5]/75">Verified member review summary with discreet feedback and quality score.</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.12em] text-[#C6A75E]">Premium member • 5.0</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="md:col-span-4 md:sticky md:top-28">
            <div className="panel-glass p-6">
              <p className="text-xs uppercase tracking-[0.14em] text-[#C6A75E]">Booking Panel</p>
              <p className="mt-3 text-3xl font-semibold">THB 7,500</p>
              <p className="text-sm text-[#F5F5F5]/70">per 60 minutes</p>
              <div className="mt-6 space-y-3 text-sm">
                <div className="rounded-2xl border border-white/15 bg-[#141419] px-4 py-3">Select Date</div>
                <div className="rounded-2xl border border-white/15 bg-[#141419] px-4 py-3">Select Time</div>
                <div className="rounded-2xl border border-white/15 bg-[#141419] px-4 py-3">Service Type</div>
              </div>
              <button type="button" className="accent-button mt-6 w-full">
                Continue to Booking
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
