"use client";

// Smooth scrolling for the whole site, using Lenis. Mouse-wheel and
// trackpad scrolling glide to a stop; touch scrolling on phones stays
// native. Wraps the app in the root layout.

import { useState, type ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

export default function SmoothScroll({ children }: { children: ReactNode }) {
  // People who turn off motion on their device keep normal scrolling.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <ReactLenis
      root
      options={{
        // How quickly the page catches up with the wheel: lower is
        // smoother and slower, higher is snappier. 0.1 is Lenis's default.
        lerp: 0.1,
        smoothWheel: !reducedMotion,
        // Links to a spot on the same page (href='#pricing') glide there.
        anchors: true,
        // Leave sideways gestures alone, so rows that scroll sideways (like
        // the booking cards on smaller screens) still work with a trackpad.
        virtualScroll: ({ deltaX, deltaY }) =>
          Math.abs(deltaX) <= Math.abs(deltaY),
      }}
    >
      {children}
    </ReactLenis>
  );
}
