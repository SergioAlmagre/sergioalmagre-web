// Interactive command center
const terminalForm = document.getElementById('terminal-form');
const terminalInput = document.getElementById('terminal-input');
const terminalOutput = document.getElementById('terminal-output');
const commandCenter = document.getElementById('command-center');
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const commandHistory = [];
const commandNames = ['help', 'about', 'projects', 'experience', 'stack', 'play', 'preowned', 'contact', 'github', 'theme toggle', 'clear'];
let historyIndex = 0;

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitUntilVisible() {
  while (document.hidden) await sleep(300);
}

function terminalText(key, vars = {}) {
  return window.I18n?.t(key, vars) || key;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function appendTerminalEntry(command, resultHtml) {
  if (!terminalOutput) return;

  const entry = document.createElement('div');
  entry.className = 'terminal-entry';

  if (command) {
    const commandLine = document.createElement('div');
    commandLine.className = 'terminal-entry__command';
    commandLine.textContent = command;
    entry.appendChild(commandLine);
  }

  const result = document.createElement('div');
  result.className = 'terminal-entry__result';
  result.innerHTML = resultHtml;
  entry.appendChild(result);
  terminalOutput.appendChild(entry);

  while (terminalOutput.children.length > 6) terminalOutput.firstElementChild?.remove();
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function commandButton(command, descriptionKey) {
  return `<button type="button" class="terminal-command-link" data-terminal-command="${command}"><span>${command}</span><small>${escapeHtml(terminalText(descriptionKey))}</small></button>`;
}

function helpOutput() {
  return `<span class="comment">${escapeHtml(terminalText('terminal.helpIntro'))}</span>
    <div class="terminal-command-list">
      ${commandButton('about', 'terminal.helpAbout')}
      ${commandButton('projects', 'terminal.helpProjects')}
      ${commandButton('experience', 'terminal.helpExperience')}
      ${commandButton('stack', 'terminal.helpStack')}
      ${commandButton('play', 'terminal.helpPlay')}
      ${commandButton('contact', 'terminal.helpContact')}
      ${commandButton('theme toggle', 'terminal.helpTheme')}
      ${commandButton('clear', 'terminal.helpClear')}
    </div>`;
}

function scrollToSection(sectionId, command) {
  appendTerminalEntry(command, terminalText('terminal.navigating', { target: sectionId }));
  window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }), 180);
}

function navigateTo(target, command, label) {
  appendTerminalEntry(command, terminalText('terminal.navigating', { target: label }));
  window.setTimeout(() => {
    window.location.href = window.I18n?.url(target) || target;
  }, reducedMotion ? 0 : 220);
}

function runTerminalCommand(rawCommand) {
  if (!terminalInput || !terminalOutput) return;

  const command = rawCommand.trim().replace(/\s+/g, ' ');
  if (!command) return;

  const normalized = command.toLocaleLowerCase('es');
  commandHistory.push(command);
  historyIndex = commandHistory.length;

  if (['clear', 'cls', 'limpiar'].includes(normalized)) {
    terminalOutput.innerHTML = '';
    terminalInput.value = '';
    return;
  }

  if (['help', 'ayuda', '?'].includes(normalized)) {
    appendTerminalEntry(command, helpOutput());
  } else if (['about', 'whoami', 'perfil', 'cat profile.json'].includes(normalized)) {
    appendTerminalEntry(command, terminalText('terminal.profile'));
  } else if (['projects', 'project', 'proyectos', 'work'].includes(normalized)) {
    scrollToSection('projects', command);
  } else if (['experience', 'experiencia', 'career'].includes(normalized)) {
    scrollToSection('experience', command);
  } else if (['stack', 'skills', 'habilidades'].includes(normalized)) {
    appendTerminalEntry(command, terminalText('terminal.stackSummary'));
    window.setTimeout(() => document.getElementById('stack')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }), 320);
  } else if (['play', 'jugar', 'play --mission'].includes(normalized)) {
    navigateTo('/devtrek', command, 'Dev Enterprise');
  } else if (['login', 'sudo login'].includes(normalized)) {
    navigateTo('/login.html', command, 'admin auth');
  } else if (['preowned', 'pre-owned', 'catalog', 'catalogo', 'catálogo'].includes(normalized)) {
    navigateTo('/preowned.html', command, 'pre-owned');
  } else if (['preowned --manage', 'sudo preowned --manage'].includes(normalized)) {
    navigateTo('/login.html', command, 'inventory admin');
  } else if (['contact', 'contacto', 'email'].includes(normalized)) {
    scrollToSection('contact', command);
  } else if (normalized === 'github') {
    appendTerminalEntry(command, terminalText('terminal.navigating', { target: 'GitHub' }));
    window.open('https://github.com/SergioAlmagre', '_blank', 'noopener,noreferrer');
  } else if (normalized === 'theme' || normalized === 'tema') {
    appendTerminalEntry(command, terminalText('terminal.themeUsage'));
  } else if (normalized.startsWith('theme ') || normalized.startsWith('tema ')) {
    const requested = normalized.split(' ')[1];
    const theme = requested === 'claro' ? 'light' : requested === 'oscuro' ? 'dark' : requested;
    if (theme === 'toggle' || theme === 'cambiar') window.SiteTheme?.toggle();
    else if (theme === 'light' || theme === 'dark') window.SiteTheme?.set(theme);
    else {
      appendTerminalEntry(command, terminalText('terminal.themeUsage'));
      terminalInput.value = '';
      return;
    }
    appendTerminalEntry(command, terminalText('terminal.themeChanged', { theme: window.SiteTheme?.get() || theme }));
  } else {
    appendTerminalEntry(command, terminalText('terminal.unknown', { command: escapeHtml(command) }));
  }

  terminalInput.value = '';
}

async function initializeTerminal() {
  if (!terminalInput || !terminalOutput) return;

  const introCommand = 'cat profile.json';
  terminalInput.readOnly = true;

  if (!reducedMotion) {
    await sleep(600);
    for (const character of introCommand) {
      await waitUntilVisible();
      terminalInput.value += character;
      await sleep(35 + Math.random() * 30);
    }
    await sleep(220);
  }

  terminalInput.value = '';
  appendTerminalEntry(introCommand, `${terminalText('terminal.profile')}\n\n${terminalText('terminal.ready')}`);
  terminalInput.readOnly = false;
}

terminalForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  runTerminalCommand(terminalInput.value);
});

terminalInput?.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    terminalInput.value = commandHistory[historyIndex] || '';
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    historyIndex = Math.min(commandHistory.length, historyIndex + 1);
    terminalInput.value = commandHistory[historyIndex] || '';
  } else if (event.key === 'Tab') {
    const candidate = commandNames.find((name) => name.startsWith(terminalInput.value.trim().toLowerCase()));
    if (candidate) {
      event.preventDefault();
      terminalInput.value = candidate;
    }
  } else if (event.key === 'Escape') {
    terminalInput.blur();
  }
});

document.addEventListener('click', (event) => {
  const shortcut = event.target.closest('[data-terminal-command]');
  if (shortcut) runTerminalCommand(shortcut.dataset.terminalCommand);
});

commandCenter?.addEventListener('click', (event) => {
  if (!event.target.closest('button, a, input')) terminalInput?.focus();
});

initializeTerminal();

// Auladex case-study tabs and metric reveal
function animateCaseStudyMetrics(panel) {
  panel.querySelectorAll('[data-count]').forEach((metric) => {
    if (metric.dataset.countAnimated === 'true') return;
    metric.dataset.countAnimated = 'true';

    const target = Number(metric.dataset.count);
    const locale = window.I18n?.locale || document.documentElement.lang || 'en';
    const formatter = new Intl.NumberFormat(locale);
    if (reducedMotion || !Number.isFinite(target)) {
      metric.textContent = formatter.format(target);
      return;
    }

    const duration = 760;
    const startedAt = performance.now();
    const update = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      metric.textContent = formatter.format(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  });
}

document.querySelectorAll('[data-case-study]').forEach((caseStudy) => {
  const tabs = [...caseStudy.querySelectorAll('[data-case-tab]')];
  const panels = [...caseStudy.querySelectorAll('[data-case-panel]')];
  if (!tabs.length || !panels.length) return;

  caseStudy.classList.add('is-enhanced');

  function activateCaseTab(name, { focus = false } = {}) {
    tabs.forEach((tab) => {
      const active = tab.dataset.caseTab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });

    panels.forEach((panel) => {
      const active = panel.dataset.casePanel === name;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
      if (active && name === 'scale') animateCaseStudyMetrics(panel);
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateCaseTab(tab.dataset.caseTab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activateCaseTab(tabs[nextIndex].dataset.caseTab, { focus: true });
    });
  });

  activateCaseTab(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true')?.dataset.caseTab || tabs[0].dataset.caseTab);
});

// Active navigation follows the section that has passed the fixed header.
// It also supports links that open another page but represent a section on the home page.
const navLinks = [...document.querySelectorAll('.nav-links a')];

function sectionIdForLink(link) {
  if (link.dataset.navSection) return link.dataset.navSection;

  const href = link.getAttribute('href') || '';
  if (href.startsWith('#')) return href.slice(1);
  if (href === '/devtrek') return 'play';

  return null;
}

const navSectionLinks = navLinks
  .map((link) => ({ link, sectionId: sectionIdForLink(link) }))
  .filter(({ sectionId }) => sectionId);

const trackedSections = [...document.querySelectorAll('section[id]')]
  .filter((section) => navSectionLinks.some(({ sectionId }) => sectionId === section.id));

function setActiveNav(sectionId) {
  navSectionLinks.forEach(({ link, sectionId: linkSectionId }) => {
    const isActive = linkSectionId === sectionId;
    link.classList.toggle('is-active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function updateActiveNav() {
  const headerHeight = document.querySelector('.nav')?.offsetHeight || 0;
  const marker = window.scrollY + Math.max(headerHeight + 24, window.innerHeight * 0.42);
  let activeSectionId = trackedSections[0]?.id;

  trackedSections.forEach((section) => {
    if (section.offsetTop <= marker) activeSectionId = section.id;
  });

  const isAtPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  if (isAtPageEnd) activeSectionId = trackedSections.at(-1)?.id || activeSectionId;

  if (activeSectionId) setActiveNav(activeSectionId);
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
window.addEventListener('resize', updateActiveNav);
updateActiveNav();

// Progressive reveal: content remains visible when JS or IntersectionObserver is unavailable.
const revealElements = [...document.querySelectorAll('.project-card, .timeline-item, .stack-card, .contact-card, .cert-badge, .arcade-card, .preowned-access')];

if (!reducedMotion && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

  revealElements.forEach((element, index) => {
    element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 55}ms`);
    revealObserver.observe(element);
  });
}

// ── RETRO ARCADE INTEGRATION (EASTER EGG) ───────────
let gameInstance = null;
let gameScriptPromise = null;

function loadGameScript() {
  if (window.DevGame) return Promise.resolve();
  if (gameScriptPromise) return gameScriptPromise;

  gameScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'game.js?v=5';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the game module.'));
    document.head.appendChild(script);
  });

  return gameScriptPromise;
}

async function openGame() {
  const modal = document.getElementById('st-arcade-modal');
  if (!modal) return;
  modal.classList.remove('st-hidden');
  document.body.style.overflow = 'hidden';

  if (!gameInstance) {
    try {
      await loadGameScript();
      gameInstance = new window.DevGame(modal);
    } catch (error) {
      console.error(error);
      closeGame();
    }
  }
}

function closeGame() {
  const modal = document.getElementById('st-arcade-modal');
  if (!modal) return;
  modal.classList.add('st-hidden');
  document.body.style.overflow = '';

  if (gameInstance) {
    gameInstance.destroy();
    gameInstance = null;
  }
}

// Hook up triggers
const triggerBtn = document.getElementById('terminal-game-trigger');
if (triggerBtn) {
  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openGame();
  });
}

const launchBtn = document.querySelector('.st-btn-launch-game');
if (launchBtn) {
  launchBtn.addEventListener('click', (e) => {
        window.location.href = window.I18n?.url('/devtrek') || '/devtrek';
  });
}

const outputBody = document.getElementById('terminal-output');
if (outputBody) {
  outputBody.addEventListener('click', (e) => {
    if (e.target.id === 'terminal-play-hint' || e.target.closest('#terminal-play-hint')) {
      window.location.href = window.I18n?.url('/devtrek') || '/devtrek';
    } else if (e.target.id === 'terminal-admin-hint' || e.target.closest('#terminal-admin-hint')) {
      window.location.href = window.I18n?.url('/login.html') || '/login.html';
    }
  });
}

const closeBtn = document.getElementById('st-modal-close-btn');
if (closeBtn) {
  closeBtn.addEventListener('click', closeGame);
}

// Esc key helper
window.addEventListener('keydown', (e) => {
  const modal = document.getElementById('st-arcade-modal');
  if (modal && !modal.classList.contains('st-hidden')) {
    if (e.key === 'Escape') {
      if (gameInstance && (gameInstance.phase === 'menu' || gameInstance.phase === 'gameover' || gameInstance.phase === 'scores')) {
        closeGame();
      }
    }
  }
});
