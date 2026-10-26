// Each stage's pill color.

import type { Tone } from "@/components/Dashboard/ui/ui";
import type { ProspectStage } from "@/lib/prospects/kinds";

export const stageTone: Record<ProspectStage, Tone> = {
  NEW: "white",
  CALLING: "gray",
  INTERESTED: "lime",
  INVITED: "purple",
  TRIAL: "mint",
  PROPOSAL: "mint",
  WON: "black",
  LOST: "red",
  PARKED: "gray",
  DO_NOT_CALL: "red",
};
