(() => {
  const STORAGE_KEY = "sergio-almagre-theme";
  const DEFAULT_THEME = "light";
  const THEMES = new Set(["light", "dark"]);
  const root = document.documentElement;

  function readStoredTheme() {
    try {
      const theme = localStorage.getItem(STORAGE_KEY);
      return THEMES.has(theme) ? theme : null;
    } catch (_) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {
      // The theme still works when storage is unavailable.
    }
  }

  function preferredTheme() {
    return readStoredTheme() || DEFAULT_THEME;
  }

  function themeCopy() {
    const pathIsEnglish = /^\/en(?:\/|$)/.test(window.location.pathname);
    const pathIsSpanish = /^\/es(?:\/|$)/.test(window.location.pathname);
    const isEnglish = pathIsEnglish || (!pathIsSpanish && root.lang === "en");

    return isEnglish
      ? { light: "light", dark: "dark", toLight: "Switch to light mode", toDark: "Switch to dark mode" }
      : { light: "claro", dark: "oscuro", toLight: "Cambiar a modo claro", toDark: "Cambiar a modo oscuro" };
  }

  function themeIcon(theme) {
    if (theme === "light") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.5"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path>
        </svg>`;
    }

    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 15.35A8.5 8.5 0 0 1 8.65 4 8.5 8.5 0 1 0 20 15.35Z"></path>
      </svg>`;
  }

  function updateThemeAssets(theme) {
    const attribute = theme === "light" ? "themeSrcLight" : "themeSrcDark";

    document.querySelectorAll("[data-theme-src-light][data-theme-src-dark]").forEach((image) => {
      const nextSource = image.dataset[attribute];
      if (nextSource && image.getAttribute("src") !== nextSource) {
        image.setAttribute("src", nextSource);
      }
    });

    const favicon = document.getElementById("theme-favicon");
    if (favicon) {
      favicon.href = "/assets/brand/favicon.svg?v=2";
    }

    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement("meta");
      themeColor.name = "theme-color";
      document.head.appendChild(themeColor);
    }
    themeColor.content = theme === "light" ? "#F5F5F2" : "#0A0A0F";
  }

  function updateToggle(theme) {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    const copy = themeCopy();
    const nextTheme = theme === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-checked", String(theme === "dark"));
    toggle.setAttribute("aria-label", nextTheme === "light" ? copy.toLight : copy.toDark);
    toggle.title = nextTheme === "light" ? copy.toLight : copy.toDark;
    toggle.querySelector(".theme-toggle__label").textContent = copy[theme];
    toggle.querySelector(".theme-toggle__glyph").innerHTML = themeIcon(theme);
  }

  function applyTheme(theme, { persist = false, animate = false } = {}) {
    const nextTheme = THEMES.has(theme) ? theme : preferredTheme();

    if (animate) {
      root.classList.add("theme-changing");
      window.setTimeout(() => root.classList.remove("theme-changing"), 320);
    }

    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    updateThemeAssets(nextTheme);
    updateToggle(nextTheme);

    if (persist) storeTheme(nextTheme);
  }

  function mountToggle() {
    if (document.body?.dataset.themeToggle === "off") {
      updateThemeAssets(root.dataset.theme);
      return;
    }

    const nav = document.querySelector(".nav");
    const terminalBar = document.querySelector(".terminal .terminal-bar, .login-terminal .terminal-bar");
    if ((!nav && !terminalBar) || document.getElementById("theme-toggle")) {
      updateThemeAssets(root.dataset.theme);
      return;
    }

    const toggle = document.createElement("button");
    toggle.id = "theme-toggle";
    toggle.className = `theme-toggle st-ignore-canvas${terminalBar ? " theme-toggle--terminal" : ""}`;
    toggle.type = "button";
    toggle.setAttribute("role", "switch");
    toggle.innerHTML = `
      <span class="theme-toggle__terminal" aria-hidden="true">
        <span class="theme-toggle__prompt">&gt;_</span>
        <span class="theme-toggle__label"></span>
      </span>
      <span class="theme-toggle__glyph" aria-hidden="true"></span>`;

    if (terminalBar) {
      terminalBar.appendChild(toggle);
    } else {
      const insertionPoint = nav.querySelector(".nav-hamburger, .nav-links");
      if (insertionPoint) nav.insertBefore(toggle, insertionPoint);
      else nav.appendChild(toggle);
    }

    toggle.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, { persist: true, animate: true });
    });

    updateThemeAssets(root.dataset.theme);
    updateToggle(root.dataset.theme);
  }

  applyTheme(preferredTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
  } else {
    mountToggle();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) applyTheme(preferredTheme(), { animate: true });
  });
})();
