/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@makeplane/propel/components/button";
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

type Props = {
  data: { title: string; email: string; password: string; emailSent: boolean } | null;
  onClose: () => void;
};

export function TempPasswordDialog({ data, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog
      open={!!data}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setCopied(false);
      }}
    >
      <DialogContent size="sm">
        <DialogMain>
          <DialogHeader>
            <DialogHeading>
              <DialogTitle>{data?.title ?? ""}</DialogTitle>
            </DialogHeading>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-4 text-13 text-secondary">
              <p>
                Contraseña temporal de <span className="font-medium text-primary">{data?.email}</span>. Solo se muestra
                esta vez.
              </p>
              <div className="flex items-center gap-2 rounded-md border border-subtle bg-layer-1 p-2 pl-3">
                <code className="font-mono grow text-14 tracking-wide break-all text-primary">{data?.password}</code>
                <Button
                  variant="secondary"
                  size="sm"
                  stretch="auto"
                  onClick={copy}
                  label={copied ? "Copiada" : "Copiar"}
                  icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                />
              </div>
              <p className="text-tertiary">
                {data?.emailSent
                  ? "También le enviamos un correo con un enlace para que defina su propia contraseña."
                  : "Compártela por un canal seguro. La persona podrá cambiarla desde su perfil."}
              </p>
            </div>
          </DialogBody>
        </DialogMain>
        <DialogActions>
          <Button variant="primary" size="md" stretch="auto" onClick={onClose} label="Listo" />
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}
