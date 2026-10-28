#!/bin/bash
# Construye las imágenes de Plane VTV desde el checkout del fork (ejecutar en la raíz del repo).
#   ./vtv-deploy/build-images.sh [tag] [servicios...]   p. ej.  ./vtv-deploy/build-images.sh 1.4.2-sec1 backend live
# Usa BuildKit con los Dockerfiles oficiales (caché de pnpm en RUN --mount). Requiere
# security.nesting=true en el contenedor LXD (aplicado el 2026-10-28).
set -u
cd "$(dirname "$0")/.."
TAG="${1:-1.4.2-sec1}"; shift || true
APPS=("$@"); [ ${#APPS[@]} -eq 0 ] && APPS=(backend live web space admin)
export DOCKER_BUILDKIT=1
mkdir -p build-logs; : > build-logs/status.log
for app in "${APPS[@]}"; do
  case $app in
    backend) f=vtv-deploy/Dockerfile.backend; t=plane-backend-vtv;;
    live)    f=apps/live/Dockerfile.live;      t=plane-live-vtv;;
    web)     f=apps/web/Dockerfile.web;        t=plane-frontend-vtv;;
    space)   f=apps/space/Dockerfile.space;    t=plane-space-vtv;;
    admin)   f=apps/admin/Dockerfile.admin;    t=plane-admin-vtv;;
    *) echo "servicio desconocido: $app"; exit 1;;
  esac
  echo "$(date +%T) START $app" >> build-logs/status.log
  if docker build --progress=plain -f "$f" -t "$t:$TAG" . > "build-logs/$app.log" 2>&1; then
    echo "$(date +%T) OK $app" >> build-logs/status.log
  else
    echo "$(date +%T) FAIL $app" >> build-logs/status.log
  fi
done
echo "$(date +%T) ALL_DONE" >> build-logs/status.log
cat build-logs/status.log
