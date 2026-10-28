/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { cn } from "@plane/utils";
import vtvLogo from "@/app/assets/brand/vtv-logo.png?url";

type VtvLockupProps = {
  className?: string;
};

// VTV: reemplaza el logo de Plane en el portal público.
export function VtvLockup({ className }: VtvLockupProps) {
  return (
    <img
      src={vtvLogo}
      alt="Venezolana de Televisión"
      className={cn("h-10 w-auto object-contain object-left", className)}
    />
  );
}
