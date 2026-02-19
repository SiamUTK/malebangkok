import { CheckCircle2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "-";
  const paymentIntent = searchParams.get("payment_intent") || "-";

  return (
    <section className="section-shell">
      <div className="container-premium">
        <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-emerald-300">Payment Confirmed</p>
          <h1 className="mt-2 text-3xl font-semibold">Your booking is secured</h1>
          <p className="mt-3 text-sm text-[#F5F5F5]/80">
            We have received your payment and are finalizing your booking confirmation details.
          </p>

          <div className="mt-6 rounded-2xl border border-white/15 bg-[#141419] p-4 text-left text-sm">
            <p className="text-[#F5F5F5]/70">Booking reference</p>
            <p className="font-semibold">#{bookingId}</p>
            <p className="mt-3 text-[#F5F5F5]/70">Payment intent</p>
            <p className="break-all font-semibold">{paymentIntent}</p>
          </div>

          <div className="mt-6 space-y-2 text-sm text-[#F5F5F5]/75">
            <p>Next steps:</p>
            <p>• Payment receipt is available in your Stripe record.</p>
            <p>• Booking status updates as soon as webhook confirmation is processed.</p>
          </div>

          <Link to="/" className="accent-button mt-8 inline-flex">
            Back to Guides
          </Link>
        </div>
      </div>
    </section>
  );
}
