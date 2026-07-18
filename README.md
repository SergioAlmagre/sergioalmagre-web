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
