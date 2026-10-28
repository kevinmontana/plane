#!/bin/bash
# Construye las imágenes de Plane VTV desde el checkout del fork (ejecutar en la raíz del repo).
#   ./vtv-deploy/build-images.sh [tag] [servicios...]   p. ej.  ./vtv-deploy/build-images.sh 1.4.2-sec1 backend live
# En DESARROLLO-13 el daemon usa storage vfs y BuildKit falla ("permission denied"), por eso
# se usan los Dockerfile.*.legacy (sin "# syntax" ni "RUN --mount") y DOCKER_BUILDKIT=0.
set -u
cd "$(dirname "$0")/.."
TAG="${1:-1.4.2-sec1}"; shift || true
APPS=("$@"); [ ${#APPS[@]} -eq 0 ] && APPS=(backend live web space admin)
export DOCKER_BUILDKIT=0
mkdir -p build-logs; : > build-logs/status.log
for app in "${APPS[@]}"; do
  case $app in
    backend) f=vtv-deploy/Dockerfile.backend;  t=plane-backend-vtv;;
    live)    f=apps/live/Dockerfile.live.legacy;   t=plane-live-vtv;;
    web)     f=apps/web/Dockerfile.web.legacy;     t=plane-frontend-vtv;;
    space)   f=apps/space/Dockerfile.space.legacy; t=plane-space-vtv;;
    admin)   f=apps/admin/Dockerfile.admin.legacy; t=plane-admin-vtv;;
    *) echo "servicio desconocido: $app"; exit 1;;
  esac
  echo "$(date +%T) START $app" >> build-logs/status.log
  if docker build -f "$f" -t "$t:$TAG" . > "build-logs/$app.log" 2>&1; then
    echo "$(date +%T) OK $app" >> build-logs/status.log
  else
    echo "$(date +%T) FAIL $app" >> build-logs/status.log
  fi
done
echo "$(date +%T) ALL_DONE" >> build-logs/status.log
cat build-logs/status.log
