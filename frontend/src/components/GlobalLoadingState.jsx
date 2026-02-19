import { Loader2 } from "lucide-react";

export default function GlobalLoadingState({ label = "Loading..." }) {
  return (
    <div className="flex min-h-[35vh] items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-300">
        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        <span>{label}</span>
      </div>
    </div>
  );
}
