"use client";

// Cloudflare's "are you a person?" box, for the public forms. It draws
// itself inside the form, and adds a hidden field, cf-turnstile-response,
// that the server checks. Without a site key (local development) there's
// no box, and the server skips the check too.

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
    __fnfTurnstile?: () => void;
  }
}

export default function Turnstile({
  siteKey,
  resetKey,
  className,
}: {
  siteKey?: string;
  /** Change it (count up) to ask for a fresh token after a failed send. */
  resetKey: number;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!siteKey) return;
    const draw = () => {
      if (!window.turnstile || !box.current || widget.current) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: siteKey,
        theme: "light",
      });
    };
    if (window.turnstile) {
      draw();
      return;
    }
    window.__fnfTurnstile = draw;
    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__fnfTurnstile&render=explicit";
      script.async = true;
      document.head.appendChild(script);
    }
  }, [siteKey]);

  // A failed send uses up the token: ask for a fresh one.
  useEffect(() => {
    if (resetKey && widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (!siteKey) return null;
  return <div ref={box} className={className} style={{ minHeight: 65 }} />;
}
