# VM Legal — Propuesta de sitio web

Propuesta comercial y demostración navegable del nuevo sitio web de
**VM Legal S.A.S.** (Medellín, Colombia).

### ▶ Ver en vivo

**https://feliperpovera.github.io/vmlegal/** · panel en **/admin/**

La propuesta fue aceptada (29 sep 2026) y se retiró; la raíz ya es el sitio.

---

## Qué contiene

| Ruta | Qué es |
|---|---|
| `index.html` | Inicio: hero y la firma. |
| `valor-agregado.html` | Pilares de la firma y áreas de práctica en carrusel. |
| `equipo.html` | Equipo, pintado desde `data/equipo.json`. |
| `novedades.html` | Circulares con buscador y filtro por área, desde `data/documentos.json`. |
| `derecho-*.html`, `fusiones-y-adquisiciones.html` | Una página por área (SEO): servicios, preguntas frecuentes con schema FAQPage, migas y circulares del área. |
| `sitemap.xml` · `robots.txt` | Para Google; apuntan a www.vmlegal.com.co. |
| `contacto.html` | Datos de contacto y formulario (valida; aún no envía). |
| `admin/` | **Panel de contenido** (Sveltia CMS). Configuración en `admin/config.yml`. |
| `data/equipo/*.json` · `data/documentos/*.json` | Contenido editable: un archivo por miembro o documento (así uno nuevo nunca pisa a otro). |
| `scripts/unir_datos.py` | Une esos archivos en `data/equipo.json` y `data/documentos.json`. Lo corre la acción `.github/workflows/publicar.yml` en cada publicación; en local: `python3 scripts/unir_datos.py`. |
| `supabase/functions/contacto` | Función que recibe el formulario y envía el correo por Resend (proyecto Supabase «VMLegal»). |
| `uploads/` | PDFs y fotos que se suben desde el panel. |
| `assets/js/datos.js` | Lee los JSON y pinta equipo y documentos. |
| `assets/js/sitio.js` · `i18n.js` | Interacciones y ES ⇄ EN, sin librerías. |

## El panel

Sin servidor ni base de datos propios: el panel guarda cada cambio como un
commit en este repositorio y GitHub Pages lo publica en ~1 minuto.

- **Documentos:** título, fecha, área, descripción, palabras clave y PDF.
- **Equipo:** nombre, cargo, foto, pregrado, posgrado y perfil. Las fotos se
  convierten a WebP de 800 px al subirlas. Se reordena arrastrando.
- Crear y eliminar: botones del propio panel.

**Acceso:** *Iniciar sesión con un token de acceso*. Cada persona necesita una
cuenta de GitHub con permiso de escritura en el repo y un token *fine-grained*
limitado a este repositorio (permiso **Contents: Read and write**). El botón
«Iniciar sesión con GitHub» requiere un servicio OAuth aparte; no está montado.

⚠️ El repo es público: todo lo que se sube (PDFs, fotos) es público.

---

## Branding

Todo se extrajo del sitio oficial `vmlegal.com.co`; nada se inventó.

**Color** — muestreado píxel a píxel del logo original y del CSS del sitio:

| Token | Valor | Origen | Uso |
|---|---|---|---|
| `--vm-teal` | `#0093BD` | Trazo «VM» del logo | Íconos, acentos, títulos grandes |
| `--vm-teal-deep` | `#1986AC` | Acento de UI del sitio actual | Cifras y titulares secundarios |
| `--vm-gray` | `#706F6F` | Palabra «Legal» del logo | Texto secundario |
| `--vm-mist` | `#DFEAF3` | Fondo azul claro del sitio actual | Superficies y bordes |
| `--vm-ink` | `#232323` | Barra oscura del sitio actual | Titulares y fondo oscuro |

**Tipografía** — las mismas del sitio actual:
**Oswald** para titulares (mayúsculas, peso ligero, letra espaciada) y
**Open Sans** para el texto corrido.

**Logo** — es el archivo original `LOGO-VM-LEGAL.png` de VM Legal, recortado
al contenido y con el fondo blanco convertido en transparencia. No se
redibujó, ni se cambiaron sus proporciones ni sus colores.

### Una nota honesta sobre el color y la accesibilidad

El teal del logo, `#0093BD`, da **3.55:1** de contraste sobre blanco. Eso
alcanza para gráficos y títulos grandes, pero **no** para texto pequeño ni
para texto blanco encima (WCAG AA exige 4.5:1).

Para poder cumplir AA sin cambiar la marca, el texto pequeño en teal y los
rellenos con texto blanco encima usan `#04748f` (**5.4:1**): el mismo color,
solo oscurecido. El logo, los íconos y los titulares grandes conservan
`#0093BD` exacto.

Si el cliente prefiere el teal original en todas partes, es una línea en
`assets/css/brand.css`:

```css
--vm-teal-text:  #0093BD;
--vm-teal-solid: #0093BD;
```

---

## Cómo verlo en local

No requiere compilación ni dependencias. Basta con servir la carpeta:

```bash
python3 -m http.server 4173
```

Y abrir `http://localhost:4173`.

---

## Publicación

Ya está publicado con **GitHub Pages** desde la rama `main`, carpeta raíz.
El archivo `.nojekyll` hace que GitHub sirva la carpeta tal cual, sin
procesarla.

Para actualizar el sitio en vivo basta con subir los cambios; el deploy
tarda un par de minutos:

```bash
git add -A && git commit -m "..." && git push
```

Ambas páginas llevan `<meta name="robots" content="noindex, nofollow">`,
así que no aparecen en Google aunque el repositorio sea público. Conviene
quitarlo el día que el sitio se publique de verdad bajo el dominio de la
firma.

---

## Decisiones técnicas

- **HTML, CSS y JavaScript planos.** Sin framework, sin build, sin
  dependencias. Se puede alojar en cualquier parte y sobrevive sin
  mantenimiento.
- **Mobile-first.** Todo se diseñó primero a 375 px y luego se expandió.
  Tipografía fluida con `clamp()`, objetivos táctiles de 48 px mínimo y
  cero desplazamiento horizontal.
- **Carruseles sin librerías.** Áreas y equipo usan `scroll-snap` nativo:
  inercia real al deslizar en el celular y navegables con el teclado. Los
  puntos y el estado de las flechas se sincronizan con la posición real del
  scroll. En móvil las flechas van superpuestas a los lados del track y
  centradas en vertical, lejos de los botones flotantes del borde inferior;
  de tablet en adelante pasan a la fila de controles.
- **Bilingüe real.** El selector ES/EN ya no es decorativo: `assets/js/i18n.js`
  lleva la traducción de las 173 cadenas del sitio y las intercambia sobre los
  nodos de texto ya renderizados, sin recarga ni segunda página que mantener.
  También cambia `<html lang>`, el `<title>`, la meta descripción, los
  `aria-label` y el `placeholder` del buscador, y recuerda la elección en
  `localStorage`. Los nombres propios, las siglas (DIAN, ICA, M&A) y la
  dirección no se traducen.
- **Circulares bajo demanda.** La sección arranca sin ningún filtro
  seleccionado: se ven el buscador y las áreas, y la lista solo aparece al
  elegir un área, escribir algo o pulsar «Ver todas». Volver a tocar el área
  activa la deselecciona. Así la sección ocupa 785 px en lugar de 2.900 px
  al entrar.
- **Desplegables.** El detalle de cada área y cada perfil se abre con un
  `aria-expanded` y se anima con `grid-template-rows: 0fr → 1fr`, sin medir
  alturas en JavaScript.
- **Accesibilidad.** Un solo `h1` por página, jerarquía de encabezados sin
  saltos, todo el formulario etiquetado, navegación completa por teclado,
  foco visible, `prefers-reduced-motion` respetado y **cero fallos de
  contraste** en la auditoría automática de ambas páginas, incluso con todos
  los desplegables abiertos.
- **Rendimiento.** La página del sitio pesa **≈ 109 KB en 6 archivos**
  (≈ 181 KB contando las fuentes de Google). El sitio actual entrega
  404 KB solo de HTML, repartidos en 74 archivos CSS y JS.
- **Sin bloqueo de zoom.** El `viewport` no lleva `maximum-scale`, a
  diferencia del sitio actual.

---

## Qué falta definir con el cliente

- **Fotografías del equipo.** El sitio actual no las tiene, así que se usan
  monogramas con las iniciales. Con fotos reales queda mejor.
- **Textos de las áreas de práctica.** El sitio actual solo muestra los
  títulos, sin descripción. Los textos aquí son una propuesta de redacción
  y deben ser aprobados por la firma.
- **Versión en inglés.** Ya funciona sobre las 173 cadenas del sitio. La
  traducción es nuestra y debe ser revisada por la firma, sobre todo la
  terminología legal y los perfiles del equipo.
- **Circulares.** Se cargaron nueve reales, con sus PDF originales. En el
  sitio final se migra el archivo completo (más de 150).
- **Formulario.** Valida en el navegador pero no envía: falta conectarlo al
  correo de la firma.
- **Teléfono.** En pantalla está el número tal como lo publica el sitio oficial
  (`+57 444 2346`). Hay que confirmar el fijo completo con indicativo para que
  sea marcable desde el exterior.
- **WhatsApp.** El botón flotante está retirado: apuntaba al fijo de la oficina,
  que no tiene WhatsApp, y en la demo abría un chat inexistente. Se restaura en
  cuanto la firma confirme el celular.
- **Propuesta económica.** Se entrega en documento aparte.

---

Preparado por **RevUp Agency Group** · 2026

## Antes de publicar en www.vmlegal.com.co

1. Quitar `<meta name="robots" content="noindex, nofollow">` de todas las páginas.
   Mientras viva en github.io se deja: evita que Google indexe una copia duplicada.
2. Agregar el dominio a `ORIGINS` en `supabase/functions/contacto/index.ts` (ya está) y
   cambiar `site_url` en `admin/config.yml`.
3. Dar de alta el sitio en Google Search Console y enviar `sitemap.xml`.
4. Crear o actualizar el perfil de Google Business con la dirección del Edificio Danzas.
5. Que un abogado de la firma revise las respuestas de las preguntas frecuentes.
