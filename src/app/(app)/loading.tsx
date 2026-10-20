import { Spinner } from "@/components/Spinner";

/** Shown instantly while the next page loads on the server. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite" aria-label="Loading">
      <div className="flex items-center gap-3 text-muted">
        <Spinner className="h-5 w-5 text-blue" />
        <span className="font-bold">
          Lädt … <span className="bn font-normal">লোড হচ্ছে</span>
        </span>
      </div>
      <div className="h-9 w-2/3 animate-pulse rounded-xl bg-surface-2" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-28 animate-pulse bg-surface-2/60" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card h-16 animate-pulse bg-surface-2/60" />
      ))}
    </div>
  );
}
