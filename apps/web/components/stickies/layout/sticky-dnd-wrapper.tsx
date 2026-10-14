/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { observer } from "mobx-react";
import { usePathname } from "next/navigation";
import { cn } from "@plane/utils";
// components
import { StickyNote } from "../sticky";

type Props = {
  stickyId: string;
  workspaceSlug: string;
  itemWidth: string;
  onMove: (stickyId: string, clientX: number, clientY: number) => void;
  handleLayout: () => void;
};

export const StickyDNDWrapper = observer(function StickyDNDWrapper(props: Props) {
  const { stickyId, workspaceSlug, itemWidth, onMove, handleLayout } = props;
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const onMoveRef = useRef(onMove);
  const pathname = usePathname();
  const isStickiesPage = pathname?.includes("stickies") ?? false;

  onMoveRef.current = onMove;

  useEffect(() => {
    const element = elementRef.current;
    const dragHandle = dragHandleRef.current;
    if (!element || !dragHandle || !isStickiesPage) return;

    return draggable({
      element,
      dragHandle,
      getInitialData: () => ({ id: stickyId, type: "sticky" }),
      onDragStart: () => {
        setIsDragging(true);
      },
      onDrop: ({ location }) => {
        setIsDragging(false);
        const droppedOnBoard = location.current.dropTargets.some((target) => target.data?.type === "sticky-board");
        if (!droppedOnBoard) return;

        const { clientX, clientY } = location.current.input;
        if (clientX === 0 && clientY === 0) return;
        onMoveRef.current(stickyId, clientX, clientY);
      },
    });
  }, [isStickiesPage, stickyId]);

  return (
    <div
      ref={elementRef}
      data-sticky-id={stickyId}
      className={cn("box-border flex flex-col p-[8px]", isDragging && "opacity-40")}
      style={{
        width: itemWidth,
      }}
    >
      <StickyNote
        key={stickyId || "new"}
        workspaceSlug={workspaceSlug}
        stickyId={stickyId}
        handleLayout={handleLayout}
        dragHandleRef={isStickiesPage ? dragHandleRef : undefined}
        isDragging={isDragging}
      />
    </div>
  );
});
