# Sergio Almagre — Personal Portfolio & CV

Mi sitio web y portfolio personal, diseñado y construido de forma nativa e interactiva.

**URL de producción:** [www.sergioalmagre.com](https://www.sergioalmagre.com)

---

## 🛠️ Stack Tecnológico del Portfolio

- **Estructura y Contenido:** HTML5 Semántico.
- **Estilos y Layout:** CSS3 Vanilla con variables personalizadas (tokens de diseño) y animaciones nativas. Totalmente adaptado para móviles.
- **Interactividad y Consola:** JavaScript Vanilla (ES6+) con simulación de terminal interactiva zsh.
- **Tipografía:** *JetBrains Mono* e *Inter* (Google Fonts).

---

## 🕹️ Easter Egg: Dev Enterprise Simulator

El portfolio incluye un minijuego arcade táctico e inercial inspirado en Star Trek y los clásicos juegos de naves espaciales:

- **Motor Gráfico:** Renderizado a 60 FPS sobre un elemento `<canvas>` HTML5 con animaciones físicas inerciales personalizadas.
- **Diseño de Sonido:** Sintetizador dinámico en tiempo real utilizando la **Web Audio API nativa** (no requiere de assets de audio externos pesados).
- **Controles Adaptativos:**
  - **Escritorio:** Clic derecho para propulsar la nave, clic izquierdo para disparar fáseres normales o cargar súper proyectiles y la bomba cuántica.
  - **Móvil/Tablet:** Soporte táctil nativo (`touch-drag`) con físicas inerciales de vuelo y disparo automático periódico.
- **Persistencia de Puntuaciones:** Tabla de puntuaciones anterior guardada de forma local y persistente usando **LocalStorage**.

*Para jugarlo, haz scroll hasta el final del portfolio o ejecuta el comando `play --mission` en la terminal del inicio.*

---

## 🚀 Despliegue en Cloudflare Pages

El despliegue está automatizado mediante **Cloudflare Pages** enlazado con la rama `main` de este repositorio. Cada `push` desencadena un despliegue automático en menos de 10 segundos en el servidor CDN de Cloudflare.

## Newsletter

La home incluye un formulario de suscripcion que guarda los registros en una base de datos de Notion independiente del inventario. El endpoint server-side usa el token de Notion sin exponerlo al navegador y evita duplicar emails activos.

Para activarlo:

1. Crea una base de datos nueva en Notion y comparte esa base con la integracion que usa el proyecto.
2. Anade `NEWSLETTER_DATABASE_ID` y `NEWSLETTER_NOTION_TOKEN` en las variables de entorno locales y en Cloudflare Pages. El token de newsletter debe pertenecer a una integracion con acceso a esa base; si no existe `NEWSLETTER_NOTION_TOKEN`, el endpoint usa como fallback `NOTION_TOKEN`. La columna principal de la base debe llamarse `Email` y ser de tipo Title; el endpoint creara las columnas que falten: Fecha suscripcion y Activo.
   El checkbox de consentimiento del formulario se valida antes de guardar, pero no se crea como columna independiente en Notion.
3. Antes de usarla en produccion, enlaza el formulario con tu aviso de privacidad y valora activar doble opt-in si vas a enviar comunicaciones comerciales.
