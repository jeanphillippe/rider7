# Rider7

Sitio web estático tipo **flipbook**: cada carpeta de imágenes se convierte en un libro que se hojea con efecto de página curva, con su propio elemento en el menú. Se personaliza editando un solo archivo de texto (`config.txt`) y se publica gratis en **GitHub Pages** o **Cloudflare Pages**. Solo hay que pagar el dominio (opcional).

- Logo arriba, menú automático (Inicio + una entrada por carpeta + Contacto), con submenús para los grupos.
- Inicio solo con las portadas, una debajo de la otra. Las imágenes son lo principal.
- Libro con hojas que se curvan al pasar: dos páginas en escritorio, una en celular. Las imágenes van pegadas al menú y los controles quedan abajo.
- Fondo del libro: la primera imagen de la carpeta, desenfocada.
- Modo oscuro / claro, colores y tipografías de Google Fonts configurables.
- Imágenes desde el propio repositorio o desde una carpeta pública de Google Drive.
- 100% estático: HTML, CSS y JavaScript. Sin Node, sin compilar, sin instalar nada.

---

## 1. Estructura

```
rider7/
├── config.txt          ← toda la personalización
├── logo.png            ← tu logo
├── contenido/          ← una subcarpeta por libro
│   ├── 01-Catalogo-2026/
│   │   ├── 01.jpg
│   │   ├── 02.jpg
│   │   └── ...
│   ├── 02-Revista/
│   │   ├── 01.jpg
│   │   └── info.txt    ← opcional
│   └── 04-Eventos/     ← grupo: solo tiene subcarpetas
│       ├── 01-Fiesta-aniversario/
│       └── 02-Expo-2026/
├── index.html
└── assets/             ← motor del sitio (no hace falta tocarlo)
```

## 2. Cómo cargar contenido

1. Creá una carpeta dentro de `contenido/`. **Cada carpeta es un elemento del menú.**
2. Poné las imágenes adentro (`.jpg`, `.png`, `.webp`, `.gif`, `.avif`).
3. Listo.

**Orden y nombres**
- Las carpetas y las imágenes se ordenan por nombre (respetando números: `2` va antes de `10`).
- El número del principio sirve para ordenar y no se muestra: `01-Catalogo-2026` aparece como **Catalogo 2026**.
- Los guiones y guiones bajos se muestran como espacios.
- Las carpetas que empiezan con `_` o `.` se ignoran (útil para ocultar un libro sin borrarlo).

**Grupos (submenús).** Si una carpeta no tiene imágenes y solo contiene otras carpetas, se convierte en un **grupo**:
- En el menú aparece con una flechita y despliega sus subcarpetas.
- Al entrar, muestra las portadas de sus subcarpetas (con el mismo formato que el inicio).
- En el inicio se ve con hojas apiladas detrás de la tapa, para distinguirlo de un libro.
- Se pueden anidar hasta 3 niveles (grupo > subgrupo > libro).
- Si una carpeta tiene imágenes, es un libro: las subcarpetas que tenga adentro se ignoran.

**La primera imagen** de cada carpeta es la tapa y también el fondo desenfocado. La proporción de esa imagen define la forma del libro (vertical, horizontal o cuadrado), así que conviene que todas las páginas tengan el mismo tamaño.

**info.txt (opcional)** dentro de una carpeta, para poner acentos, descripción, etc.:

```
titulo: Catálogo 2026
menu: Catálogo
descripcion: Nuestra colección de otoño e invierno.
portada: 03.jpg
```

- `titulo`: nombre que se muestra (si no está, se usa el nombre de la carpeta).
- `menu`: texto más corto para el menú (opcional).
- `descripcion`: texto que aparece junto a la portada en el inicio.
- `portada`: imagen a usar en el inicio si no querés la primera. En un grupo, el nombre de la subcarpeta cuya tapa querés mostrar.

El `info.txt` también funciona dentro de un grupo.

**Tamaño de imágenes recomendado:** entre 1600 y 2000 px del lado más largo, en JPG calidad 80 o WebP. Así cargan rápido en el celular y se ven bien al ampliar.

## 3. Personalizar (config.txt)

Abrilo con cualquier editor de texto. Cada línea es `clave: valor` y las líneas con `#` son comentarios. Lo principal:

| Clave | Qué hace |
|---|---|
| `titulo`, `descripcion` | Nombre del sitio y descripción para buscadores |
| `logo`, `logo_claro`, `logo_alto` | Logo, logo alternativo para modo claro y alto en píxeles |
| `modo` | `oscuro`, `claro` o `auto` (según el dispositivo del visitante) |
| `selector_modo` | Muestra el botón sol/luna para que el visitante cambie el modo |
| `color_fondo_oscuro`, `color_fondo_claro` | Color de fondo en cada modo |
| `color_texto_oscuro`, `color_texto_claro` | Color de texto en cada modo |
| `color_acento` | Color de botones y menú activo |
| `fuente_titulos`, `fuente_texto` | Nombre de la tipografía tal como figura en [fonts.google.com](https://fonts.google.com) |
| `cabecera` | `centrada` (logo arriba, menú abajo) o `lateral` |
| `inicio_titulo`, `inicio_texto` | Texto de bienvenida opcional (por defecto vacío: el inicio muestra solo las portadas) |
| `inicio_boton` | Texto del botón de cada portada (por defecto "Entrar") |
| `paginas` | `auto`, `1` o `2` páginas a la vez |
| `tapa`, `tapa_dura` | La primera página va sola como tapa / tapas rígidas |
| `velocidad`, `desenfoque` | Velocidad de la hoja (ms) y desenfoque del fondo (px) |
| `email`, `whatsapp`, `instagram`, ... | Datos de contacto del footer (vacío = no aparece) |

## 4. Cómo encuentra las carpetas (sin compilar nada)

Un sitio estático no puede "ver" qué carpetas hay en el servidor, así que el sitio las descubre solo, según dónde esté:

| Dónde está el sitio | Cómo lee las carpetas |
|---|---|
| GitHub Pages | Con la API pública de GitHub (lee la lista de archivos del repositorio) |
| Cloudflare Pages conectado a GitHub | Igual, con la API de GitHub (completá `github_repositorio`) |
| Hosting con Apache (cPanel, etc.) | Con el listado de carpetas del servidor (lo habilita `contenido/.htaccess`) |
| Tu computadora | Con el listado de carpetas del servidor local |
| Google Drive | Con la API de Drive (ver punto 6) |

Con `fuente: auto` (recomendado) prueba primero el listado del servidor y, si no hay, usa GitHub. No hay que regenerar nada: subís una carpeta nueva y aparece.

Sobre la API de GitHub: el repositorio tiene que ser público y cada visitante puede hacer hasta 60 consultas por hora. El sitio hace una sola por visita y la guarda 10 minutos, así que en la práctica no hay límite.

## 5. Probar en tu computadora

Abrir `index.html` con doble clic no funciona (el navegador bloquea la lectura de archivos locales). Hace falta un servidor local simple que muestre listados de carpetas. Cualquiera de estas opciones sirve:

- **Visual Studio Code**: instalá la extensión **Live Server**, abrí la carpeta y tocá "Go Live".
- **Python** (viene en Mac y Linux): en la Terminal, dentro de la carpeta, `python3 -m http.server 8080` y abrí `http://localhost:8080`.
- **MAMP / XAMPP / Apache**: copiá la carpeta dentro de `htdocs`.

(El servidor que trae PHP con `php -S` no muestra listados de carpetas, así que no sirve para esto.)

## 6. Publicar gratis

### Opción A: GitHub Pages

1. Creá un repositorio **público** en GitHub y subí todos los archivos (podés arrastrarlos desde la web de GitHub).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama **main**, carpeta **/ (root)**.
3. En uno o dos minutos el sitio está en `https://tuusuario.github.io/turepositorio/`. Cada vez que subas cambios se actualiza solo.
4. Dominio propio: **Settings → Pages → Custom domain**, y en tu proveedor de dominio creá un registro `CNAME` apuntando a `tuusuario.github.io`. Con dominio propio completá `github_repositorio: tuusuario/turepositorio` en `config.txt`.

### Opción B: Cloudflare Pages

1. En Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** y elegí el repositorio.
2. Configuración: Framework preset **None**, Build command **vacío**, Build output directory **/**.
3. En `config.txt` completá `github_repositorio: tuusuario/turepositorio`.
4. Dominio propio: pestaña **Custom domains** del proyecto.

### Opción C: cualquier hosting con Apache

Subí todo por FTP. El archivo `contenido/.htaccess` habilita el listado de carpetas que usa el sitio.

## 7. Usar Google Drive en lugar de carpetas en el repositorio

Útil si el cliente prefiere subir fotos desde el celular o la PC sin tocar GitHub. Lo que se suba a Drive aparece en el sitio sin tocar el repositorio.

1. En Google Drive creá una carpeta principal y adentro una subcarpeta por libro, igual que en `contenido/`.
2. Compartí la carpeta principal como **"Cualquier persona con el enlace: Lector"**.
3. Creá una API key gratuita:
   - Entrá a [console.cloud.google.com](https://console.cloud.google.com), creá un proyecto.
   - **APIs y servicios → Biblioteca →** activá **Google Drive API**.
   - **APIs y servicios → Credenciales → Crear credenciales → Clave de API**.
   - Recomendado: en la clave, **Restricciones de aplicación → Sitios web** y agregá tu dominio (`https://tudominio.com/*`), y en **Restricciones de API** dejá solo Google Drive API.
4. En `config.txt`:

```
fuente: drive
drive_carpeta_id: https://drive.google.com/drive/folders/1AbCdEf...   (sirve el enlace completo o solo el ID)
drive_api_key: AIza...
```

Notas sobre Drive:
- La descripción de cada subcarpeta en Drive se usa como descripción del libro, o podés subir un `info.txt`.
- La API key queda visible en el código del sitio; por eso conviene restringirla a tu dominio y a Drive API. Solo permite leer archivos que ya son públicos.
- Drive puede tardar un poco más que el repositorio en servir imágenes la primera vez.

## 8. Detalles técnicos

- No usa Node ni ningún paso de compilación: los archivos del repositorio son exactamente los que se publican.
- Navegación con enlaces directos: `tudominio.com/#/catalogo-2026/5` abre ese libro en la página 5, y `tudominio.com/#/eventos/expo-2026` abre un libro dentro de un grupo.
- Teclado: flechas izquierda/derecha para pasar hojas, Esc para cerrar el zoom.
- Efecto de hojas: [StPageFlip](https://github.com/Nodlik/StPageFlip) (MIT), incluido en `assets/vendor/`.

## Licencia

MIT. Podés usarlo, modificarlo y regalarlo.
