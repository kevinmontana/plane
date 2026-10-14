/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export function formatDurationMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours > 0 && remainingMinutes > 0) return `${hours}h ${remainingMinutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${remainingMinutes}m`;
}

export function parseDurationToMinutes(hoursValue: string, minutesValue: string): number | null {
  const hours = hoursValue.trim() === "" ? 0 : Number(hoursValue);
  const minutes = minutesValue.trim() === "" ? 0 : Number(minutesValue);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || minutes < 0) return null;
  const total = Math.round(hours * 60 + minutes);
  if (total < 1) return null;
  return total;
}
