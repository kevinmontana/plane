/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// VTV: endpoints de súper administrador (usuarios y proyectos de toda la instancia).
// InstanceService ya trae la URL base y las cookies de sesión; @plane/services no exporta APIService.
import { InstanceService } from "@plane/services";

export type TInstanceUserWorkspace = {
  id: string;
  slug: string;
  name: string;
  role: 20 | 15 | 5;
};

export type TInstanceUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  is_onboarded: boolean;
  date_joined: string;
  last_login: string | null;
  last_active: string | null;
  workspaces: TInstanceUserWorkspace[];
};

export type TInstanceProject = {
  id: string;
  name: string;
  identifier: string;
  network: 0 | 2;
  archived_at: string | null;
  created_at: string;
  members_count: number;
  work_items_count: number;
  is_member: boolean;
  workspace: { id: string; slug: string; name: string };
};

export type TCreateInstanceUser = {
  email: string;
  first_name: string;
  last_name?: string;
  workspace_id?: string;
  workspace_role?: 20 | 15 | 5;
  send_email: boolean;
};

export type TApiError = { error?: string };

const unwrapError = (error: unknown): TApiError => {
  const data = (error as { response?: { data?: TApiError } })?.response?.data;
  return data && typeof data === "object" ? data : { error: "No se pudo completar la acción." };
};

export class SuperAdminService extends InstanceService {
  async listUsers(search?: string): Promise<TInstanceUser[]> {
    return this.get("/api/instances/users/", { params: search ? { search } : {} })
      .then((response) => response.data)
      .catch((error) => {
        throw unwrapError(error);
      });
  }

  async createUser(data: TCreateInstanceUser): Promise<{ user: TInstanceUser; temp_password: string }> {
    return this.post("/api/instances/users/", data)
      .then((response) => response.data)
      .catch((error) => {
        throw unwrapError(error);
      });
  }

  async setUserActive(userId: string, isActive: boolean): Promise<TInstanceUser> {
    return this.patch(`/api/instances/users/${userId}/`, { is_active: isActive })
      .then((response) => response.data)
      .catch((error) => {
        throw unwrapError(error);
      });
  }

  async resetPassword(userId: string, sendEmail: boolean): Promise<{ temp_password: string }> {
    return this.post(`/api/instances/users/${userId}/reset-password/`, { send_email: sendEmail })
      .then((response) => response.data)
      .catch((error) => {
        throw unwrapError(error);
      });
  }

  async grantSuperAdmin(userId: string): Promise<TInstanceUser> {
    return this.post(`/api/instances/users/${userId}/super-admin/`, {})
      .then((response) => response.data)
      .catch((error) => {
        throw unwrapError(error);
      });
  }

  async revokeSuperAdmin(userId: string): Promise<TInstanceUser> {
    return this.delete(`/api/instances/users/${userId}/super-admin/`)
      .then((response) => response.data)
      .catch((error) => {
        throw unwrapError(error);
      });
  }

  async workspaceOptions(): Promise<{ id: string; slug: string; name: string }[]> {
    return this.get("/api/instances/workspace-options/")
      .then((response) => response.data)
      .catch((error) => {
        throw unwrapError(error);
      });
  }

  async listProjects(search?: string): Promise<TInstanceProject[]> {
    return this.get("/api/instances/projects/", { params: search ? { search } : {} })
      .then((response) => response.data)
      .catch((error) => {
        throw unwrapError(error);
      });
  }

  async joinProject(projectId: string): Promise<{ workspace_slug: string; project_id: string }> {
    return this.post(`/api/instances/projects/${projectId}/join/`, {})
      .then((response) => response.data)
      .catch((error) => {
        throw unwrapError(error);
      });
  }
}
