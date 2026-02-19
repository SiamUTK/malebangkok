import { BadgeCheck } from "lucide-react";

export default function VerifiedBadge({ verified }) {
  if (!verified) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/45 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-400">
      <BadgeCheck className="h-3.5 w-3.5" />
      Verified
    </span>
  );
}
