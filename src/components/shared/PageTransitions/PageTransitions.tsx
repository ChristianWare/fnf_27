"use client";

// Page transitions for every internal link on the site.
//
// When someone clicks a link to another page, this asks the browser to
// snapshot the screen, has Next.js load the new page, and tells the browser
// the moment the new page is on screen. The browser then animates from the
// snapshot to the new page; the animation itself is in globals.css.
//
// It calls the browser's View Transitions API directly instead of going
// through React's <ViewTransition>, which can cancel a transition if any
// other update lands while the browser is taking its snapshot. Browsers
// without view transitions, and people who turn off motion, change pages
// normally.

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// If the new page takes longer than this to arrive, show it without
// waiting any longer (browsers give up on a transition after about 4s).
const TIMEOUT = 3000;

export default function PageTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const finish = useRef<(() => void) | null>(null);

  // The new page has just rendered: let the browser take its "after"
  // snapshot and start the animation.
  useLayoutEffect(() => {
    finish.current?.();
    finish.current = null;
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Leave anything that isn't a plain left click alone (new tabs etc.).
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (typeof document.startViewTransition !== "function") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const target = e.target as Element | null;
      const link = target?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      // Add data-no-transition to any link that shouldn't animate.
      if (link.hasAttribute("data-no-transition")) return;

      const url = new URL(link.href, window.location.href);
      // Other websites, and links within the same page, behave as usual.
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      // Handle the navigation here, so Next's own link handler stands down.
      e.preventDefault();
      const href = url.pathname + url.search + url.hash;

      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, TIMEOUT);
            finish.current = () => {
              window.clearTimeout(timer);
              resolve();
            };
            router.push(href);
          }),
      );

      // While developing, say why if a browser ever skips a transition.
      if (process.env.NODE_ENV !== "production") {
        transition.ready.catch((error) => {
          console.warn("Page transition skipped:", error);
        });
      }
    };

    // Capture phase, so this runs before Next's link handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}
