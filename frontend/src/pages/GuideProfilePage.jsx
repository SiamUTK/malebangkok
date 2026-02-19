import { AlertTriangle, CalendarClock, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import RatingStars from "../components/RatingStars";
import { normalizeApiError } from "../utils/normalizeApiError";

const priceFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export default function GuideProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingCtaLoading, setBookingCtaLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchGuide() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/guides/${id}`);
        if (mounted) {
          setGuide(response.data?.guide || null);
        }
      } catch (requestError) {
        if (mounted) {
          setError(normalizeApiError(requestError, "Unable to load guide profile."));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchGuide();

    return () => {
      mounted = false;
    };
  }, [id]);

  const displayPrice = useMemo(() => Number(guide?.base_price ?? guide?.price_per_hour ?? 0), [guide]);
  const rating = useMemo(() => Number(guide?.avg_rating ?? guide?.rating ?? 0), [guide]);

  const handleStartBooking = () => {
    setBookingCtaLoading(true);
    navigate(`/booking/${id}`);
  };

  if (loading) {
    return (
      <section className="section-shell">
        <div className="container-premium flex min-h-[45vh] items-center justify-center px-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#141419] px-4 py-3 text-sm text-[#F5F5F5]/80">
            <Loader2 className="h-4 w-4 animate-spin text-[#C6A75E]" />
            Loading guide profile...
          </div>
        </div>
      </section>
    );
  }

  if (error || !guide) {
    return (
      <section className="section-shell">
        <div className="container-premium">
          <div className="mx-auto max-w-xl rounded-2xl border border-red-400/25 bg-[#141419] p-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
            <h1 className="mt-3 text-2xl font-semibold">Unable to load profile</h1>
            <p className="mt-2 text-sm text-[#F5F5F5]/75">{error || "Guide not found."}</p>
            <button
              type="button"
              className="accent-button mt-6"
              onClick={() => navigate("/")}
            >
              Back to guides
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell">
      <div className="container-premium">
        <div className="grid-12 items-start gap-y-8">
          <div className="md:col-span-8 space-y-6">
            <div className="panel-glass p-6 sm:p-8">
              <span className="text-xs uppercase tracking-[0.16em] text-[#C6A75E]">Verified Elite Guide</span>
              <h1 className="mt-2 text-3xl font-semibold">{guide.name}</h1>
              <p className="mt-3 text-sm text-[#F5F5F5]/75">{guide.bio}</p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.12em] text-[#F5F5F5]/75">
                {guide.city && <span className="rounded-full border border-white/20 px-3 py-1">{guide.city}</span>}
                <span className="rounded-full border border-white/20 px-3 py-1">{guide.age ? `${guide.age} years` : "Age private"}</span>
                <span className="rounded-full border border-white/20 px-3 py-1">{guide.verification_status || "verified"}</span>
              </div>

              <div className="mt-6 flex items-center gap-3 text-sm">
                <RatingStars rating={rating} />
                <span className="font-semibold">{rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <aside className="md:col-span-4 md:sticky md:top-28">
            <div className="panel-glass p-6">
              <p className="text-xs uppercase tracking-[0.14em] text-[#C6A75E]">Booking Panel</p>
              <p className="mt-3 text-3xl font-semibold">{priceFormatter.format(displayPrice)}</p>
              <p className="text-sm text-[#F5F5F5]/70">per hour</p>

              <div className="mt-6 rounded-2xl border border-white/15 bg-[#141419] px-4 py-3 text-sm text-[#F5F5F5]/75">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-[#C6A75E]" />
                  Live availability check in next step
                </div>
              </div>

              <button
                type="button"
                className="accent-button mt-6 w-full disabled:opacity-70"
                onClick={handleStartBooking}
                disabled={bookingCtaLoading}
              >
                {bookingCtaLoading ? "Opening booking..." : "Continue to Booking"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
