// Terminal typing animation
const sequences = [
  {
    cmd: 'cat profile.json',
    outputKey: 'terminal.profile'
  },
  {
    cmd: 'git log --oneline -3',
    outputKey: 'terminal.git'
  },
  {
    cmd: 'kubectl get pods --all-namespaces',
    outputKey: 'terminal.pods'
  },
  {
    cmd: 'play --mission',
    outputKey: 'terminal.mission'
  },
  {
    cmd: 'preowned --manage',
    outputKey: 'terminal.inventory'
  }
];

let seqIndex = 0;
let charIndex = 0;
let isTyping = false;
let outputVisible = false;

const cmdEl = document.getElementById('typed-cmd');
const outputEl = document.getElementById('terminal-output');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitUntilVisible() {
  while (document.hidden) await sleep(500);
}

async function typeSequence(seq) {
  // Clear
  cmdEl.textContent = '';
  outputEl.innerHTML = '';
  outputVisible = false;

  // Type command
  for (let i = 0; i < seq.cmd.length; i++) {
    await waitUntilVisible();
    cmdEl.textContent += seq.cmd[i];
    await sleep(55 + Math.random() * 35);
  }

  await sleep(350);
  await waitUntilVisible();

  // Show output
  outputEl.innerHTML = window.I18n ? window.I18n.t(seq.outputKey) : '';
  outputVisible = true;

  await sleep(3200);

  // Erase command
  while (cmdEl.textContent.length > 0) {
    await waitUntilVisible();
    cmdEl.textContent = cmdEl.textContent.slice(0, -1);
    await sleep(28);
  }

  outputEl.innerHTML = '';
  await sleep(500);
}

async function runLoop() {
  await sleep(800);
  while (true) {
    await waitUntilVisible();
    const seq = sequences[seqIndex % sequences.length];
    await typeSequence(seq);
    seqIndex++;
  }
}

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) {
  cmdEl.textContent = 'cat profile.json';
  outputEl.innerHTML = window.I18n ? window.I18n.t('terminal.profile') : '';
} else {
  runLoop();
}

// Smooth active nav link highlight on scroll
const sections = document.querySelectorAll('section[id], .section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(link => {
        link.style.color = '';
        const href = link.getAttribute('href');
        if (href === '#' + entry.target.id || (entry.target.id === 'play' && href === '/devtrek')) {
          link.style.color = 'var(--accent)';
        }
      });
    }
  });
}, { threshold: 0.35 });

sections.forEach(s => observer.observe(s));

// Fade-in on scroll
const fadeEls = document.querySelectorAll('.timeline-item, .stack-card, .contact-card, .cert-badge');

const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

fadeEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(16px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  fadeObserver.observe(el);
});

// ── RETRO ARCADE INTEGRATION (EASTER EGG) ───────────
let gameInstance = null;

function openGame() {
  const modal = document.getElementById('st-arcade-modal');
  if (!modal) return;
  modal.classList.remove('st-hidden');
  document.body.style.overflow = 'hidden';

  if (!gameInstance) {
    gameInstance = new window.DevGame(modal);
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
    window.location.href = '/devtrek';
  });
}

const outputBody = document.getElementById('terminal-output');
if (outputBody) {
  outputBody.addEventListener('click', (e) => {
    if (e.target.id === 'terminal-play-hint' || e.target.closest('#terminal-play-hint')) {
      window.location.href = '/devtrek';
    } else if (e.target.id === 'terminal-admin-hint' || e.target.closest('#terminal-admin-hint')) {
      window.location.href = '/login.html';
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
