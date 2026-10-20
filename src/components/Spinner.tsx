export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Centered spinner with a short bilingual label, for waiting inside a card. */
export function Busy({ label = "Einen Moment …", bn = "একটু অপেক্ষা করো" }: { label?: string; bn?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-muted" role="status" aria-live="polite">
      <Spinner className="h-6 w-6 text-blue" />
      <span>
        {label} <span className="bn">{bn}</span>
      </span>
    </div>
  );
}
