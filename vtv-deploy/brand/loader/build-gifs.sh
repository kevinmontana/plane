#!/usr/bin/env bash
# Regenera logo-spinner-light.gif y logo-spinner-dark.gif desde la composición HyperFrames.
#
#   ./build-gifs.sh                 # deja los GIF en ./renders
#   ./build-gifs.sh /tmp/loader     # otra carpeta de salida
#   ./build-gifs.sh --install       # además los copia a apps/web, apps/admin y apps/space
#
# Variables opcionales: HF (comando de la CLI, por defecto npx --yes hyperframes@0.8.188) y FFMPEG.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
INSTALL=0
OUT="$HERE/renders"
for arg in "$@"; do
  case "$arg" in
    --install) INSTALL=1 ;;
    *) OUT="$arg" ;;
  esac
done
HF="${HF:-npx --yes hyperframes@0.8.188}"
FFMPEG="${FFMPEG:-ffmpeg}"

# 132x88 px: el doble de h-11 (44 px) para pantallas retina; el navegador lo reduce para h-6.
W=132
H=88
mkdir -p "$OUT"

for variant in light dark; do
  # Color de mate de los bordes: el GIF solo tiene transparencia de 1 bit, así que el borde
  # antialiasado se mezcla con un color cercano al fondo donde se va a ver.
  case "$variant" in
    light) matte=f8f8f8 ;; # entre bg-canvas claro (#f2f2f3) y blanco
    dark) matte=151516 ;;  # entre bg-canvas oscuro (#0f0f10) y #191919
  esac

  frames="$OUT/frames-$variant"
  rm -rf "$frames"
  $HF render "$HERE" --format png-sequence --fps 30 --quiet \
    --variables "{\"variant\":\"$variant\"}" --output "$frames"

  "$FFMPEG" -v error -y -framerate 30 -i "$frames/frame_%06d.png" -filter_complex "
    [0:v]format=rgba,split[a][b];
    [a]alphaextract,scale=${W}:${H}:flags=area[al];
    color=c=0x${matte}:s=720x480:r=30,format=rgb24[bg];
    [bg][b]overlay=format=rgb:shortest=1,format=rgb24,scale=${W}:${H}:flags=area[rgb];
    [rgb][al]alphamerge,split[x][y];
    [x]palettegen=reserve_transparent=1:stats_mode=full:max_colors=256[p];
    [y][p]paletteuse=dither=sierra2_4a:alpha_threshold=128[out]" \
    -map "[out]" -loop 0 "$OUT/logo-spinner-$variant.gif"

  echo "$OUT/logo-spinner-$variant.gif: $(wc -c <"$OUT/logo-spinner-$variant.gif" | tr -d ' ') bytes"
done

if [ "$INSTALL" = 1 ]; then
  for app in web admin space; do
    for variant in light dark; do
      cp "$OUT/logo-spinner-$variant.gif" "$REPO/apps/$app/app/assets/images/logo-spinner-$variant.gif"
    done
    echo "copiado a apps/$app/app/assets/images/"
  done
fi
