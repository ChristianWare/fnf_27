"use client";

// "Take the tour": starts the guided tour again, from any page.

import Icon from "../icons";
import { ui } from "../ui/ui";
import { TOUR_EVENT } from "./Tour";

export default function TourButton({
  variant = "light",
  label = "Take the tour",
}: {
  variant?: "light" | "outline";
  label?: string;
}) {
  return (
    <button
      type='button'
      className={`${ui.btn} ${variant === "light" ? ui.btn_light : ui.btn_outline}`}
      onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}
    >
      {label}
      <Icon name='sparkle' className={ui.btnIcon} />
    </button>
  );
}
