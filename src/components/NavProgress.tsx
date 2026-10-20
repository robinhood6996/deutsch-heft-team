"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { progress } from "@/lib/progress";

/**
 * Thin bar at the top of the screen whenever a page is loading: after clicking
 * any internal link, and while useAppRouter navigations or refreshes run.
 */
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(
    () =>
      progress.subscribe((on) => {
        clear();
        if (on) {
          setVisible(true);
          setWidth(8);
          timers.current.push(setTimeout(() => setWidth(45), 60));
          timers.current.push(setTimeout(() => setWidth(75), 900));
          timers.current.push(setTimeout(() => setWidth(90), 2500));
          timers.current.push(setTimeout(() => progress.reset(), 20000)); // never stick forever
        } else {
          setWidth(100);
          timers.current.push(setTimeout(() => setVisible(false), 250));
          timers.current.push(setTimeout(() => setWidth(0), 500));
        }
      }),
    [],
  );

  // A finished navigation always ends the bar
  useEffect(() => {
    progress.reset();
  }, [pathname, search]);

  // Any click on an internal link starts it
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      progress.start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms" }}
    >
      <div className="h-full bg-gold-bg shadow-[0_0_8px_var(--color-gold-bg)]" style={{ width: `${width}%`, transition: "width 400ms ease-out" }} />
    </div>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
