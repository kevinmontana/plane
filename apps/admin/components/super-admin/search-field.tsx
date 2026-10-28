/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChange, placeholder }: Props) {
  return (
    <label className="flex w-full items-center gap-2 rounded-md border border-subtle bg-layer-1 px-3 py-2 focus-within:border-accent-strong sm:max-w-sm">
      <Search className="size-4 shrink-0 text-placeholder" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-13 text-primary outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="grid size-5 shrink-0 place-items-center rounded-sm text-placeholder hover:bg-layer-1-hover hover:text-secondary"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </label>
  );
}
