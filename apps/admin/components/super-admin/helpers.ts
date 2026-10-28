/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TInstanceUser } from "@/services/super-admin.service";

export const WORKSPACE_ROLE_LABELS: Record<number, string> = {
  20: "Administrador",
  15: "Miembro",
  5: "Invitado",
};

export const userFullName = (user: Pick<TInstanceUser, "first_name" | "last_name" | "display_name" | "email">) =>
  [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || user.display_name || user.email;

const RELATIVE = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "hace 3 días", "ayer", "hace 5 minutos"; "Nunca" when there is no date. */
export const relativeTime = (iso: string | null | undefined): string => {
  if (!iso) return "Nunca";
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return "hace un momento";
};

export const shortDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" }) : "";

export const errorMessage = (error: unknown, fallback = "No se pudo completar la acción."): string =>
  (error as { error?: string })?.error || fallback;
