"use client";

// Pins part of a section while the page scrolls, and steps through `count`
// items as you go (one opens, the last one closes). Used by PlanDetails and
// AboutStory.
//
//   const { trackRef, stickyRef, active, setActive } = useScrollSteps(4);
//
//   <div ref={trackRef}>          ← grows tall to make room to scroll
//     <div ref={stickyRef}>…</div> ← stays on screen while you scroll
//   </div>
//
// It only pins when the pinned part fits on screen and the viewport is wider
// than `disableBelow`. Otherwise it's a normal click-to-open section, and
// `setActive` just switches items. When pinned, `setActive` scrolls the page
// to that item instead, so clicks and scrolling never disagree.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

type Options = {
  /** Turn the pinned scroll off at this viewport width and below (px). */
  disableBelow?: number;
  /** How far to scroll per item, as a fraction of the viewport height. */
  stepVh?: number;
};

export function useScrollSteps(
  count: number,
  { disableBelow = 568, stepVh = 0.7 }: Options = {},
) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const [active, setActiveIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const geo = useRef({ pinned: false, stickyTop: 0, length: 0 });
  const lenis = useLenis();

  useEffect(() => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!track || !sticky) return;

    const wide = window.matchMedia(`(min-width: ${disableBelow + 1}px)`);
    let frame = 0;

    const update = () => {
      frame = 0;
      const { pinned, stickyTop, length } = geo.current;
      if (!pinned || !length) return;
      const top = track.getBoundingClientRect().top;
      const progress = Math.min(
        0.9999,
        Math.max(0, (stickyTop - top) / length),
      );
      setActiveIndex(Math.floor(progress * count));
    };

    const unpin = () => {
      geo.current = { pinned: false, stickyTop: 0, length: 0 };
      track.style.height = "";
      sticky.style.position = "";
      sticky.style.top = "";
      setPinned(false);
    };

    // Size the track and place the pinned part. `decide` re-checks whether
    // pinning should be on at all; that only happens on load and when the
    // window resizes, so content changing height mid-scroll never flips it.
    const layout = (decide: boolean) => {
      const vh = window.innerHeight;
      const h = sticky.offsetHeight;

      if (decide) {
        const shouldPin = wide.matches && h <= vh;
        if (!shouldPin) {
          if (geo.current.pinned) unpin();
          return;
        }
      } else if (!geo.current.pinned) {
        return;
      }

      // Center it on screen. While it's pinned and an item with more text
      // opens, hold its position instead of re-centering (no jumps), only
      // nudging it up if its bottom would go off screen.
      let stickyTop = h <= vh ? Math.round((vh - h) / 2) : vh - h;
      if (!decide) stickyTop = Math.min(geo.current.stickyTop, vh - h);
      const length = Math.round(vh * stepVh * count);
      geo.current = { pinned: true, stickyTop, length };
      sticky.style.position = "sticky";
      sticky.style.top = `${stickyTop}px`;
      track.style.height = `${h + length}px`;
      setPinned(true);
      update();
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => layout(true);
    const ro = new ResizeObserver(() => layout(false));

    layout(true);
    ro.observe(sticky);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    wide.addEventListener("change", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      wide.removeEventListener("change", onResize);
      if (frame) cancelAnimationFrame(frame);
      unpin();
    };
  }, [count, disableBelow, stepVh]);

  const setActive = useCallback(
    (i: number) => {
      const track = trackRef.current;
      const { pinned, stickyTop, length } = geo.current;
      if (!track || !pinned || !length) {
        setActiveIndex(i);
        return;
      }
      // Land in the middle of that item's stretch of scrolling.
      const start =
        track.getBoundingClientRect().top + window.scrollY - stickyTop;
      const y = start + (length * (i + 0.5)) / count;
      if (lenis) lenis.scrollTo(y, { duration: 1 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    },
    [count, lenis],
  );

  return { trackRef, stickyRef, active, setActive, pinned };
}
