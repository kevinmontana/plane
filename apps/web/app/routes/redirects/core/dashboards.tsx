/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { redirect } from "react-router";

export const clientLoader = ({ params }: { params: { workspaceSlug?: string } }) => {
  const { workspaceSlug } = params;
  if (!workspaceSlug) throw redirect("/");
  throw redirect(`/${workspaceSlug}/analytics/overview/`);
};

export default function DashboardsRedirect() {
  return null;
}
