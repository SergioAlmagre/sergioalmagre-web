// Auladex product showcase: vanilla port of the timeline in the app's
// HeroShowcase.jsx. The markup (showcase-markup.js) and the CSS are generated
// from the app; this file only drives them. Step N turns on data-s1..data-sN
// on the active scene and CSS transitions do the movement.
(() => {
  const host = document.querySelector("[data-auladex-showcase]");
  const markup = window.AuladexShowcaseMarkup;
  if (!host || !markup) return;

  const SCENES = [
    { id: "simulator", holds: [1700, 750, 650, 750, 4400] },
    { id: "progress", holds: [900, 1700, 1000, 4400] },
    { id: "tutor", holds: [900, 900, 1300, 1100, 4200] },
  ];
  const SCENE_FADE_MS = 800;
  const STAGE_WIDTH = 1137;
  const STEP_FLAGS = [1, 2, 3, 4];
  const CLOCK_START_SECONDS = 38 * 60 + 42;
  const CLOCK_MIN_SECONDS = 35 * 60;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lastStepOf = (sceneIndex) => SCENES[sceneIndex].holds.length - 1;

  let root = null;
  let scenes = [];
  let playback = { scene: 0, step: 0, leaving: null };
  let inView = false;
  let stepTimer = 0;
  let fadeTimer = 0;
  let clockTimer = 0;
  let clockSeconds = CLOCK_START_SECONDS;

  const isAnimating = () => inView && document.visibilityState !== "hidden" && !reducedMotion.matches;

  function formatClock(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
  }

  function paint() {
    if (!root) return;
    scenes.forEach((scene, index) => {
      const phase = index === playback.scene ? "active" : index === playback.leaving ? "leaving" : "idle";
      const step = phase === "active" ? playback.step : phase === "leaving" ? lastStepOf(index) : 0;
      scene.dataset.phase = phase;
      STEP_FLAGS.forEach((flag) => { scene.dataset[`s${flag}`] = String(step >= flag); });
    });
    root.dataset.animating = String(isAnimating());
  }

  function paintClock() {
    // The clock chip is an icon followed by a text node with the time.
    root?.querySelectorAll(".hs-clock").forEach((chip) => {
      if (chip.lastChild?.nodeType === Node.TEXT_NODE) chip.lastChild.textContent = formatClock(clockSeconds);
    });
  }

  function advance() {
    if (playback.step < lastStepOf(playback.scene)) {
      playback = { ...playback, step: playback.step + 1 };
    } else {
      // The outgoing scene keeps its final state while it fades, then resets.
      playback = { scene: (playback.scene + 1) % SCENES.length, step: 0, leaving: playback.scene };
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => {
        playback = { ...playback, leaving: null };
        paint();
      }, SCENE_FADE_MS);
    }
    paint();
    schedule();
  }

  function schedule() {
    window.clearTimeout(stepTimer);
    window.clearInterval(clockTimer);
    paint();
    if (!isAnimating()) return;
    stepTimer = window.setTimeout(advance, SCENES[playback.scene].holds[playback.step]);
    if (SCENES[playback.scene].id === "simulator") {
      clockTimer = window.setInterval(() => {
        clockSeconds = clockSeconds <= CLOCK_MIN_SECONDS ? CLOCK_START_SECONDS : clockSeconds - 1;
        paintClock();
      }, 1000);
    }
  }

  function applyScale() {
    if (root) root.style.setProperty("--hs-scale", String(root.clientWidth / STAGE_WIDTH));
  }

  function mount() {
    const locale = window.I18n?.locale || document.documentElement.lang || "en";
    host.innerHTML = markup[locale] || markup.en;
    root = host.querySelector(".hs");
    scenes = [...root.querySelectorAll(".hs-scene")];
    applyScale();
    paintClock();
    schedule();
  }

  function resetForReducedMotion() {
    if (reducedMotion.matches) playback = { scene: 0, step: lastStepOf(0), leaving: null };
    schedule();
  }

  // The stage is ~760 nodes: mount it only when the card gets close to view.
  const mountObserver = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    mountObserver.disconnect();
    if (reducedMotion.matches) playback = { scene: 0, step: lastStepOf(0), leaving: null };
    mount();
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    }, { threshold: 0.15 }).observe(host);
    if (typeof ResizeObserver === "function") new ResizeObserver(applyScale).observe(host);
  }, { rootMargin: "300px 0px" });
  mountObserver.observe(host);

  document.addEventListener("visibilitychange", schedule);
  reducedMotion.addEventListener("change", resetForReducedMotion);
  window.addEventListener("languagechange", () => { if (root) mount(); });
})();
