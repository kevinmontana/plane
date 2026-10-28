/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// VTV: súper administrador. Todos los proyectos de todos los espacios de trabajo.
// Abrir un tablero hace al súper administrador miembro (administrador) del proyecto.
import { useMemo, useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { WEB_BASE_URL } from "@plane/constants";
import { ConfirmDialog } from "@plane/blocks/dialog";
import { setToast } from "@plane/blocks/toast";
import { PageWrapper } from "@/components/common/page-wrapper";
import { Skeleton } from "@/components/common/skeleton";
import { errorMessage } from "@/components/super-admin/helpers";
import { ProjectCard } from "@/components/super-admin/project-card";
import { SearchField } from "@/components/super-admin/search-field";
import { SuperAdminService } from "@/services/super-admin.service";
import type { TInstanceProject } from "@/services/super-admin.service";
import type { Route } from "./+types/page";

const service = new SuperAdminService();

const boardUrl = (slug: string, projectId: string) =>
  `${WEB_BASE_URL}/${encodeURIComponent(slug)}/projects/${projectId}/issues/`;

const ProjectsPage = observer(function ProjectsPage(_props: Route.ComponentProps) {
  const [search, setSearch] = useState("");
  const [toJoin, setToJoin] = useState<TInstanceProject | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data: projects, error, mutate, isLoading } = useSWR("SUPER_ADMIN_PROJECTS", () => service.listProjects());

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (projects ?? []).filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.identifier.toLowerCase().includes(q) ||
        p.workspace.name.toLowerCase().includes(q)
    );
    const byWorkspace = new Map<string, { id: string; name: string; projects: TInstanceProject[] }>();
    for (const p of list) {
      const group = byWorkspace.get(p.workspace.id) ?? { id: p.workspace.id, name: p.workspace.name, projects: [] };
      group.projects.push(p);
      byWorkspace.set(p.workspace.id, group);
    }
    return [...byWorkspace.values()];
  }, [projects, search]);

  const total = projects?.length ?? 0;
  const shown = groups.reduce((n, g) => n + g.projects.length, 0);

  const open = async (project: TInstanceProject) => {
    // Abrir la pestaña dentro del gesto del usuario; si no, el navegador la bloquea.
    const tab = window.open("", "_blank");
    setOpeningId(project.id);
    try {
      if (!project.is_member) {
        await service.joinProject(project.id);
        await mutate((list) => list?.map((p) => (p.id === project.id ? { ...p, is_member: true } : p)), {
          revalidate: false,
        });
      }
      const url = boardUrl(project.workspace.slug, project.id);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setToJoin(null);
    } catch (err) {
      tab?.close();
      setToast({ type: "error", title: "No se pudo abrir el tablero", message: errorMessage(err) });
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <PageWrapper
      header={{
        title: "Proyectos",
        description: "Todos los proyectos de todos los espacios de trabajo de la instancia.",
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchField value={search} onChange={setSearch} placeholder="Buscar proyecto o espacio de trabajo" />
          {projects && (
            <span className="text-13 text-tertiary">
              {search.trim() ? `${shown} de ${total}` : total} {total === 1 ? "proyecto" : "proyectos"}
            </span>
          )}
        </div>

        {isLoading && (
          <Skeleton className="flex flex-col gap-3">
            <Skeleton.Item height="76px" width="100%" />
            <Skeleton.Item height="76px" width="100%" />
            <Skeleton.Item height="76px" width="100%" />
          </Skeleton>
        )}

        {error && (
          <div className="rounded-lg border border-danger-subtle bg-danger-subtle p-4 text-13 text-danger-primary">
            {errorMessage(error, "No se pudieron cargar los proyectos.")}
          </div>
        )}

        {projects && shown === 0 && (
          <div className="rounded-lg border border-dashed border-subtle p-8 text-center text-13 text-tertiary">
            {total === 0 ? "Todavía no hay proyectos." : `Ningún proyecto coincide con «${search.trim()}».`}
          </div>
        )}

        {groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-2">
            <h2 className="pt-2 text-13 font-medium text-secondary">
              {group.name} <span className="text-tertiary">· {group.projects.length}</span>
            </h2>
            <div className="flex flex-col gap-3">
              {group.projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isOpening={openingId === project.id}
                  onOpen={(p) => (p.is_member ? void open(p) : setToJoin(p))}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {toJoin && (
        <ConfirmDialog
          isOpen={!!toJoin}
          handleClose={() => !openingId && setToJoin(null)}
          handleSubmit={() => open(toJoin)}
          isSubmitting={!!openingId}
          variant="primary"
          title="Abrir tablero"
          content={`Para ver «${toJoin.name}» entrarás como administrador del proyecto y como miembro de «${toJoin.workspace.name}». Los demás miembros te verán en la lista.`}
          primaryButtonText={{ default: "Entrar y abrir", loading: "Abriendo" }}
          secondaryButtonText="Cancelar"
        />
      )}
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: "Proyectos - God Mode" }];

export default ProjectsPage;
