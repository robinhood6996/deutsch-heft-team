"use client";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Tiny global signal for the top progress bar. */
type Listener = (active: boolean) => void;
const listeners = new Set<Listener>();
let active = 0;
const emit = () => listeners.forEach((l) => l(active > 0));

export const progress = {
  start() {
    active++;
    emit();
  },
  done() {
    active = Math.max(0, active - 1);
    emit();
  },
  reset() {
    active = 0;
    emit();
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/**
 * Like useRouter, but push/replace/refresh run inside a transition and drive the
 * top progress bar until the new page has actually rendered. `pending` is true
 * meanwhile, so buttons can keep their spinner.
 */
export function useAppRouter() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const running = useRef(false);

  useEffect(() => {
    if (!pending && running.current) {
      running.current = false;
      progress.done();
    }
  }, [pending]);
  useEffect(
    () => () => {
      if (running.current) progress.done();
    },
    [],
  );

  const run = (fn: () => void) => {
    if (!running.current) {
      running.current = true;
      progress.start();
    }
    startTransition(fn);
  };

  return {
    pending,
    push: (href: string) => run(() => router.push(href)),
    replace: (href: string) => run(() => router.replace(href)),
    refresh: () => run(() => router.refresh()),
  };
}
