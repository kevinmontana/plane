/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// VTV: súper administrador. Todas las cuentas de la instancia; el registro público
// está cerrado, así que las cuentas nuevas se crean aquí.
import { useMemo, useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { UserPlus } from "lucide-react";
import { Button } from "@makeplane/propel/components/button";
import { ConfirmDialog } from "@plane/blocks/dialog";
import { setToast } from "@plane/blocks/toast";
import { PageWrapper } from "@/components/common/page-wrapper";
import { Skeleton } from "@/components/common/skeleton";
import { CreateUserDialog } from "@/components/super-admin/create-user-dialog";
import { errorMessage, userFullName } from "@/components/super-admin/helpers";
import { SearchField } from "@/components/super-admin/search-field";
import { TempPasswordDialog } from "@/components/super-admin/temp-password-dialog";
import { UserCard } from "@/components/super-admin/user-card";
import type { TUserAction } from "@/components/super-admin/user-card";
import { useUser } from "@/hooks/store";
import { SuperAdminService } from "@/services/super-admin.service";
import type { TInstanceUser } from "@/services/super-admin.service";
import type { Route } from "./+types/page";

const service = new SuperAdminService();

type TPending = { action: Exclude<TUserAction, "activate">; user: TInstanceUser } | null;

const CONFIRM_COPY: Record<
  Exclude<TUserAction, "activate">,
  { title: string; content: (name: string) => string; confirm: string; variant: "danger" | "primary" | "warning" }
> = {
  "grant-admin": {
    title: "Hacer súper administrador",
    content: (name) =>
      `${name} podrá entrar a este panel, ver y crear usuarios, y abrir cualquier proyecto de la instancia.`,
    confirm: "Hacer súper administrador",
    variant: "primary",
  },
  "revoke-admin": {
    title: "Quitar súper administrador",
    content: (name) => `${name} dejará de tener acceso a este panel. Sus espacios de trabajo no cambian.`,
    confirm: "Quitar rol",
    variant: "warning",
  },
  "reset-password": {
    title: "Restablecer contraseña",
    content: (name) =>
      `Se generará una contraseña temporal para ${name} y se cerrarán sus sesiones abiertas. La anterior deja de funcionar.`,
    confirm: "Generar contraseña",
    variant: "warning",
  },
  deactivate: {
    title: "Desactivar cuenta",
    content: (name) =>
      `${name} no podrá iniciar sesión y se cerrarán sus sesiones. Sus datos y su trabajo se conservan; puedes activarla de nuevo.`,
    confirm: "Desactivar",
    variant: "danger",
  },
};

const UsersPage = observer(function UsersPage(_props: Route.ComponentProps) {
  const { currentUser } = useUser();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pending, setPending] = useState<TPending>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState<{
    title: string;
    email: string;
    password: string;
    emailSent: boolean;
  } | null>(null);

  const { data: users, error, mutate, isLoading } = useSWR("SUPER_ADMIN_USERS", () => service.listUsers());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // The app targets ES2022 (no toSorted); sort a copy so the SWR cache is untouched.
    // oxlint-disable-next-line unicorn/no-array-sort
    const sorted = [...(users ?? [])].sort((a, b) =>
      userFullName(a).localeCompare(userFullName(b), "es", { sensitivity: "base" })
    );
    if (!q) return sorted;
    return sorted.filter((u) =>
      [u.email, u.first_name, u.last_name, u.display_name].some((v) => v?.toLowerCase().includes(q))
    );
  }, [users, search]);

  const counts = useMemo(
    () => ({
      total: users?.length ?? 0,
      admins: users?.filter((u) => u.is_super_admin).length ?? 0,
      inactive: users?.filter((u) => !u.is_active).length ?? 0,
    }),
    [users]
  );

  const replaceUser = (updated: TInstanceUser) =>
    mutate((list) => list?.map((u) => (u.id === updated.id ? updated : u)), { revalidate: false });

  const runAction = async (action: TUserAction, user: TInstanceUser) => {
    const name = userFullName(user);
    setIsSubmitting(true);
    try {
      if (action === "grant-admin") {
        await replaceUser(await service.grantSuperAdmin(user.id));
        setToast({ type: "success", title: "Listo", message: `${name} ahora es súper administrador.` });
      } else if (action === "revoke-admin") {
        await replaceUser(await service.revokeSuperAdmin(user.id));
        setToast({ type: "success", title: "Listo", message: `${name} ya no es súper administrador.` });
      } else if (action === "deactivate" || action === "activate") {
        await replaceUser(await service.setUserActive(user.id, action === "activate"));
        setToast({
          type: "success",
          title: "Listo",
          message:
            action === "activate" ? `La cuenta de ${name} está activa.` : `La cuenta de ${name} está desactivada.`,
        });
      } else if (action === "reset-password") {
        const result = await service.resetPassword(user.id, false);
        setPassword({
          title: "Contraseña restablecida",
          email: user.email,
          password: result.temp_password,
          emailSent: false,
        });
      }
      setPending(null);
    } catch (err) {
      setToast({ type: "error", title: "No se pudo completar", message: errorMessage(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAction = (action: TUserAction, user: TInstanceUser) => {
    // Activar no pide confirmación: es reversible y no tiene efectos laterales.
    if (action === "activate") void runAction(action, user);
    else setPending({ action, user });
  };

  const copy = pending ? CONFIRM_COPY[pending.action] : null;

  return (
    <PageWrapper
      header={{
        title: "Usuarios",
        description:
          "Todas las cuentas de Gestión. El registro público está cerrado: las cuentas nuevas se crean aquí.",
        actions: (
          <Button
            variant="primary"
            size="sm"
            stretch="auto"
            onClick={() => setIsCreateOpen(true)}
            icon={<UserPlus className="size-3.5" />}
            label="Nuevo usuario"
          />
        ),
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchField value={search} onChange={setSearch} placeholder="Buscar por nombre o correo" />
          {users && (
            <span className="text-13 text-tertiary">
              {counts.total} {counts.total === 1 ? "cuenta" : "cuentas"} · {counts.admins} súper{" "}
              {counts.admins === 1 ? "administrador" : "administradores"}
              {counts.inactive > 0 && ` · ${counts.inactive} ${counts.inactive === 1 ? "desactivada" : "desactivadas"}`}
            </span>
          )}
        </div>

        {isLoading && (
          <Skeleton className="flex flex-col gap-3">
            <Skeleton.Item height="92px" width="100%" />
            <Skeleton.Item height="92px" width="100%" />
            <Skeleton.Item height="92px" width="100%" />
          </Skeleton>
        )}

        {error && (
          <div className="rounded-lg border border-danger-subtle bg-danger-subtle p-4 text-13 text-danger-primary">
            {errorMessage(error, "No se pudieron cargar los usuarios.")}
          </div>
        )}

        {users && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-subtle p-8 text-center text-13 text-tertiary">
            Ninguna cuenta coincide con «{search.trim()}».
          </div>
        )}

        <div className="flex flex-col gap-3">
          {filtered.map((user) => (
            <UserCard key={user.id} user={user} isSelf={user.id === currentUser?.id} onAction={onAction} />
          ))}
        </div>
      </div>

      <CreateUserDialog
        isOpen={isCreateOpen}
        service={service}
        onClose={() => setIsCreateOpen(false)}
        onCreated={({ user, temp_password, emailSent }) => {
          setIsCreateOpen(false);
          void mutate((list) => [user, ...(list ?? [])], { revalidate: true });
          setPassword({ title: "Usuario creado", email: user.email, password: temp_password, emailSent });
        }}
      />

      {copy && pending && (
        <ConfirmDialog
          isOpen={!!pending}
          handleClose={() => !isSubmitting && setPending(null)}
          handleSubmit={() => runAction(pending.action, pending.user)}
          isSubmitting={isSubmitting}
          variant={copy.variant}
          title={copy.title}
          content={copy.content(userFullName(pending.user))}
          primaryButtonText={{ default: copy.confirm, loading: "Procesando" }}
          secondaryButtonText="Cancelar"
        />
      )}

      <TempPasswordDialog data={password} onClose={() => setPassword(null)} />
    </PageWrapper>
  );
});

export const meta: Route.MetaFunction = () => [{ title: "Usuarios - God Mode" }];

export default UsersPage;
