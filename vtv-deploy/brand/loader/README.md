# Loader de Gestión (VTV)

Fuente de la animación de carga que reemplaza a la de Plane. Es un proyecto
[HyperFrames](https://hyperframes.heygen.com) (HTML renderizado a video) que se exporta a dos GIF
transparentes:

- `apps/{web,admin,space}/app/assets/images/logo-spinner-light.gif`: para fondos claros
- `apps/{web,admin,space}/app/assets/images/logo-spinner-dark.gif`: para fondos oscuros

`LogoSpinner` (`components/common/logo-spinner.tsx` en cada app) los muestra con
`h-6 sm:h-11 w-auto`, así que no hay que tocar ningún import.

## Qué muestra

La marca VTV, trazada a mano desde `apps/web/app/assets/brand/vtv-logo.png`, sobre una silueta
neutra que siempre está visible. Un ciclo dura 2.3 s a 30 fps (69 cuadros):

| Tiempo      | Qué pasa                                                             |
| ----------- | -------------------------------------------------------------------- |
| 0 – 0.38 s  | el amarillo se dibuja de izquierda a derecha con la punta redondeada |
| 0.26 – 0.46 | el azul baja por el brazo izquierdo, detrás del amarillo             |
| 0.42 – 1.10 | el rojo sube desde la base de la V hasta la punta y frena suave      |
| 1.10 – 1.48 | marca completa, quieta                                               |
| 1.48 – 2.04 | se borra en el mismo sentido: la cola recorre amarillo, azul y rojo  |
| 2.04 – 2.30 | solo la silueta; el ciclo vuelve a empezar                           |

El primer y el último cuadro son la silueta sola, por eso el bucle no salta.

## Archivos

- `index.html`: composición raíz. Declara la variable `variant` (`light` / `dark`) y los colores.
- `compositions/loader.html`: el SVG de la marca, las máscaras y la línea de tiempo GSAP.
- `build-gifs.sh`: renderiza las dos variantes y las convierte a GIF.
- `hyperframes.json`: configuración del proyecto para la CLI.

Colores (en `index.html`):

| Token          | light                                                              | dark      |
| -------------- | ------------------------------------------------------------------ | --------- |
| `--ld-ghost`   | `#e3e3e6`                                                          | `#2c2c30` |
| `--ld-blue`    | `#262f66`                                                          | `#2d3878` |
| amarillo, rojo | iguales en las dos variantes (degradados tomados del PNG del logo) |

## Requisitos

- Node 22 o superior y `ffmpeg` (con `palettegen`/`paletteuse`; el de Homebrew sirve).
- Chrome para el render: `npx --yes hyperframes@0.8.188 browser ensure` lo instala si falta.
- No hace falta `pnpm install`: la CLI se ejecuta con `npx`, con la versión fijada.
- ImageMagick (`magick`) solo para los comandos de verificación.

## Regenerar los GIF

Desde la raíz del repo:

```bash
cd vtv-deploy/brand/loader
./build-gifs.sh            # deja renders/logo-spinner-light.gif y renders/logo-spinner-dark.gif
./build-gifs.sh --install  # además los copia a apps/web, apps/admin y apps/space
```

`renders/` y `.hyperframes/` están en `.gitignore`.

Lo que hace el script, paso a paso, por si hay que correrlo a mano:

```bash
cd vtv-deploy/brand/loader

# 1. Render con fondo transparente (secuencia PNG RGBA de 720x480)
npx --yes hyperframes@0.8.188 render . --format png-sequence --fps 30 \
  --variables '{"variant":"light"}' --output renders/frames-light
npx --yes hyperframes@0.8.188 render . --format png-sequence --fps 30 \
  --variables '{"variant":"dark"}' --output renders/frames-dark

# 2. PNG a GIF de 132x88. MATTE = f8f8f8 para light, 151516 para dark.
MATTE=f8f8f8; VARIANT=light
ffmpeg -v error -y -framerate 30 -i renders/frames-${VARIANT}/frame_%06d.png -filter_complex "
  [0:v]format=rgba,split[a][b];
  [a]alphaextract,scale=132:88:flags=area[al];
  color=c=0x${MATTE}:s=720x480:r=30,format=rgb24[bg];
  [bg][b]overlay=format=rgb:shortest=1,format=rgb24,scale=132:88:flags=area[rgb];
  [rgb][al]alphamerge,split[x][y];
  [x]palettegen=reserve_transparent=1:stats_mode=full:max_colors=256[p];
  [y][p]paletteuse=dither=sierra2_4a:alpha_threshold=128[out]" \
  -map "[out]" -loop 0 renders/logo-spinner-${VARIANT}.gif
# repetir con MATTE=151516; VARIANT=dark

# 3. Copiar a las tres apps
for app in web admin space; do
  cp renders/logo-spinner-light.gif ../../../apps/$app/app/assets/images/logo-spinner-light.gif
  cp renders/logo-spinner-dark.gif  ../../../apps/$app/app/assets/images/logo-spinner-dark.gif
done
```

Por qué así:

- El GIF solo tiene transparencia de 1 bit. Por eso el borde antialiasado se mezcla con un color de
  mate cercano al fondo real (`bg-canvas` claro es `#f2f2f3`; el oscuro, `#0f0f10`) y los píxeles con
  menos de 50 % de cobertura quedan transparentes. Por eso existen dos variantes.
- 132x88 es el doble de `sm:h-11` (44 px) para pantallas retina; en `h-6` el navegador lo reduce.
- A 30 fps los retardos del GIF alternan 3 y 4 centésimas (suman 2.30 s exactos).
- `sierra2_4a` sin `diff_mode` suaviza el degradado amarillo y deja el primer y el último cuadro
  idénticos. Con `diff_mode=rectangle` el tramado cambia entre cuadros y el bucle deja de cerrar exacto.

## Editar la animación

```bash
cd vtv-deploy/brand/loader
npx --yes hyperframes@0.8.188 preview   # abre el editor en el navegador
npx --yes hyperframes@0.8.188 check     # lint, runtime y layout
```

Los tiempos y recorridos están comentados en `compositions/loader.html`. Cada pieza se revela con una
cápsula dentro de una máscara SVG: en `x = 0` la cápsula cubre la pieza completa, los valores negativos
la dejan antes de la pieza y los positivos después. Si se cambia la duración, hay que cambiar
`data-duration` en los dos `div` de `index.html`.

## Verificar

```bash
cd vtv-deploy/brand/loader/renders
mkdir -p check && magick logo-spinner-light.gif -coalesce check/f_%02d.png
magick compare -metric AE check/f_00.png check/f_68.png null:    # 0 = el bucle cierra exacto
magick check/f_33.png -background white -alpha remove -alpha off check/hold-blanco.png
magick check/f_33.png -background '#191919' -alpha remove -alpha off check/hold-oscuro.png
magick logo-spinner-light.gif -format '%T\n' info: | sort | uniq -c   # 46 x 3 cs y 23 x 4 cs
```
