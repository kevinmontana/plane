/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@makeplane/propel/components/button";
import { Checkbox } from "@makeplane/propel/components/checkbox";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogHeading,
  DialogMain,
  DialogTitle,
} from "@makeplane/propel/components/dialog";
import { Input, InputGroup } from "@makeplane/propel/components/input";
import { Select, SelectContent, SelectItem, SelectList, SelectTrigger } from "@makeplane/propel/components/select";
import type { SuperAdminService, TInstanceUser } from "@/services/super-admin.service";
import { WORKSPACE_ROLE_LABELS, errorMessage } from "./helpers";

const NO_WORKSPACE = "__none__";

type Props = {
  isOpen: boolean;
  service: SuperAdminService;
  onClose: () => void;
  onCreated: (result: { user: TInstanceUser; temp_password: string; emailSent: boolean }) => void;
};

const EMPTY = { email: "", first_name: "", last_name: "", workspace_id: NO_WORKSPACE, workspace_role: "15" };

export function CreateUserDialog({ isOpen, service, onClose, onCreated }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: workspaces } = useSWR(isOpen ? "SUPER_ADMIN_WORKSPACE_OPTIONS" : null, () =>
    service.workspaceOptions()
  );

  const set = (key: keyof typeof EMPTY, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const canSubmit = form.email.trim() !== "" && form.first_name.trim() !== "" && !isSubmitting;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError("");
    try {
      const hasWorkspace = form.workspace_id !== NO_WORKSPACE;
      const result = await service.createUser({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        workspace_id: hasWorkspace ? form.workspace_id : undefined,
        workspace_role: hasWorkspace ? (Number(form.workspace_role) as 20 | 15 | 5) : undefined,
        send_email: sendEmail,
      });
      onCreated({ ...result, emailSent: sendEmail });
    } catch (err) {
      setError(errorMessage(err, "No se pudo crear el usuario."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) {
          setForm(EMPTY);
          setSendEmail(true);
          setError("");
        }
      }}
    >
      <DialogContent size="md">
        <form onSubmit={submit}>
          <DialogMain>
            <DialogHeader>
              <DialogHeading>
                <DialogTitle>Nuevo usuario</DialogTitle>
              </DialogHeading>
            </DialogHeader>
            <DialogBody>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="new-user-email" className="text-13 font-medium text-secondary">
                    Correo electrónico
                  </label>
                  <InputGroup size="lg">
                    <Input
                      id="new-user-email"
                      type="email"
                      size="lg"
                      autoComplete="off"
                      placeholder="nombre@vtv.gob.ve"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </InputGroup>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-user-first-name" className="text-13 font-medium text-secondary">
                      Nombre
                    </label>
                    <InputGroup size="lg">
                      <Input
                        id="new-user-first-name"
                        size="lg"
                        autoComplete="off"
                        value={form.first_name}
                        onChange={(e) => set("first_name", e.target.value)}
                      />
                    </InputGroup>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-user-last-name" className="text-13 font-medium text-secondary">
                      Apellido <span className="font-normal text-tertiary">(opcional)</span>
                    </label>
                    <InputGroup size="lg">
                      <Input
                        id="new-user-last-name"
                        size="lg"
                        autoComplete="off"
                        value={form.last_name}
                        onChange={(e) => set("last_name", e.target.value)}
                      />
                    </InputGroup>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
                  <div className="flex flex-col gap-1">
                    <span className="text-13 font-medium text-secondary">Espacio de trabajo</span>
                    <Select value={form.workspace_id} onValueChange={(v) => set("workspace_id", String(v))}>
                      <SelectTrigger size="lg" placeholder="Sin espacio de trabajo" />
                      <SelectContent>
                        <SelectList>
                          <SelectItem value={NO_WORKSPACE} label="Sin espacio de trabajo" size="lg" />
                          {(workspaces ?? []).map((ws) => (
                            <SelectItem key={ws.id} value={ws.id} label={ws.name} size="lg" />
                          ))}
                        </SelectList>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.workspace_id !== NO_WORKSPACE && (
                    <div className="flex flex-col gap-1 sm:w-44">
                      <span className="text-13 font-medium text-secondary">Rol</span>
                      <Select value={form.workspace_role} onValueChange={(v) => set("workspace_role", String(v))}>
                        <SelectTrigger size="lg" placeholder="Miembro" />
                        <SelectContent>
                          <SelectList>
                            {["20", "15", "5"].map((role) => (
                              <SelectItem
                                key={role}
                                value={role}
                                label={WORKSPACE_ROLE_LABELS[Number(role)]}
                                size="lg"
                              />
                            ))}
                          </SelectList>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Checkbox
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(Boolean(checked))}
                  label="Enviarle un correo para que defina su contraseña"
                />

                <p className="text-11 text-tertiary">
                  Se genera una contraseña temporal que verás una sola vez.
                  {form.workspace_id === NO_WORKSPACE &&
                    " Sin espacio de trabajo, al entrar se le pedirá crear uno o unirse a uno."}
                </p>

                {error && (
                  <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-13 text-danger-primary">
                    {error}
                  </p>
                )}
              </div>
            </DialogBody>
          </DialogMain>
          <DialogActions>
            <Button
              variant="secondary"
              size="md"
              stretch="auto"
              onClick={onClose}
              disabled={isSubmitting}
              label="Cancelar"
            />
            <Button
              variant="primary"
              size="md"
              stretch="auto"
              type="submit"
              loading={isSubmitting}
              disabled={!canSubmit}
              label={isSubmitting ? "Creando" : "Crear usuario"}
            />
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
