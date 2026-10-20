"use client";
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Spinner } from "./Spinner";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  /** Async handlers keep the spinner on until their promise settles. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => unknown;
  /** Show the spinner from outside, e.g. while a form submits or a page refreshes. */
  loading?: boolean;
  /** Optional text while loading; the normal label stays otherwise. */
  loadingText?: ReactNode;
};

/**
 * Button that shows a spinner and ignores further clicks while its work runs.
 * It stays in full colour (aria-disabled instead of disabled) so it reads as
 * "working", not "unavailable".
 */
export function LoadingButton({ onClick, loading, loadingText, children, className = "btn", disabled, type = "button", ...rest }: Props) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const working = busy || !!loading;

  async function handle(e: MouseEvent<HTMLButtonElement>) {
    if (working) {
      e.preventDefault();
      return;
    }
    const result = onClick?.(e);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setBusy(true);
      try {
        await result;
      } finally {
        if (mounted.current) setBusy(false);
      }
    }
  }

  return (
    <button
      {...rest}
      type={type}
      className={`${className} ${working ? "cursor-progress" : ""}`}
      disabled={disabled && !working}
      aria-disabled={working || disabled || undefined}
      aria-busy={working || undefined}
      onClick={handle}
    >
      {working && <Spinner />}
      {working && loadingText ? loadingText : children}
    </button>
  );
}
