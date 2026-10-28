/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { WEBSITE_URL } from "@plane/constants";
// assets
import { PlaneLogo } from "@plane/blocks/icons";

const HIDE_POWERED_BY = true;

type TPoweredBy = {
  disabled?: boolean;
};

export function PoweredBy(props: TPoweredBy) {
  // props
  const { disabled = false } = props;

  // VTV: sin insignia "Desarrollado con" que enlace al sitio de Plane.
  if (disabled || !WEBSITE_URL || HIDE_POWERED_BY) return null;

  return (
    <a
      href={WEBSITE_URL}
      className="fixed right-5 bottom-2.5 !z-[999999] flex items-center gap-1 rounded-sm border border-subtle bg-layer-3 px-2 py-1 shadow-raised-100"
      target="_blank"
      rel="noreferrer noopener"
    >
      <PlaneLogo className="h-3 w-auto text-primary" />
      <div className="text-11">
        Desarrollado con <span className="font-semibold">Gestión Publish</span>
      </div>
    </a>
  );
}
