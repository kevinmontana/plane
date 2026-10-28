/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useTheme } from "next-themes";
import { Button } from "@makeplane/propel/components/button";
// assets
import InstanceFailureDarkImage from "@/app/assets/instance/instance-failure-dark.svg?url";
import InstanceFailureImage from "@/app/assets/instance/instance-failure.svg?url";

export function InstanceFailureView() {
  const { resolvedTheme } = useTheme();

  const instanceImage = resolvedTheme === "dark" ? InstanceFailureDarkImage : InstanceFailureImage;

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="relative container mx-auto flex h-screen items-center justify-center overflow-x-hidden overflow-y-auto px-5">
      <div className="relative w-auto max-w-2xl space-y-8 py-10">
        <div className="relative flex flex-col items-center justify-center space-y-4">
          <img src={instanceImage} alt="Imagen de error de la instancia de Gestión" />
          <h3 className="text-20 font-medium text-on-color">No se pudieron obtener los datos de la instancia.</h3>
          <p className="text-center text-14 font-medium">
            No pudimos obtener los datos de la instancia. <br />
            No te preocupes, puede ser solo un problema de conexión.
          </p>
        </div>
        <div className="flex justify-center">
          <Button variant="primary" size="md" stretch="auto" label="Reintentar" onClick={handleRetry} />
        </div>
      </div>
    </div>
  );
}
