import { Star } from "lucide-react";

const MAX_STARS = 5;

export default function RatingStars({ rating = 0 }) {
  const safeRating = Number.isFinite(Number(rating)) ? Math.max(0, Math.min(5, Number(rating))) : 0;
  const fullStars = Math.floor(safeRating);
  const hasHalf = safeRating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${safeRating.toFixed(1)} of 5`}>
      {Array.from({ length: MAX_STARS }).map((_, index) => {
        const isFull = index < fullStars;
        const isHalf = index === fullStars && hasHalf;

        return (
          <span key={index} className="relative inline-flex h-4 w-4">
            <Star className="absolute inset-0 h-4 w-4 text-white/20" strokeWidth={1.8} />
            {(isFull || isHalf) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: isHalf ? "50%" : "100%" }}
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={1.8} />
              </span>
            )}
          </span>
        );
      })}
      <span className="ml-1 text-xs font-medium text-zinc-400">{safeRating.toFixed(1)}</span>
    </div>
  );
}
