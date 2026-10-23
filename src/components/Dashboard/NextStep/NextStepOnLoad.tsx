"use client";

// The next-step card, open as the page loads: back from Stripe with
// billing set up, say.

import { useState } from "react";
import NextStep, { type NextStepInfo } from "./NextStep";

export default function NextStepOnLoad({ step }: { step: NextStepInfo }) {
  const [open, setOpen] = useState(true);
  return <NextStep step={step} open={open} onClose={() => setOpen(false)} />;
}
