/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { DialogActions, DialogInfo } from "@makeplane/propel/components/dialog";
import { VtvLockup } from "@/components/brand/vtv-lockup";

export function ProductUpdatesFooter() {
  return (
    <DialogActions>
      <DialogInfo>
        <span className="text-13 text-secondary">Venezolana de Televisión · Gestión de Desarrollo</span>
      </DialogInfo>
      <VtvLockup className="h-8" />
    </DialogActions>
  );
}
