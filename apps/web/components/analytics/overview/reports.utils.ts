/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ICycle, TChartDatum } from "@plane/types";
import { getDate } from "@plane/utils";

export const REPORTS_STATE_GROUP_ORDER = ["backlog", "unstarted", "started", "completed", "cancelled"] as const;
export const REPORTS_PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"] as const;
export const REPORTS_TOP_ASSIGNEES = 8;

const UNASSIGNED_KEYS = new Set(["none", "null", ""]);

export function isActiveCycle(cycle: ICycle, now = new Date()): boolean {
  if (cycle.archived_at) return false;
  if (cycle.status?.toLowerCase() === "current") return true;
  const start = getDate(cycle.start_date);
  const end = getDate(cycle.end_date);
  if (!start || !end) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start <= today && today <= end;
}

export function takeTopByCount(data: TChartDatum[], limit = REPORTS_TOP_ASSIGNEES): TChartDatum[] {
  return data.toSorted((a, b) => b.count - a.count).slice(0, limit);
}

export function orderChartData(data: TChartDatum[], order: readonly string[]): TChartDatum[] {
  const index = new Map(order.map((key, i) => [key.toLowerCase(), i]));
  return data.toSorted((a, b) => {
    const ai = index.get(String(a.key).toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bi = index.get(String(b.key).toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return b.count - a.count;
  });
}

export function isUnassignedKey(key: string | null | undefined, name?: string): boolean {
  const normalizedKey = String(key ?? "").toLowerCase();
  const normalizedName = String(name ?? "").toLowerCase();
  return UNASSIGNED_KEYS.has(normalizedKey) || UNASSIGNED_KEYS.has(normalizedName);
}

export function cycleCompletionPercent(completed: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}
