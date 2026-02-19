import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { stripePromise } from "../utils/stripeClient";
import { normalizeApiError } from "../utils/normalizeApiError";

function CheckoutForm({ bookingId, paymentIntentId, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || processing) {
      return;
    }

    setProcessing(true);
    setStatusMessage("Confirming payment...");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?bookingId=${bookingId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      const failureReason = encodeURIComponent(error.message || "Payment failed");
      navigate(`/payment/failed?bookingId=${bookingId}&reason=${failureReason}`);
      onError?.(error.message || "Payment confirmation failed.");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      navigate(
        `/payment/success?bookingId=${bookingId}&payment_intent=${encodeURIComponent(paymentIntent.id || paymentIntentId)}`
      );
      return;
    }

    if (paymentIntent?.status === "processing") {
      setStatusMessage("Payment is processing. We will update your booking shortly.");
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {statusMessage && <p className="text-sm text-[#F5F5F5]/75">{statusMessage}</p>}

      <button
        type="submit"
        className="accent-button w-full disabled:cursor-not-allowed disabled:opacity-70"
        disabled={!stripe || !elements || processing}
      >
        {processing ? "Processing payment..." : "Confirm Secure Payment"}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const { bookingId } = useParams();

  const [intentState, setIntentState] = useState({
    loading: true,
    error: "",
    clientSecret: "",
    paymentIntentId: "",
  });

  const [checkoutError, setCheckoutError] = useState("");

  const options = useMemo(() => {
    if (!intentState.clientSecret) {
      return null;
    }

    return {
      clientSecret: intentState.clientSecret,
      appearance: {
        theme: "night",
      },
    };
  }, [intentState.clientSecret]);

  useEffect(() => {
    let mounted = true;

    async function createOrReuseIntent() {
      setIntentState({
        loading: true,
        error: "",
        clientSecret: "",
        paymentIntentId: "",
      });

      try {
        const response = await api.post("/payments/intent", {
          bookingId: Number(bookingId),
        });

        if (mounted) {
          setIntentState({
            loading: false,
            error: "",
            clientSecret: response.data?.clientSecret || "",
            paymentIntentId: response.data?.paymentIntentId || "",
          });
        }
      } catch (requestError) {
        if (mounted) {
          setIntentState({
            loading: false,
            error: normalizeApiError(requestError, "Unable to initialize secure checkout."),
            clientSecret: "",
            paymentIntentId: "",
          });
        }
      }
    }

    createOrReuseIntent();

    return () => {
      mounted = false;
    };
  }, [bookingId]);

  if (!stripePromise) {
    return (
      <section className="section-shell">
        <div className="container-premium">
          <div className="mx-auto max-w-xl rounded-2xl border border-red-400/25 bg-[#141419] p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
            <h1 className="mt-3 text-2xl font-semibold">Checkout unavailable</h1>
            <p className="mt-2 text-sm text-[#F5F5F5]/75">Stripe publishable key is missing.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell">
      <div className="container-premium">
        <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
          <header className="text-center">
            <span className="text-xs uppercase tracking-[0.16em] text-[#C6A75E]">Secure Payment</span>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Complete Confidential Checkout</h1>
          </header>

          <div className="panel-glass p-5 sm:p-8">
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#C6A75E]/30 bg-[#C6A75E]/10 px-4 py-3 text-sm">
              <span>Encrypted transaction</span>
              <span className="text-[#C6A75E]">Stripe Elements</span>
            </div>

            {intentState.loading && (
              <div className="flex items-center justify-center py-10 text-sm text-[#F5F5F5]/75">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#C6A75E]" />
                Initializing payment...
              </div>
            )}

            {!intentState.loading && intentState.error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {intentState.error}
              </div>
            )}

            {!intentState.loading && !intentState.error && options && (
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm
                  bookingId={bookingId}
                  paymentIntentId={intentState.paymentIntentId}
                  onError={(message) => setCheckoutError(message)}
                />
              </Elements>
            )}

            {checkoutError && (
              <p className="mt-4 text-sm text-red-200">{checkoutError}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
