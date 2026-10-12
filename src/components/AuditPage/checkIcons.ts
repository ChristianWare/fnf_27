// An icon for each of the audit's six checks. Safe anywhere.

import type { ComponentType, SVGProps } from "react";
import Analytics from "@/components/shared/icons/Analytics/Analytics";
import Location from "@/components/shared/icons/Location/Location";
import Speedometer from "@/components/shared/icons/Speedometer/Speedometer";
import Cursor from "@/components/shared/icons/Cursor/Cursor";
import Multiple from "@/components/shared/icons/Multiple/Multiple";
import LightBulb from "@/components/shared/icons/LightBulb/LightBulb";
import type { CheckId } from "@/lib/audit/kinds";

export const checkIcons: Record<
  CheckId,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  google: Analytics,
  profile: Location,
  speed: Speedometer,
  booking: Cursor,
  pages: Multiple,
  ai: LightBulb,
};
