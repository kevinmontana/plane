/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Navigate } from "react-router";

import type { Route } from "./+types/page";

function BillingSettingsPage({ params }: Route.ComponentProps) {
  const { workspaceSlug } = params;
  return <Navigate to={`/${workspaceSlug}/settings/`} replace />;
}

export default BillingSettingsPage;
