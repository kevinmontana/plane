/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export function MaintenanceMessage() {
  const linkMap = [
    {
      key: "mail_to",
      label: "Contactar a soporte",
      value: "mailto:support@plane.so",
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <h1 className="text-left text-18 font-semibold text-primary">
          &#x1F6A7; Parece que Gestión no se inició correctamente.
        </h1>
        <span className="text-left text-14 font-medium text-secondary">
          Es posible que algunos servicios no hayan podido iniciar. Revisa los registros de los contenedores para
          identificar y resolver el problema. Si no logras solucionarlo, contacta al equipo de soporte.
        </span>
      </div>
      <div className="mt-1 flex items-center justify-start gap-6">
        {linkMap.map((link) => (
          <div key={link.key}>
            <a
              href={link.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-13 text-accent-primary hover:underline"
            >
              {link.label}
            </a>
          </div>
        ))}
      </div>
    </>
  );
}
