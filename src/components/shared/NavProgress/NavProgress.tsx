"use client";

// A thin accent bar across the top of the screen while a page loads or a
// save is on its way, so every click is clearly being worked on. It grows
// from left to right, quickly at first and then slowing as it nears the
// end, and fills the rest the moment the work is done. (Neither reports
// real progress, so the bar shows "working" and "done".)

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { navProgress } from "./navProgressStore";
import styles from "./NavProgress.module.css";

const SHOW_AFTER_MS = 120; // quick updates never flash the bar
const GIVE_UP_MS = 15_000;

// Links that download a file or leave through a route rather than load a
// page here: the bar would have nothing to wait for.
const NOT_A_PAGE =
  /\/(pdf|export)$|\/invoices\/[^/]+$|\/documents\/[^/]+$|^\/api\//;

export default function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let trickle: ReturnType<typeof setInterval> | undefined;
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let progress = 0;
    let visible = false;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const set = (p: number) => {
      progress = p;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const clear = () => {
      clearTimeout(showTimer);
      clearInterval(trickle);
      clearTimeout(giveUp);
      clearTimeout(hideTimer);
    };

    const begin = () => {
      clear();
      giveUp = setTimeout(() => navProgress.reset(), GIVE_UP_MS);
      // Still on screen from the last one: carry on from where it is.
      if (visible) {
        const el = bar.current;
        if (el) el.style.opacity = "1";
        if (!reduce)
          trickle = setInterval(
            () => set(progress + (0.9 - progress) * 0.12),
            300,
          );
        return;
      }
      showTimer = setTimeout(() => {
        const el = bar.current;
        if (!el) return;
        visible = true;
        el.hidden = false;
        el.style.opacity = "1";
        document.documentElement.dataset.navLoading = "1";
        if (reduce) return set(1);
        set(0.2);
        trickle = setInterval(
          () => set(progress + (0.9 - progress) * 0.12),
          300,
        );
      }, SHOW_AFTER_MS);
    };

    const finish = () => {
      clear();
      delete document.documentElement.dataset.navLoading;
      const el = bar.current;
      if (!el || !visible) {
        set(0);
        return;
      }
      set(1);
      hideTimer = setTimeout(() => {
        el.style.opacity = "0";
        hideTimer = setTimeout(() => {
          visible = false;
          el.hidden = true;
          set(0);
        }, 300);
      }, 200);
    };

    const unsubscribe = navProgress.subscribe((on) =>
      on ? begin() : finish(),
    );

    // Clicking a link to another page on the site starts the bar too.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !a ||
        (a.target && a.target !== "_self") ||
        a.hasAttribute("download") ||
        a.dataset.noProgress !== undefined
      ) {
        return;
      }
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return; // same page (or just a #section on it)
      }
      if (NOT_A_PAGE.test(url.pathname)) return;
      navProgress.start();
    };
    document.addEventListener("click", onClick, true);

    // Back from another site with the page restored from cache.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) navProgress.reset();
    };
    window.addEventListener("pageshow", onShow);

    return () => {
      unsubscribe();
      clear();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onShow);
      delete document.documentElement.dataset.navLoading;
    };
  }, []);

  // The new page (or new filters) is on screen.
  useEffect(() => {
    navProgress.done();
  }, [pathname, search]);

  return (
    <div
      ref={bar}
      className={styles.bar}
      role='progressbar'
      aria-label='Loading'
      hidden
    />
  );
}
