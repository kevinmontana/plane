/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/**
 * Index of the card under the pointer. The dragged sticky is saved into that slot.
 */
export const getStickyDropIndex = (cards: HTMLElement[], clientX: number, clientY: number): number => {
  const rects = cards.map((card) => card.getBoundingClientRect());
  if (rects.length === 0) return 0;

  const hit = rects.findIndex(
    (rect) => clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  );
  if (hit >= 0) return hit;

  let closest = 0;
  let best = Number.POSITIVE_INFINITY;
  rects.forEach((rect, index) => {
    const distance = (clientX - (rect.left + rect.width / 2)) ** 2 + (clientY - (rect.top + rect.height / 2)) ** 2;
    if (distance < best) {
      best = distance;
      closest = index;
    }
  });

  return closest;
};
