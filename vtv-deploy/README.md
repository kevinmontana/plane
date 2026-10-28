# Despliegue de Plane VTV (DESARROLLO-13)

Flujo: commit y push al fork → en el servidor `git pull` → build → `docker compose up -d`.

```bash
cd ~/plane
git pull
./vtv-deploy/build-images.sh 1.4.2-sec1            # o solo algunos: ... 1.4.2-sec1 backend live
docker compose up -d --no-deps api worker beat-worker migrator live web space admin
```

- `docker-compose.yml` y `Caddyfile` del servidor **no** se versionan con cambios locales; aquí hay copias de
  referencia (`docker-compose.server.yml`, `Caddyfile`). El Caddyfile está montado en `plane-proxy-1`:
  editarlo **en el mismo inodo** (`cat nuevo > Caddyfile`) y luego `docker exec plane-proxy-1 caddy reload --config /etc/caddy/Caddyfile`.
- Rangos de Cloudflare en el Caddyfile: revisar https://www.cloudflare.com/ips/ cada 6 meses.
- Docker en el servidor usa storage `fuse-overlayfs` (el rootfs LXD es `idmapped` y el kernel 5.15 no permite `overlay2`).
  BuildKit funciona desde que el contenedor tiene `security.nesting=true` (2026-10-28); los builds usan los Dockerfiles oficiales.
- Registro público cerrado (`ENABLE_SIGNUP=0` en God Mode → Authentication).
