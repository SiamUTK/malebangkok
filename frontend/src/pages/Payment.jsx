export default function Payment() {
  return (
    <section className="section-shell">
      <div className="container-premium">
        <div className="mx-auto max-w-2xl space-y-8">
          <header className="text-center">
            <span className="text-xs uppercase tracking-[0.16em] text-[#C6A75E]">Secure Payment</span>
            <h1 className="mt-3 text-4xl font-semibold">Complete Confidential Checkout</h1>
          </header>

          <div className="panel-glass p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#C6A75E]/30 bg-[#C6A75E]/10 px-4 py-3 text-sm">
              <span>Encrypted Transaction</span>
              <span className="text-[#C6A75E]">PCI Compliant</span>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#F5F5F5]/70">Cardholder Name</p>
                <p className="mt-2">Member Full Name</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#F5F5F5]/70">Card Details</p>
                <p className="mt-2">Stripe Card Element Placeholder</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[#F5F5F5]/70">Billing Address</p>
                <p className="mt-2">Billing details form placeholder</p>
              </div>
            </div>

            <button type="button" className="accent-button mt-8 w-full">
              Confirm Secure Payment
            </button>
          </div>

          <div className="card-premium p-6 text-center">
            <p className="text-sm uppercase tracking-[0.12em] text-[#C6A75E]">Confirmation State</p>
            <h2 className="mt-3 text-2xl font-semibold">Payment Confirmed</h2>
            <p className="mt-2 text-sm text-[#F5F5F5]/70">Booking reference and encrypted receipt delivery are displayed here.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
