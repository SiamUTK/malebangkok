export default function BookingFlow() {
  return (
    <section className="section-shell">
      <div className="container-premium">
        <div className="mb-8 space-y-4">
          <span className="text-xs uppercase tracking-[0.16em] text-[#C6A75E]">Booking Flow</span>
          <h1 className="text-4xl font-semibold">Secure Session Setup</h1>
        </div>

        <div className="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-[#141419] p-4 text-xs uppercase tracking-[0.12em] text-[#F5F5F5]/70 sm:grid-cols-4 sm:p-5">
          <div className="rounded-xl border border-[#C6A75E]/50 bg-[#C6A75E]/10 px-4 py-3 text-[#C6A75E]">Step 1: Session</div>
          <div className="rounded-xl border border-white/15 px-4 py-3">Step 2: Preferences</div>
          <div className="rounded-xl border border-white/15 px-4 py-3">Step 3: Verification</div>
          <div className="rounded-xl border border-white/15 px-4 py-3">Step 4: Confirm</div>
        </div>

        <div className="grid-12 items-start gap-y-8">
          <div className="md:col-span-8">
            <form className="card-premium p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">Session Details</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-[#F5F5F5]/70">Guide Selection</span>
                  <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">Choose guide</div>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[#F5F5F5]/70">Session Date</span>
                  <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">Select date</div>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[#F5F5F5]/70">Session Time</span>
                  <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">Select time</div>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-[#F5F5F5]/70">Duration</span>
                  <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">90 minutes</div>
                </label>
                <label className="space-y-2 text-sm sm:col-span-2">
                  <span className="text-[#F5F5F5]/70">Private Notes</span>
                  <div className="min-h-32 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">Preference details and access instructions</div>
                </label>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" className="rounded-2xl border border-white/15 px-6 py-3 font-medium hover:border-[#C6A75E]/60">
                  Back
                </button>
                <button type="button" className="accent-button">
                  Continue to Payment
                </button>
              </div>
            </form>
          </div>

          <aside className="md:col-span-4">
            <div className="panel-glass p-6 md:sticky md:top-28">
              <h2 className="text-xl font-semibold">Price Summary</h2>
              <div className="mt-6 space-y-3 text-sm text-[#F5F5F5]/75">
                <div className="flex justify-between">
                  <span>Base Session</span>
                  <span>THB 7,500</span>
                </div>
                <div className="flex justify-between">
                  <span>Premium Service Fee</span>
                  <span>THB 1,200</span>
                </div>
                <div className="flex justify-between">
                  <span>Privacy Protection</span>
                  <span>THB 300</span>
                </div>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-[#C6A75E]">THB 9,000</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
