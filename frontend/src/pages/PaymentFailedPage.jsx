import { AlertTriangle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "";
  const reason = searchParams.get("reason") || "Payment could not be completed.";

  return (
    <section className="section-shell">
      <div className="container-premium">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-center sm:p-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-300" />
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-red-300">Payment Failed</p>
          <h1 className="mt-2 text-3xl font-semibold">Your payment was not completed</h1>
          <p className="mt-3 text-sm text-[#F5F5F5]/80">{reason}</p>

          <div className="mt-6 rounded-2xl border border-white/15 bg-[#141419] p-4 text-sm text-left">
            <p className="text-[#F5F5F5]/70">Booking reference</p>
            <p className="font-semibold">{bookingId ? `#${bookingId}` : "Not available"}</p>
            <p className="mt-3 text-[#F5F5F5]/70">
              If this issue persists, please contact support with your booking reference.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {bookingId ? (
              <Link to={`/checkout/${bookingId}`} className="accent-button inline-flex justify-center">
                Retry Payment
              </Link>
            ) : null}
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-6 py-3 text-sm font-semibold hover:border-[#C6A75E]/50"
            >
              Back to Guides
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
