/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { BrainCog, FolderKanban, Users } from "lucide-react";
// plane imports
import { ImageOutline, LockOutline, MailOutline, SettingsOutline, WorkspaceOutline } from "@makeplane/propel/icons";
// types
import type { TSidebarMenuItem } from "./types";

export type TCoreSidebarMenuKey =
  | "general"
  | "email"
  | "workspace"
  | "authentication"
  | "ai"
  | "image"
  | "users"
  | "projects";

export const coreSidebarMenuLinks: Record<TCoreSidebarMenuKey, TSidebarMenuItem> = {
  general: {
    Icon: SettingsOutline,
    name: "General",
    description: "Identifica la instancia y revisa sus datos clave.",
    href: `/general/`,
  },
  email: {
    Icon: MailOutline,
    name: "Correo",
    description: "Configura el servidor SMTP.",
    href: `/email/`,
  },
  workspace: {
    Icon: WorkspaceOutline,
    name: "Espacios de trabajo",
    description: "Administra todos los espacios de trabajo de la instancia.",
    href: `/workspace/`,
  },
  users: {
    Icon: Users,
    name: "Usuarios",
    description: "Todas las cuentas; crea, desactiva y asigna súper administradores.",
    href: `/users/`,
  },
  projects: {
    Icon: FolderKanban,
    name: "Proyectos",
    description: "Todos los proyectos y sus tableros.",
    href: `/projects/`,
  },
  authentication: {
    Icon: LockOutline,
    name: "Autenticación",
    description: "Configura los métodos de inicio de sesión.",
    href: `/authentication/`,
  },
  ai: {
    Icon: BrainCog,
    name: "Inteligencia artificial",
    description: "Configura las credenciales de OpenAI.",
    href: `/ai/`,
  },
  image: {
    Icon: ImageOutline,
    name: "Imágenes en Gestión",
    description: "Permite bibliotecas de imágenes de terceros.",
    href: `/image/`,
  },
};
