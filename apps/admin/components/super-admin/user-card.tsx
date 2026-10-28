/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { EllipsisVertical, KeyRound, ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@makeplane/propel/components/menu";
import { WorkspaceAvatar } from "@makeplane/propel/components/workspace-avatar";
import { getFileURL } from "@plane/utils";
import type { TInstanceUser } from "@/services/super-admin.service";
import { WORKSPACE_ROLE_LABELS, relativeTime, shortDate, userFullName } from "./helpers";

export type TUserAction = "grant-admin" | "revoke-admin" | "reset-password" | "deactivate" | "activate";

type Props = {
  user: TInstanceUser;
  isSelf: boolean;
  onAction: (action: TUserAction, user: TInstanceUser) => void;
};

function Tag({ tone, children }: { tone: "accent" | "danger" | "neutral"; children: React.ReactNode }) {
  const tones = {
    accent: "bg-accent-subtle text-accent-primary",
    danger: "bg-danger-subtle text-danger-primary",
    neutral: "bg-layer-3 text-secondary",
  };
  return <span className={`rounded-sm px-1.5 py-0.5 text-11 font-medium ${tones[tone]}`}>{children}</span>;
}

export function UserCard({ user, isSelf, onAction }: Props) {
  const name = userFullName(user);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-subtle bg-layer-1 p-3 ${
        user.is_active ? "" : "opacity-70"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        <WorkspaceAvatar
          alt={name}
          fallback={name[0]?.toUpperCase() ?? "?"}
          src={user.avatar_url ? getFileURL(user.avatar_url) : undefined}
          size="md"
        />
      </div>

      <div className="flex min-w-0 grow flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-14 font-medium text-primary">{name}</span>
          {isSelf && <Tag tone="neutral">Tú</Tag>}
          {user.is_super_admin && <Tag tone="accent">Súper administrador</Tag>}
          {!user.is_active && <Tag tone="danger">Desactivado</Tag>}
          {user.is_active && !user.is_onboarded && <Tag tone="neutral">Sin completar el ingreso</Tag>}
        </div>
        <span className="truncate text-13 text-secondary">{user.email}</span>

        {user.workspaces.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {user.workspaces.map((ws) => (
              <span
                key={ws.id}
                className="rounded-sm border border-subtle px-1.5 py-0.5 text-11 text-secondary"
                title={`${ws.name} · ${WORKSPACE_ROLE_LABELS[ws.role] ?? ""}`}
              >
                {ws.name} <span className="text-tertiary">· {WORKSPACE_ROLE_LABELS[ws.role] ?? ""}</span>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-11 text-tertiary">Sin espacio de trabajo</span>
        )}

        <span className="text-11 text-tertiary">
          Último acceso {relativeTime(user.last_login).toLowerCase()} · Alta {shortDate(user.date_joined)}
        </span>
      </div>

      <Menu>
        <MenuTrigger
          render={
            <button
              type="button"
              aria-label={`Acciones para ${name}`}
              className="grid size-8 shrink-0 place-items-center rounded-md text-tertiary outline-none hover:bg-layer-1-hover hover:text-primary focus-visible:ring-2 focus-visible:ring-accent-strong"
            >
              <EllipsisVertical className="size-4" aria-hidden />
            </button>
          }
        />
        <MenuContent side="bottom" align="end">
          {user.is_super_admin ? (
            <MenuItem
              icon={<ShieldOff className="size-4" />}
              label="Quitar súper administrador"
              disabled={isSelf}
              onClick={() => onAction("revoke-admin", user)}
            />
          ) : (
            <MenuItem
              icon={<ShieldCheck className="size-4" />}
              label="Hacer súper administrador"
              disabled={!user.is_active}
              onClick={() => onAction("grant-admin", user)}
            />
          )}
          <MenuItem
            icon={<KeyRound className="size-4" />}
            label="Restablecer contraseña"
            onClick={() => onAction("reset-password", user)}
          />
          <MenuSeparator />
          {user.is_active ? (
            <MenuItem
              variant="danger"
              icon={<UserX className="size-4" />}
              label="Desactivar cuenta"
              disabled={isSelf || user.is_super_admin}
              onClick={() => onAction("deactivate", user)}
            />
          ) : (
            <MenuItem
              icon={<UserCheck className="size-4" />}
              label="Activar cuenta"
              onClick={() => onAction("activate", user)}
            />
          )}
        </MenuContent>
      </Menu>
    </div>
  );
}
