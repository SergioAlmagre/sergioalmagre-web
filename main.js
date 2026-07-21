// Terminal typing animation
const sequences = [
  {
    cmd: 'cat profile.json',
    output: `<span class="comment">{</span>
  <span class="key">"name"</span>:     <span class="val">"Sergio Almagre"</span>,
  <span class="key">"role"</span>:     <span class="val">"Backend Developer"</span>,
  <span class="key">"stack"</span>:    <span class="val2">["C#", ".NET", "Azure", "Terraform"]</span>,
  <span class="key">"open_to"</span>: <span class="val">"backend / cloud / automation"</span>
<span class="comment">}</span>`
  },
  {
    cmd: 'git log --oneline -3',
    output: `<span class="val">a3f2c1d</span> <span class="comment">feat: implement monitoring KPI pipeline</span>
<span class="val">8e91b0a</span> <span class="comment">infra: terraform modules for azure deploy</span>
<span class="val">c54d7f3</span> <span class="comment">refactor: clean architecture migration</span>`
  },
  {
    cmd: 'kubectl get pods --all-namespaces',
    output: `<span class="comment">NAMESPACE     NAME                    STATUS</span>
<span class="val">production</span>    api-backend-7d9f        <span class="val">Running</span>
<span class="val">monitoring</span>    kpi-collector-2xk9      <span class="val">Running</span>
<span class="val">infra</span>         cicd-runner-p8s1        <span class="val">Running</span>`
  },
  {
    cmd: 'play --mission',
    output: `<span class="val">INITIALIZING MISSION SIMULATOR...</span>
<span class="comment">Ship:   USS Dev Enterprise (NCC-1701)</span>
<span class="comment">Status: Tactical patrol ready.</span>
<span class="val" id="terminal-play-hint" style="color: #00d4ff; text-shadow: 0 0 10px rgba(0, 212, 255, 0.4); cursor: pointer; text-decoration: underline;">[ CLICK HERE OR RUN 'play' TO PILOT SHIP ]</span>`
  },
  {
    cmd: 'preowned --manage',
    output: `<span class="val">CONNECTING TO PRE-OWNED DATABASE...</span>
<span class="comment">Status: Online. database loaded.</span>
<span class="comment">System: Edge worker ready.</span>
<span class="val2" id="terminal-admin-hint" style="color: #a78bfa; text-shadow: 0 0 10px rgba(167, 139, 250, 0.4); cursor: pointer; text-decoration: underline;">[ CLICK HERE TO MANAGE INVENTORY ]</span>`
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

async function typeSequence(seq) {
  // Clear
  cmdEl.textContent = '';
  outputEl.innerHTML = '';
  outputVisible = false;

  // Type command
  for (let i = 0; i < seq.cmd.length; i++) {
    cmdEl.textContent += seq.cmd[i];
    await sleep(55 + Math.random() * 35);
  }

  await sleep(350);

  // Show output
  outputEl.innerHTML = seq.output;
  outputVisible = true;

  await sleep(3200);

  // Erase command
  while (cmdEl.textContent.length > 0) {
    cmdEl.textContent = cmdEl.textContent.slice(0, -1);
    await sleep(28);
  }

  outputEl.innerHTML = '';
  await sleep(500);
}

async function runLoop() {
  await sleep(800);
  while (true) {
    const seq = sequences[seqIndex % sequences.length];
    await typeSequence(seq);
    seqIndex++;
  }
}

runLoop();

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
