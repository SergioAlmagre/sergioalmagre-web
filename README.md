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

## Reservas

Desde el dashboard se puede reservar un articulo a un contacto de Notion (existente o nuevo), indicando unidades y precio acordado por unidad. Una reserva se puede cancelar o convertir en venta, lo que descuenta el stock. El catalogo publico muestra "Reservado" cuando no quedan unidades libres y nunca expone los datos del contacto ni el precio acordado.

Para activarlo:

1. En la base `Contactos` de Notion, abre `...` > Conexiones y anade la integracion de `NOTION_TOKEN` (la misma que usa el inventario). Necesita permisos de lectura, actualizacion e insercion de contenido.
2. La base se localiza por su nombre. Si se llama de otra forma o hay varias, define `NOTION_CONTACTS_DATABASE_ID` en local y en Cloudflare Pages.

Las reservas se guardan en la propia base de inventario. Con la primera reserva se crean las columnas Reservado a, Estado Reserva, Unidades Reservadas, Precio Acordado (por unidad), Precio Referencia, Fecha Reserva y las formulas Descuento € y Descuento %. El descuento se calcula sobre el precio de venta que tenia el articulo al reservarlo. En `Contactos` se detectan el nombre (columna de titulo), el telefono y el email.

Como se guardan en columnas del inventario:

- Cada fila admite una sola reserva activa. Para reservar a varias personas unidades del mismo producto, deben estar en filas distintas.
- Una reserva cuenta como activa si `Estado Reserva` es `Reservado` y `Unidades Reservadas` es mayor que 0.
- Al cancelar se vacian las columnas de reserva. Al vender se conservan con estado `Vendido`, hasta que esa fila reciba una nueva reserva, que las sobrescribe.

El catalogo publico tiene cache, asi que los cambios pueden tardar alrededor de un minuto en verse.

## Ofertas

En el detalle de cada articulo del catalogo hay un boton "Hacer una oferta". La oferta (precio por unidad, unidades, nombre, email, telefono y mensaje) se guarda en la base `Ofertas` de Notion y te llega un aviso por email. En el dashboard, la pestana Ofertas muestra todas en una tabla con filtros por estado, articulo y texto. Desde ahi se acepta, rechaza o contraoferta, con vista previa del correo (tabla en HTML, en el idioma del ofertante) antes de enviarlo.

Para activarlo:

1. Crea en Notion una base de datos vacia llamada `Ofertas` y anade la integracion de `NOTION_TOKEN` en `...` > Conexiones. Las columnas se crean solas. Si se llama de otra forma, define `NOTION_OFFERS_DATABASE_ID`.
2. Crea una cuenta en [Resend](https://resend.com), anade el dominio `sergioalmagre.com` y crea en el DNS de Cloudflare los registros que indique Resend. Despues crea una API key con permiso de envio.
3. Define estas variables en `.dev.vars` y en Cloudflare Pages (Settings > Variables and Secrets, como secretos):
   - `RESEND_API_KEY`: la API key de Resend.
   - `OFFERS_NOTIFY_EMAIL`: tu correo, donde recibes los avisos. Las respuestas de los ofertantes llegan aqui.
   - `OFFERS_EMAIL_FROM` (opcional): remitente, por defecto `Sergio Almagre <info@sergioalmagre.com>`. Debe ser del dominio verificado.
   - `SITE_URL` (opcional): `https://www.sergioalmagre.com`, para que los enlaces de los correos no apunten a una URL de previsualizacion.

Sin `RESEND_API_KEY` las ofertas se guardan y se ven en el dashboard, pero no hay avisos ni envio de respuestas.

Proteccion: campo trampa para bots, tiempo minimo de rellenado, maximo 5 ofertas por email en 24 horas y una sola oferta pendiente por email y articulo. No se aceptan ofertas para articulos reservados por completo.

## Newsletter

La home incluye un formulario de suscripcion que guarda los registros en una base de datos de Notion independiente del inventario. El endpoint server-side usa el token de Notion sin exponerlo al navegador y evita duplicar emails activos.

Para activarlo:

1. Crea una base de datos nueva en Notion y comparte esa base con la integracion que usa el proyecto.
2. Anade `NEWSLETTER_DATABASE_ID` y `NEWSLETTER_NOTION_TOKEN` en las variables de entorno locales y en Cloudflare Pages. El token de newsletter debe pertenecer a una integracion con acceso a esa base; si no existe `NEWSLETTER_NOTION_TOKEN`, el endpoint usa como fallback `NOTION_TOKEN`. La columna principal de la base debe llamarse `Email` y ser de tipo Title; el endpoint creara las columnas que falten: Fecha suscripcion y Activo.
   El checkbox de consentimiento del formulario se valida antes de guardar, pero no se crea como columna independiente en Notion.
3. Antes de usarla en produccion, enlaza el formulario con tu aviso de privacidad y valora activar doble opt-in si vas a enviar comunicaciones comerciales.
