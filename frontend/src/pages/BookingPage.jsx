import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { normalizeApiError } from "../utils/normalizeApiError";

const priceFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function toIsoDateTime(date, time) {
  if (!date || !time) {
    return "";
  }

  const combined = new Date(`${date}T${time}`);
  if (Number.isNaN(combined.getTime())) {
    return "";
  }

  return combined.toISOString();
}

export default function BookingPage() {
  const { guideId } = useParams();
  const navigate = useNavigate();

  const [guide, setGuide] = useState(null);
  const [loadingGuide, setLoadingGuide] = useState(true);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    date: "",
    time: "",
    durationHours: 1,
    notes: "",
  });

  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchGuide() {
      setLoadingGuide(true);
      setError("");
      try {
        const response = await api.get(`/guides/${guideId}`);
        if (mounted) {
          setGuide(response.data?.guide || null);
        }
      } catch (requestError) {
        if (mounted) {
          setError(normalizeApiError(requestError, "Unable to load guide for booking."));
        }
      } finally {
        if (mounted) {
          setLoadingGuide(false);
        }
      }
    }

    fetchGuide();

    return () => {
      mounted = false;
    };
  }, [guideId]);

  const bookingDateIso = useMemo(() => toIsoDateTime(form.date, form.time), [form.date, form.time]);

  useEffect(() => {
    let mounted = true;

    async function previewPricing() {
      if (!guide?.base_price || !bookingDateIso || !form.durationHours) {
        setPricing(null);
        return;
      }

      setPricingLoading(true);
      try {
        const response = await api.post("/bookings/pricing/preview", {
          basePrice: Number(guide.base_price),
          bookingDate: bookingDateIso,
          durationHours: Number(form.durationHours),
          premiumOptions: [],
        });

        if (mounted) {
          setPricing(response.data?.pricing || null);
        }
      } catch (requestError) {
        if (mounted) {
          setPricing(null);
        }
      } finally {
        if (mounted) {
          setPricingLoading(false);
        }
      }
    }

    previewPricing();

    return () => {
      mounted = false;
    };
  }, [bookingDateIso, form.durationHours, guide?.base_price]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "durationHours" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!bookingDateIso) {
      setError("Please select a valid date and time.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/bookings", {
        guideId: Number(guideId),
        bookingDate: bookingDateIso,
        durationHours: Number(form.durationHours),
        notes: form.notes.trim() || null,
        premiumOptions: [],
      });

      const createdBookingId = response.data?.booking?.id;
      navigate(`/checkout/${createdBookingId}`);
    } catch (requestError) {
      setError(normalizeApiError(requestError, "Unable to create booking. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingGuide) {
    return (
      <section className="section-shell">
        <div className="container-premium flex min-h-[45vh] items-center justify-center px-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#141419] px-4 py-3 text-sm text-[#F5F5F5]/80">
            <Loader2 className="h-4 w-4 animate-spin text-[#C6A75E]" />
            Loading booking details...
          </div>
        </div>
      </section>
    );
  }

  if (!guide) {
    return (
      <section className="section-shell">
        <div className="container-premium">
          <div className="mx-auto max-w-xl rounded-2xl border border-red-400/25 bg-[#141419] p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
            <h1 className="mt-3 text-2xl font-semibold">Booking unavailable</h1>
            <p className="mt-2 text-sm text-[#F5F5F5]/75">{error || "Guide not found."}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell">
      <div className="container-premium">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="panel-glass p-5 sm:p-7">
              <p className="text-xs uppercase tracking-[0.16em] text-[#C6A75E]">Create Booking</p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Reserve with {guide.name}</h1>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-[#F5F5F5]/75">Date</span>
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-white/15 bg-[#141419] px-4 py-3"
                      required
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="text-[#F5F5F5]/75">Time</span>
                    <input
                      type="time"
                      name="time"
                      value={form.time}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-white/15 bg-[#141419] px-4 py-3"
                      required
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="text-[#F5F5F5]/75">Duration (hours)</span>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="1"
                    name="durationHours"
                    value={form.durationHours}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/15 bg-[#141419] px-4 py-3"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-[#F5F5F5]/75">Notes (optional)</span>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={4}
                    maxLength={1500}
                    className="w-full rounded-2xl border border-white/15 bg-[#141419] px-4 py-3"
                    placeholder="Optional preferences or scheduling notes"
                  />
                </label>

                {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

                <button
                  type="submit"
                  className="accent-button w-full disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submitting || !bookingDateIso}
                >
                  {submitting ? "Creating booking..." : "Continue to Checkout"}
                </button>
              </form>
            </div>
          </div>

          <aside className="md:col-span-5">
            <div className="card-premium p-5 sm:p-6">
              <h2 className="text-xl font-semibold">Price Summary</h2>
              <p className="mt-2 text-sm text-[#F5F5F5]/70">Amounts are estimated and confirmed before payment.</p>

              {pricingLoading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-[#F5F5F5]/70">
                  <Loader2 className="h-4 w-4 animate-spin text-[#C6A75E]" />
                  Calculating pricing...
                </div>
              )}

              {!pricingLoading && (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#F5F5F5]/70">Base amount</span>
                    <span>{priceFormatter.format(Number(pricing?.baseAmount || 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#F5F5F5]/70">Peak surcharge</span>
                    <span>{priceFormatter.format(Number(pricing?.peakAmount || 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#F5F5F5]/70">Weekend surcharge</span>
                    <span>{priceFormatter.format(Number(pricing?.weekendAmount || 0))}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between text-base font-semibold text-[#C6A75E]">
                      <span>Total</span>
                      <span>{priceFormatter.format(Number(pricing?.totalAmount || guide.base_price || 0))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
