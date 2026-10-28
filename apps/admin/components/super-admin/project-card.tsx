/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Archive, Globe, Lock, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@makeplane/propel/components/button";
import type { TInstanceProject } from "@/services/super-admin.service";

type Props = {
  project: TInstanceProject;
  isOpening: boolean;
  onOpen: (project: TInstanceProject) => void;
};

export function ProjectCard({ project, isOpening, onOpen }: Props) {
  const isSecret = project.network === 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-subtle bg-layer-1 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 grow items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-layer-3 text-11 font-semibold text-secondary">
          {project.identifier.slice(0, 3)}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-14 font-medium text-primary">{project.name}</span>
            <span
              className="flex items-center gap-1 rounded-sm bg-layer-3 px-1.5 py-0.5 text-11 text-secondary"
              title={isSecret ? "Solo lo ven sus miembros" : "Lo ve todo el espacio de trabajo"}
            >
              {isSecret ? <Lock className="size-3" aria-hidden /> : <Globe className="size-3" aria-hidden />}
              {isSecret ? "Privado" : "Público"}
            </span>
            {project.archived_at && (
              <span className="flex items-center gap-1 rounded-sm bg-layer-3 px-1.5 py-0.5 text-11 text-secondary">
                <Archive className="size-3" aria-hidden />
                Archivado
              </span>
            )}
          </div>
          <span className="truncate text-13 text-secondary">{project.workspace.name}</span>
          <span className="text-11 text-tertiary">
            {project.members_count} {project.members_count === 1 ? "miembro" : "miembros"} · {project.work_items_count}{" "}
            {project.work_items_count === 1 ? "elemento" : "elementos"}
            {project.is_member && " · Ya eres miembro"}
          </span>
        </div>
      </div>
      <div className="shrink-0">
        <Button
          variant={project.is_member ? "secondary" : "primary"}
          size="sm"
          stretch="auto"
          loading={isOpening}
          onClick={() => onOpen(project)}
          icon={<SquareArrowOutUpRight className="size-3.5" />}
          iconPosition="end"
          label="Abrir tablero"
        />
      </div>
    </div>
  );
}
