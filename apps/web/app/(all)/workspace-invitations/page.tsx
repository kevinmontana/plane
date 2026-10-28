/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { BoxesOutline, CloseOutline, ShareAltOutline, TickOutline, UserOutline } from "@makeplane/propel/icons";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { EmptySpace, EmptySpaceItem } from "@/components/ui/empty-space";
// constants
import { WORKSPACE_INVITATION } from "@plane/constants";
// helpers
import { EPageTypes } from "@/helpers/authentication.helper";
// hooks
import { useUser } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
// wrappers
import { AuthenticationWrapper } from "@/lib/wrappers/authentication-wrapper";
import { WorkspaceService } from "@/services/workspace.service";
// services

// service initialization
const workspaceService = new WorkspaceService();

function WorkspaceInvitationPage() {
  // router
  const router = useAppRouter();
  // query params
  const searchParams = useSearchParams();
  const invitation_id = searchParams.get("invitation_id");
  const slug = searchParams.get("slug");
  const token = searchParams.get("token");
  // store hooks
  const { data: currentUser } = useUser();

  const { data: invitationDetail, error } = useSWR(
    invitation_id && slug && WORKSPACE_INVITATION(invitation_id.toString()),
    invitation_id && slug
      ? () => workspaceService.getWorkspaceInvitation(slug.toString(), invitation_id.toString())
      : null
  );

  const handleAccept = async () => {
    if (!invitationDetail) return;
    try {
      await workspaceService.joinWorkspace(invitationDetail.workspace.slug, invitationDetail.id, {
        accepted: true,
        token: token,
      });
      if (invitationDetail.email === currentUser?.email) {
        router.push(`/${invitationDetail.workspace.slug}`);
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    if (!invitationDetail || !token) return;
    try {
      await workspaceService.joinWorkspace(invitationDetail.workspace.slug, invitationDetail.id, {
        accepted: false,
        token: token,
      });
      router.push("/");
    } catch (err: unknown) {
      console.error(err);
    }
  };

  return (
    <AuthenticationWrapper pageType={EPageTypes.PUBLIC}>
      <div className="flex h-full w-full flex-col items-center justify-center px-3">
        {invitationDetail && !invitationDetail.responded_at ? (
          error ? (
            <div className="shadow-2xl flex w-full flex-col space-y-4 rounded-sm border border-subtle bg-surface-1 px-4 py-8 text-center md:w-1/3">
              <h2 className="text-18 uppercase">INVITACIÓN NO ENCONTRADA</h2>
            </div>
          ) : (
            <EmptySpace
              title={`Has sido invitado a ${invitationDetail.workspace.name}`}
              description="Tu espacio de trabajo es donde crearás proyectos, colaborarás en tus elementos de trabajo y organizarás las distintas líneas de trabajo de tu cuenta de Gestión."
            >
              <EmptySpaceItem Icon={TickOutline} title="Aceptar" action={handleAccept} />
              <EmptySpaceItem Icon={CloseOutline} title="Ignorar" action={handleReject} />
            </EmptySpace>
          )
        ) : error || invitationDetail?.responded_at ? (
          invitationDetail?.accepted ? (
            <EmptySpace
              title={`Ya eres miembro de ${invitationDetail.workspace.name}`}
              description="Tu espacio de trabajo es donde crearás proyectos, colaborarás en tus elementos de trabajo y organizarás las distintas líneas de trabajo de tu cuenta de Gestión."
            >
              <EmptySpaceItem Icon={BoxesOutline} title="Ir al inicio" href="/" />
            </EmptySpace>
          ) : (
            <EmptySpace
              title="Este enlace de invitación ya no está activo."
              description="Tu espacio de trabajo es donde crearás proyectos, colaborarás en tus elementos de trabajo y organizarás las distintas líneas de trabajo de tu cuenta de Gestión."
              link={{ text: "O empieza con un proyecto vacío", href: "/" }}
            >
              {!currentUser ? (
                <EmptySpaceItem Icon={UserOutline} title="Inicia sesión para continuar" href="/" />
              ) : (
                <EmptySpaceItem Icon={BoxesOutline} title="Ir al inicio" href="/" />
              )}
              <EmptySpaceItem
                Icon={ShareAltOutline}
                title="Únete a nuestra comunidad de creadores activos"
                href="https://forum.plane.so"
              />
            </EmptySpace>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <LogoSpinner />
          </div>
        )}
      </div>
    </AuthenticationWrapper>
  );
}

export default observer(WorkspaceInvitationPage);
