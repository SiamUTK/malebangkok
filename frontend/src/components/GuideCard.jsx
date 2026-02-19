import { Banknote, Calendar, Heart, Loader2, Shield, TrendingUp } from "lucide-react";
import { useState } from "react";
import RatingStars from "./RatingStars";
import VerifiedBadge from "./VerifiedBadge";

const priceFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export default function GuideCard({ guide, onSelect, onBook, isNavigating = false }) {
  const {
    id,
    name,
    bio,
    age,
    price_per_hour,
    base_price,
    rating,
    avg_rating,
    verified,
    verification_status,
    created_at,
    total_bookings,
    reviews_count,
  } = guide;

  const [isHovered, setIsHovered] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const displayPrice = Number(base_price ?? price_per_hour ?? 0);
  const displayRating = Number(avg_rating ?? rating ?? 0);
  const isVerified = verification_status === "verified" || Number(verified) === 1;

  const joinedDate = created_at
    ? new Date(created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
    : null;

  const memberSince = created_at
    ? Math.floor((Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  const memberTenureText =
    memberSince < 1 ? "New" : memberSince < 12 ? `${memberSince}mo` : `${Math.floor(memberSince / 12)}y`;

  const bookingCountDisplay = total_bookings || 0;
  const reviewCountDisplay = reviews_count || 0;

  const isHotGuide = bookingCountDisplay > 20;
  const hasStrongRating = displayRating >= 4.7;
  const isNewGuide = memberSince < 3;

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 via-zinc-900/50 to-zinc-900/30 p-5 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-amber-400/40 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-400/20 sm:p-6 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect?.(id)}
    >
      {/* Badge Stack (Top-Right) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        {isVerified && (
          <div className="flex items-center gap-1 rounded-full bg-amber-400/10 border border-amber-400/30 px-2 py-1 backdrop-blur-sm">
            <Shield className="h-3 w-3 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Verified</span>
          </div>
        )}

        {isHotGuide && (
          <div className="flex items-center gap-1 rounded-full bg-orange-400/10 border border-orange-400/30 px-2 py-1 backdrop-blur-sm animate-pulse">
            <TrendingUp className="h-3 w-3 text-orange-400" />
            <span className="text-xs font-semibold text-orange-400">Trending</span>
          </div>
        )}

        {isNewGuide && (
          <div className="flex items-center gap-1 rounded-full bg-blue-400/10 border border-blue-400/30 px-2 py-1 backdrop-blur-sm">
            <span className="text-xs font-semibold text-blue-400">New</span>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSaved(!isSaved);
          }}
          className={`p-2 rounded-full transition-all duration-200 ${
            isSaved
              ? "bg-red-400/20 border border-red-400/40"
              : "bg-white/5 border border-white/10 hover:bg-white/10"
          }`}
          aria-label="Save guide"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isSaved ? "fill-red-400 text-red-400" : "text-zinc-400"
            }`}
          />
        </button>
      </div>

      {/* Main content */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="pr-24">
            <h3 className="text-lg sm:text-xl font-semibold leading-tight text-zinc-100 group-hover:text-amber-300 transition-colors">
              {name}
            </h3>

            {/* Trust & Metadata Row */}
            <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-zinc-400">
              {age ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5">
                  <Calendar className="h-3 w-3" />
                  {age} yrs
                </span>
              ) : (
                <span className="px-2 py-1">Age private</span>
              )}

              {joinedDate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5">
                  Member {memberTenureText}
                </span>
              )}

              {bookingCountDisplay > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400/10 text-amber-300 font-medium">
                  {bookingCountDisplay} bookings
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        <p
          className="min-h-[3.5rem] text-sm leading-5 text-zinc-300 group-hover:text-zinc-200 transition-colors line-clamp-3"
        >
          {bio}
        </p>
      </div>

      {/* Rating & Review Count */}
      <div
        className={`my-4 p-3 rounded-lg transition-all duration-300 ${
          isHovered
            ? "bg-amber-400/5 border border-amber-400/20"
            : "bg-white/5 border border-white/10"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex">
              <RatingStars rating={displayRating} />
            </div>
            <span className="text-sm font-semibold text-zinc-100">
              {displayRating.toFixed(1)}
            </span>
          </div>

          {reviewCountDisplay > 0 && (
            <span className="text-xs text-zinc-400">
              {reviewCountDisplay} {reviewCountDisplay === 1 ? "review" : "reviews"}
            </span>
          )}

          {hasStrongRating && (
            <span className="text-xs font-semibold text-amber-300 bg-amber-400/10 px-2 py-1 rounded-full">
              Highly Rated
            </span>
          )}
        </div>
      </div>

      {/* Price Section */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-sm">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-zinc-400 font-medium">
            Starting Price
          </p>
          <p className="mt-2 text-lg sm:text-xl font-bold text-amber-300">
            {priceFormatter.format(displayPrice)}
            <span className="text-xs text-zinc-400 font-normal">/hr</span>
          </p>
        </div>

        {/* Call-to-Action Indicator */}
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.08em] text-zinc-400 font-medium">View Profile</p>
          <p className={`mt-2 text-sm font-semibold transition-all duration-300 ${isHovered ? "text-amber-300" : "text-zinc-300"}`}>
            {isNavigating ? <Loader2 className="h-4 w-4 animate-spin" /> : "→"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBook?.(id);
        }}
        disabled={isNavigating}
        className="mt-4 w-full rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isNavigating ? "Opening..." : "Book this guide"}
      </button>

      {/* Hover CTA Overlay */}
      {isHovered && (
        <div className="mt-4 text-center animation-in fade-in duration-200">
          <p className="text-xs text-zinc-400 mb-2">Click to view full profile & book</p>
          <div className="inline-block px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-xs text-amber-300 font-medium">
            Reserve Private Session
          </div>
        </div>
      )}

      {/* Scarcity Line (if hot) */}
      {isHotGuide && (
        <div className="mt-3 pt-3 border-t border-white/10 text-center">
          <p className="text-xs text-orange-300 font-medium">
            💫 Frequently booked • Check availability
          </p>
        </div>
      )}
    </article>
  );
}
