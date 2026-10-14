/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { Loader } from "@plane/blocks/skeleton";

export function ProjectInsightsLoader() {
  return (
    <div className="flex h-[200px] gap-1">
      <Loader className="h-full w-full">
        <Loader.Item height="100%" width="100%" />
      </Loader>
      <div className="flex h-full w-full flex-col gap-1">
        <Loader className="h-12 w-full">
          <Loader.Item height="100%" width="100%" />
        </Loader>
        <Loader className="h-full w-full">
          <Loader.Item height="100%" width="100%" />
        </Loader>
      </div>
    </div>
  );
}

export function ChartLoader() {
  return (
    <Loader className="h-[350px] w-full">
      <Loader.Item height="100%" width="100%" />
    </Loader>
  );
}

export function AnalyticsBusyState({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
