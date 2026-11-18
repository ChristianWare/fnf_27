// Where each preview is, and its pill color. Safe anywhere.

import type { Tone } from "@/components/Dashboard/ui/ui";
import type { PreviewStatus } from "@/lib/demos/preview";

export const STATUS_LABEL: Record<PreviewStatus, string> = {
  NOT_OPENED: "Not opened yet",
  OPENED: "Opened",
  EXPIRING: "Expiring soon",
  EXPIRED: "Expired",
};

export const statusTone: Record<PreviewStatus, Tone> = {
  NOT_OPENED: "white",
  OPENED: "lime",
  EXPIRING: "yellow",
  EXPIRED: "gray",
};
