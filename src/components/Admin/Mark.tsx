// A client's initials in a square, colored by their plan: black for the
// Full Platform, lime for Website Only, lavender for the Leads Tool and
// yellow for a new sign-up. The same colors as the plan cards.

import styles from "./Mark.module.css";
import type { ClientKind } from "@/lib/admin/derive";

const letters = (business: string) =>
  business
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

export default function Mark({
  business,
  kind,
  size = "md",
}: {
  business: string;
  kind: ClientKind;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={`${styles.mark} ${styles[kind]} ${styles[size]}`}
      aria-hidden='true'
    >
      {letters(business)}
    </span>
  );
}
