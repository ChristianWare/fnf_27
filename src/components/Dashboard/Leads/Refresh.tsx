"use client";

// Reloads the page's data every so often, for a page that's waiting on
// something the server is doing (the market's first load).

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Refresh({ every }: { every: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), every * 1000);
    return () => clearInterval(timer);
  }, [router, every]);
  return null;
}
