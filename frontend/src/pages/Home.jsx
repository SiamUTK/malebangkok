export default function Home() {
  return (
    <>
      <section className="section-shell min-h-[calc(100vh-5rem)]">
        <div className="container-premium h-full">
          <div className="grid-12 h-full items-center">
            <div className="space-y-8 md:col-span-6">
              <span className="inline-flex rounded-full border border-[#C6A75E]/35 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#C6A75E]">
                Private Members Platform
              </span>
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                MaleBangkok
                <span className="block text-[#C6A75E]">Premium Male Therapy & Elite Lifestyle</span>
              </h1>
              <p className="max-w-xl text-base text-[#F5F5F5]/75 sm:text-lg">
                Discreet access to verified guides, secure bookings, and refined experiences in Bangkok.
              </p>
              <div className="flex flex-wrap gap-4">
                <button type="button" className="accent-button">
                  Explore Guides
                </button>
                <button
                  type="button"
                  className="rounded-2xl border border-white/20 px-6 py-3 font-semibold hover:border-[#C6A75E]/60"
                >
                  Membership Access
                </button>
              </div>
            </div>

            <div className="md:col-span-6">
              <div className="panel-glass p-6 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <article className="card-premium hover-glow p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#C6A75E]">Verified Guides</p>
                    <p className="mt-3 text-2xl font-semibold">120+</p>
                  </article>
                  <article className="card-premium hover-glow p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#C6A75E]">Private Bookings</p>
                    <p className="mt-3 text-2xl font-semibold">24/7</p>
                  </article>
                  <article className="card-premium hover-glow p-5 sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#C6A75E]">Security Layer</p>
                    <p className="mt-3 text-lg text-[#F5F5F5]/80">Encrypted profile verification, secure payments, discreet communication.</p>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell bg-[#141419]">
        <div className="container-premium">
          <div className="mb-10 space-y-3 text-center">
            <h2 className="text-3xl font-semibold">Premium Value</h2>
            <p className="text-[#F5F5F5]/70">Three pillars designed for members who expect excellence.</p>
          </div>
          <div className="grid-12">
            <article className="card-premium hover-glow p-6 md:col-span-4">
              <h3 className="text-xl font-semibold">Discreet Matching</h3>
              <p className="mt-3 text-sm text-[#F5F5F5]/75">Curated profiles with private preference alignment.</p>
            </article>
            <article className="card-premium hover-glow p-6 md:col-span-4">
              <h3 className="text-xl font-semibold">Elite Standards</h3>
              <p className="mt-3 text-sm text-[#F5F5F5]/75">Professional presentation, etiquette, and service quality.</p>
            </article>
            <article className="card-premium hover-glow p-6 md:col-span-4">
              <h3 className="text-xl font-semibold">Secure Operations</h3>
              <p className="mt-3 text-sm text-[#F5F5F5]/75">Protected transactions with member confidentiality controls.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container-premium">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold">Featured Guides</h2>
            <button type="button" className="text-sm uppercase tracking-[0.14em] text-[#C6A75E]">
              View All Guides
            </button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {["Ares", "Nox", "Kai", "Rene"].map((name) => (
              <article key={name} className="card-premium hover-glow p-5">
                <div className="h-44 rounded-2xl bg-white/10" />
                <h3 className="mt-4 text-lg font-semibold">{name}</h3>
                <p className="mt-2 text-sm text-[#F5F5F5]/70">Therapy • Lifestyle • Cultural Guide</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell bg-[#141419]">
        <div className="container-premium">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-semibold">How It Works</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["01", "Select Guide", "Review profiles and shortlist matches."],
              ["02", "Request Session", "Choose time, services, and secure preferences."],
              ["03", "Confirm Securely", "Complete encrypted payment and receive confirmation."],
            ].map(([step, title, text]) => (
              <article key={step} className="card-premium hover-glow p-6">
                <p className="text-sm font-semibold tracking-[0.16em] text-[#C6A75E]">{step}</p>
                <h3 className="mt-3 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm text-[#F5F5F5]/75">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="container-premium">
          <div className="panel-glass p-8 text-center sm:p-12">
            <h2 className="text-3xl font-semibold">Enter the Private Circle</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#F5F5F5]/75">
              Designed for members seeking refined companionship with uncompromising privacy.
            </p>
            <button type="button" className="accent-button mt-8">
              Begin Membership
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#141419] py-14">
        <div className="container-premium">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <h3 className="text-lg font-semibold tracking-[0.14em] text-[#C6A75E]">MALEBANGKOK</h3>
              <p className="mt-3 text-sm text-[#F5F5F5]/65">Luxury. Discreet. Secure.</p>
            </div>
            <div className="space-y-2 text-sm text-[#F5F5F5]/75">
              <p className="font-semibold text-[#F5F5F5]">Platform</p>
              <p>Guide Discovery</p>
              <p>Booking Flow</p>
              <p>Secure Payment</p>
            </div>
            <div className="space-y-2 text-sm text-[#F5F5F5]/75">
              <p className="font-semibold text-[#F5F5F5]">Members</p>
              <p>Dashboard</p>
              <p>Private Support</p>
              <p>Access Policy</p>
            </div>
            <div className="space-y-2 text-sm text-[#F5F5F5]/75">
              <p className="font-semibold text-[#F5F5F5]">Security</p>
              <p>Data Encryption</p>
              <p>Identity Protection</p>
              <p>Member Verification</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
