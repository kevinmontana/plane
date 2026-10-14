/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TSticky } from "@plane/types";

const STICKY_SURFACE: Record<string, { light: string; dark: string }> = {
  gray: { light: "#d6d6d8", dark: "#404144" },
  peach: { light: "#ffd5d7", dark: "#593032" },
  pink: { light: "#fdd4e3", dark: "#562e3d" },
  orange: { light: "#ffe3cd", dark: "#583e2a" },
  green: { light: "#c3f0de", dark: "#1d4a3b" },
  "light-blue": { light: "#c5eff9", dark: "#1f495c" },
  "dark-blue": { light: "#c9dafb", dark: "#223558" },
  purple: { light: "#e3d8fd", dark: "#3d325a" },
};

const STICKY_INK = {
  light: "#1c1f26",
  dark: "#f5f6f8",
} as const;

export function getStickySurface(colorKey: string | null | undefined, isDark: boolean) {
  const surface = STICKY_SURFACE[colorKey ?? ""] ?? STICKY_SURFACE.gray;
  return {
    backgroundColor: isDark ? surface.dark : surface.light,
    color: isDark ? STICKY_INK.dark : STICKY_INK.light,
  };
}

export const STICKY_COLORS_LIST: {
  key: string;
  label: string;
  backgroundColor: string;
}[] = [
  {
    key: "gray",
    label: "Gray",
    backgroundColor: "var(--editor-colors-gray-background)",
  },
  {
    key: "peach",
    label: "Peach",
    backgroundColor: "var(--editor-colors-peach-background)",
  },
  {
    key: "pink",
    label: "Pink",
    backgroundColor: "var(--editor-colors-pink-background)",
  },
  {
    key: "orange",
    label: "Orange",
    backgroundColor: "var(--editor-colors-orange-background)",
  },
  {
    key: "green",
    label: "Green",
    backgroundColor: "var(--editor-colors-green-background)",
  },
  {
    key: "light-blue",
    label: "Light blue",
    backgroundColor: "var(--editor-colors-light-blue-background)",
  },
  {
    key: "dark-blue",
    label: "Dark blue",
    backgroundColor: "var(--editor-colors-dark-blue-background)",
  },
  {
    key: "purple",
    label: "Purple",
    backgroundColor: "var(--editor-colors-purple-background)",
  },
];

type TProps = {
  handleUpdate: (data: Partial<TSticky>) => Promise<void>;
};

export function ColorPalette(props: TProps) {
  const { handleUpdate } = props;
  return (
    <div className="shadow absolute bottom-5 left-0 z-10 mb-2 w-56 rounded-md bg-surface-1 p-2">
      <div className="mb-2 text-13 font-semibold text-placeholder">Background colors</div>
      <div className="flex flex-wrap gap-2">
        {STICKY_COLORS_LIST.map((color) => (
          <button
            key={color.key}
            type="button"
            onClick={() => {
              handleUpdate({
                background_color: color.key,
              });
            }}
            className="h-6 w-6 rounded-md transition-all hover:ring-2 hover:ring-accent-strong focus:ring-2 focus:ring-accent-strong focus:outline-none"
            style={{
              backgroundColor: color.backgroundColor,
            }}
          />
        ))}
      </div>
    </div>
  );
}
