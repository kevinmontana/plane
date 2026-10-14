/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { cn } from "@plane/utils";
import vtvLogo from "@/app/assets/brand/vtv-logo.png?url";

type PlaneLockupProps = {
  width?: string | number;
  height?: string | number;
  className?: string;
  color?: string;
};

export function PlaneLockup({ className }: PlaneLockupProps) {
  return (
    <img
      src={vtvLogo}
      alt="Venezolana de Televisión"
      className={cn("h-10 w-auto object-contain object-left", className)}
    />
  );
}
