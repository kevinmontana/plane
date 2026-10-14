/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useMemo, useState, type Ref } from "react";
import { debounce } from "lodash-es";
import { observer } from "mobx-react";
import { useTheme } from "next-themes";
import { ArrowCollapseOutline } from "@makeplane/propel/icons";
import { useTranslation } from "@plane/i18n";
// plane types
import type { TSticky } from "@plane/types";
// plane utils
import { cn } from "@plane/utils";
// hooks
import { useUserProfile } from "@/hooks/store/user";
import { useSticky } from "@/hooks/use-stickies";
// components
import { getStickySurface } from "../../editor/sticky-editor/color-palette";
import { StickyDeleteModal } from "../delete-modal";
import { StickyInput } from "./inputs";
import { getRandomStickyColor, useStickyOperations } from "./use-operations";

type TProps = {
  onClose?: () => void;
  workspaceSlug: string;
  className?: string;
  stickyId: string | undefined;
  showToolbar?: boolean;
  handleLayout?: () => void;
  dragHandleRef?: Ref<HTMLDivElement>;
  isDragging?: boolean;
};
export const StickyNote = observer(function StickyNote(props: TProps) {
  const {
    onClose,
    workspaceSlug,
    className = "",
    stickyId,
    showToolbar,
    handleLayout,
    dragHandleRef,
    isDragging,
  } = props;
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const { data: userProfile } = useUserProfile();
  // states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // store hooks
  const { stickies } = useSticky();
  // sticky operations
  const { stickyOperations } = useStickyOperations({ workspaceSlug });
  // derived values
  const fallbackSticky = useMemo(() => ({ background_color: getRandomStickyColor() }), []);
  const stickyData: Partial<TSticky> = stickyId ? stickies[stickyId] : fallbackSticky;
  const isDark = !!resolvedTheme?.includes("dark") || (resolvedTheme === "custom" && !!userProfile?.theme?.darkPalette);
  const surface = getStickySurface(stickyData?.background_color, isDark);

  const handleChange = useCallback(
    async (payload: Partial<TSticky>) => {
      if (stickyId) {
        await stickyOperations.update(stickyId, payload);
      } else {
        await stickyOperations.create({
          ...stickyData,
          ...payload,
        });
      }
    },
    [stickyId, stickyOperations, stickyData]
  );

  const debouncedFormSave = useMemo(
    () =>
      debounce(async (payload: Partial<TSticky>) => {
        await handleChange(payload);
      }, 500),
    [handleChange]
  );

  const handleDelete = async () => {
    if (!stickyId) return;
    onClose?.();
    stickyOperations.remove(stickyId);
  };

  return (
    <>
      <StickyDeleteModal
        isOpen={isDeleteModalOpen}
        handleSubmit={handleDelete}
        handleClose={() => setIsDeleteModalOpen(false)}
      />
      <div
        className={cn("sticky-note group/sticky flex h-fit w-full flex-col overflow-y-scroll rounded-sm", className)}
        style={{
          backgroundColor: surface.backgroundColor,
          color: surface.color,
          ["--sticky-ink" as string]: surface.color,
        }}
      >
        {dragHandleRef && (
          <div
            ref={dragHandleRef}
            title={t("drag_to_rearrange")}
            aria-label={t("drag_to_rearrange")}
            className={cn(
              "flex h-7 shrink-0 cursor-grab items-center justify-center select-none active:cursor-grabbing",
              isDragging && "cursor-grabbing"
            )}
          >
            <span aria-hidden className="h-1 w-10 rounded-full bg-current opacity-60" />
          </div>
        )}
        {onClose && (
          <button type="button" className="flex flex-shrink-0 justify-end p-2.5" onClick={onClose}>
            <ArrowCollapseOutline className="size-4" />
          </button>
        )}
        {/* inputs */}
        <div>
          <StickyInput
            stickyData={stickyData}
            workspaceSlug={workspaceSlug}
            handleUpdate={(payload) => {
              handleLayout?.();
              debouncedFormSave(payload);
            }}
            stickyId={stickyId}
            handleDelete={() => setIsDeleteModalOpen(true)}
            handleChange={handleChange}
            showToolbar={showToolbar}
          />
        </div>
      </div>
    </>
  );
});
