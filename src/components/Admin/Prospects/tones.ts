// Each stage's pill color.

import type { Tone } from "@/components/Dashboard/ui/ui";
import type { ProspectStage } from "@/lib/prospects/kinds";

export const stageTone: Record<ProspectStage, Tone> = {
  NEW: "white",
  CALLING: "gray",
  INTERESTED: "yellow",
  INVITED: "purple",
  TRIAL: "mint",
  PROPOSAL: "mint",
  WON: "lime",
  LOST: "gray",
  PARKED: "gray",
  DO_NOT_CALL: "red",
};
