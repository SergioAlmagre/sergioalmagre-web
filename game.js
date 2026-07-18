// Geometría y efectos de la nave A.L.T.I.A. Enterprise
function drawEnterpriseThrust(ctx, intensity) {
  if (intensity <= 0) return;
  ctx.save();
  const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const scale = isMobile ? 0.65 : 0.85;
  ctx.scale(scale, scale);

  const drawFlare = (yOffset) => {
    const cx = -92;
    const radiusX = 20 * intensity;
    const radiusY = 8 * intensity;
    const gradient = ctx.createRadialGradient(cx, yOffset, 0, cx, yOffset, radiusX);
    gradient.addColorStop(0, `rgba(224, 242, 254, ${0.9 * intensity})`);
    gradient.addColorStop(0.45, `rgba(59, 130, 246, ${0.6 * intensity})`);
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(cx - radiusX * 0.3, yOffset, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  drawFlare(-35);
  drawFlare(35);
  ctx.restore();
}

function drawEnterpriseHull(ctx) {
  ctx.save();
  const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const scale = isMobile ? 0.65 : 0.85;
  ctx.scale(scale, scale);

  const hullColor = '#e2e8f0';
  const hullShadow = '#94a3b8';
  const hullDark = '#64748b';
  const nacelleGlow = '#3b82f6';
  const bussardGlow = '#ef4444';

  // Soportes de las nacelas (pylons)
  ctx.fillStyle = hullDark;
  ctx.beginPath();
  ctx.moveTo(-20, -10);
  ctx.lineTo(-65, -35);
  ctx.lineTo(-45, -35);
  ctx.lineTo(-5, -10);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-20, 10);
  ctx.lineTo(-65, 35);
  ctx.lineTo(-45, 35);
  ctx.lineTo(-5, 10);
  ctx.fill();

  // Nacelas de curvatura
  const drawNacelle = (yOffset) => {
    ctx.fillStyle = hullShadow;
    ctx.beginPath();
    ctx.roundRect(-85, yOffset - 8, 80, 16, 8);
    ctx.fill();

    ctx.shadowBlur = 15;
    ctx.shadowColor = nacelleGlow;
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(-65, yOffset - 4, 45, 8);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#334155';
    ctx.fillRect(-85, yOffset - 6, 15, 12);

    ctx.shadowBlur = 15;
    ctx.shadowColor = bussardGlow;
    ctx.fillStyle = bussardGlow;
    ctx.beginPath();
    ctx.arc(-5, yOffset, 7.5, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  drawNacelle(-35);
  drawNacelle(35);

  // Casco secundario
  ctx.fillStyle = hullColor;
  ctx.beginPath();
  ctx.ellipse(-30, 0, 35, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 10;
  ctx.shadowColor = '#06b6d4';
  ctx.fillStyle = '#22d3ee';
  ctx.beginPath();
  ctx.ellipse(3, 0, 4, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Cuello de interconexión
  ctx.fillStyle = hullShadow;
  ctx.beginPath();
  ctx.moveTo(-15, -8);
  ctx.lineTo(20, -15);
  ctx.lineTo(20, 15);
  ctx.lineTo(-15, 8);
  ctx.fill();

  // Platillo (casco primario)
  ctx.fillStyle = hullColor;
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(25, 0, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Cúpula del puente
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(25, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hullShadow;
  ctx.beginPath();
  ctx.arc(25, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  // Motores de impulso
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ef4444';
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-23, -8, 4, 16);
  ctx.shadowBlur = 0;

  // Letras D.E.V.
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 8px Courier New';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(32, -20);
  ctx.fillText('D.E.V.', 0, 0);
  ctx.restore();

  // Ventanas perimetrales
  ctx.strokeStyle = hullShadow;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(25, 0, 45, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

// Configuración general del juego
const GAME_CONFIG = {
  friction: 0.994,
  thrustPower: 0.15,
  maxSpeed: 7,
  maxShield: 100,
  meteorDamage: 20,
  superMeteorDamage: 45,
  enemyLaserDamage: 15,
  baseSpawnRate: 1800,
  itemSpawnRate: 8500,
  enemySpawnRate: 7000,
};

const THREAT_LEVELS = [
  { key: 'VERDE', min: 0, color: '#22c55e', status: 'CONDICIÓN VERDE', label: 'Amenaza: baja', multiplier: 1.0 },
  { key: 'AMARILLA', min: 100, color: '#eab308', status: 'CONDICIÓN AMARILLA', label: 'Amenaza: moderada', multiplier: 1.2 },
  { key: 'NARANJA', min: 250, color: '#f97316', status: 'CONDICIÓN NARANJA', label: 'Amenaza: elevada (súper meteoros)', multiplier: 1.45 },
  { key: 'ROJA', min: 500, color: '#dc2626', status: 'CONDICIÓN ROJA', label: 'Amenaza: crítica', multiplier: 1.7 },
  { key: 'VIOLETA', min: 850, color: '#9333ea', status: 'CONDICIÓN VIOLETA', label: 'Amenaza: extrema (zona apocalíptica)', multiplier: 2.1 },
  { key: 'NEGRA', min: 1200, color: '#38bdf8', status: 'CONDICIÓN NEGRA', label: 'Amenaza: singularidad / invasión activa', multiplier: 2.6 },
];

function threatLevelForScore(score) {
  let current = THREAT_LEVELS[0];
  for (const level of THREAT_LEVELS) {
    if (score >= level.min) current = level;
  }
  return current;
}

function threatLevelInfo(key) {
  return THREAT_LEVELS.find((l) => l.key === key) ?? THREAT_LEVELS[0];
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPlayedAt(iso) {
  try {
    return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

// Claves de LocalStorage
const SCORES_STORAGE_KEY = 'dev:scores-history';

// Clases de entidades del juego
class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class PhaserBeam {
  constructor(startX, startY, angle, isSuper = false, lvl = 0) {
    this.startX = startX;
    this.startY = startY;
    this.angle = angle;
    this.isSuper = isSuper;
    this.lvl = lvl;

    this.speed = isSuper ? 15 : 13;
    this.length = isSuper ? 16 + lvl * 1.5 : 15;
    this.x = startX;
    this.y = startY;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.life = isSuper ? 70 + lvl * 2 : 65;

    this.damage = 1;
    this.color = '#fca5a5';
    this.glowColor = '#ef4444';
    this.lineWidth = 4;

    if (isSuper && lvl >= 1) {
      if (lvl <= 5) {
        const levelConfigs = [
          { core: '#a5f3fc', glow: '#06b6d4', width: 4.5 },
          { core: '#99f6e4', glow: '#0d9488', width: 5.0 },
          { core: '#a7f3d0', glow: '#10b981', width: 5.5 },
          { core: '#fef08a', glow: '#ca8a04', width: 6.0 },
          { core: '#ffedd5', glow: '#ea580c', width: 6.5 },
        ];
        const cfg = levelConfigs[lvl - 1];
        this.color = cfg.core;
        this.glowColor = cfg.glow;
        this.lineWidth = cfg.width;
        this.damage = 1;
      } else {
        const advancedConfigs = {
          6: { core: '#fbcfe8', glow: '#db2777', width: 7.5, dmg: 2 },
          7: { core: '#e9d5ff', glow: '#9333ea', width: 8.5, dmg: 3 },
          8: { core: '#fca5a5', glow: '#dc2626', width: 9.5, dmg: 4 },
          9: { core: '#ffffff', glow: '#8b5cf6', width: 11.5, dmg: 5 },
        };
        const cfg = advancedConfigs[lvl];
        this.color = cfg.core;
        this.glowColor = cfg.glow;
        this.lineWidth = cfg.width;
        this.damage = cfg.dmg ?? 1;
      }
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = this.isSuper ? 12 + this.lvl * 2.5 : 15;
    ctx.shadowColor = this.glowColor;

    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, this.lineWidth / 2.5);
    ctx.stroke();

    ctx.restore();
  }
}

class EnemyLaser {
  constructor(startX, startY, targetX, targetY) {
    this.x = startX;
    this.y = startY;
    this.angle = Math.atan2(targetY - startY, targetX - startX);
    this.speed = 8;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.radius = 4;
    this.life = 120;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#e11d48';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class AtomicBlast {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = Math.hypot(width, height) * 1.2;
    this.speed = 12;
    this.active = true;
  }
  update() {
    this.radius += this.speed;
    if (this.radius >= this.maxRadius) this.active = false;
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#22c55e';

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(74, 222, 128, 0.08)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Meteor {
  constructor(isSuper, width, height, difficultyMultiplier) {
    this.isSuper = isSuper;
    this.radius = isSuper ? Math.random() * 15 + 40 : Math.random() * 18 + 14;
    this.hp = isSuper ? 5 : 1;
    this.maxHp = this.hp;
    this.damageFlash = 0;

    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      this.x = -this.radius;
      this.y = Math.random() * height;
    } else if (side === 1) {
      this.x = width + this.radius;
      this.y = Math.random() * height;
    } else if (side === 2) {
      this.x = Math.random() * width;
      this.y = -this.radius;
    } else {
      this.x = Math.random() * width;
      this.y = height + this.radius;
    }

    const angle = Math.atan2(height / 2 - this.y, width / 2 - this.x) + (Math.random() - 0.5) * 0.5;
    const speed = (isSuper ? Math.random() * 0.8 + 0.6 : Math.random() * 1.5 + 0.6) * difficultyMultiplier;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.angle = 0;
    this.rotSpeed = (Math.random() - 0.5) * (isSuper ? 0.012 : 0.035);

    this.points = [];
    const stepCount = isSuper ? 12 : 8;
    for (let i = 0; i < stepCount; i++) {
      const stepAngle = (i / stepCount) * Math.PI * 2;
      const variation = 0.75 + Math.random() * 0.45;
      this.points.push({ x: Math.cos(stepAngle) * this.radius * variation, y: Math.sin(stepAngle) * this.radius * variation });
    }
  }

  update(particles) {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotSpeed;
    if (this.damageFlash > 0) this.damageFlash--;

    if (this.isSuper && Math.random() > 0.3) {
      const travelAngle = Math.atan2(this.vy, this.vx);
      const trailX = this.x - Math.cos(travelAngle) * this.radius;
      const trailY = this.y - Math.sin(travelAngle) * this.radius;
      particles.push(
        new Particle(
          trailX + (Math.random() - 0.5) * 8,
          trailY + (Math.random() - 0.5) * 8,
          -this.vx * 0.25 + (Math.random() - 0.5) * 0.8,
          -this.vy * 0.25 + (Math.random() - 0.5) * 0.8,
          Math.random() > 0.4 ? '#f97316' : '#ef4444',
          Math.random() * 20 + 10,
          Math.random() * 2.5 + 1.2
        )
      );
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.damageFlash > 0) {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
    } else if (this.isSuper) {
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#64748b';
      ctx.shadowBlur = 0;
    }

    ctx.lineWidth = this.isSuper ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (this.isSuper && this.damageFlash === 0) {
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(-this.radius * 0.3, -this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(this.radius * 0.3, this.radius * 0.2, this.radius * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (this.isSuper && this.hp < this.maxHp && this.hp > 0) {
      ctx.save();
      const barWidth = this.radius * 1.3;
      const barHeight = 4;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 12, barWidth, barHeight);
      ctx.fillStyle = '#ef4444';
      const fillPercent = this.hp / this.maxHp;
      ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 12, barWidth * fillPercent, barHeight);
      ctx.restore();
    }
  }
}

class EnemyShip {
  constructor(width, height) {
    this.radius = 28;
    this.hp = 2;
    this.maxHp = 2;
    this.damageFlash = 0;

    this.x = Math.random() > 0.5 ? -40 : width + 40;
    this.y = Math.random() * (height * 0.5) + 50;

    this.targetX = Math.random() * (width - 200) + 100;
    this.targetY = Math.random() * (height - 200) + 100;

    this.speed = 1.6;
    this.angle = 0;
    this.shootCooldown = Math.random() * 100 + 100;
  }

  update(playerX, playerY, width, height, enemyLasers) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 30) {
      this.targetX = Math.random() * (width - 200) + 100;
      this.targetY = Math.random() * (height - 200) + 100;
    } else {
      const angleToTarget = Math.atan2(dy, dx);
      this.x += Math.cos(angleToTarget) * this.speed;
      this.y += Math.sin(angleToTarget) * this.speed;
    }

    this.angle = Math.atan2(playerY - this.y, playerX - this.x);
    if (this.damageFlash > 0) this.damageFlash--;

    this.shootCooldown--;
    if (this.shootCooldown <= 0) {
      enemyLasers.push(new EnemyLaser(this.x, this.y, playerX, playerY));
      this.shootCooldown = 150 + Math.random() * 100;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#22c55e';

    if (this.damageFlash > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f43f5e';
    } else {
      ctx.fillStyle = '#15803d';
      ctx.strokeStyle = '#22c55e';
    }

    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-20, -25);
    ctx.lineTo(-12, -5);
    ctx.lineTo(-12, 5);
    ctx.lineTo(-20, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.ellipse(2, 0, 14, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-15, -3, 4, 6);

    ctx.restore();
  }
}

class RetroItem {
  constructor(width, height) {
    this.radius = 38;
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = 0.01;
    this.hasEntered = false;

    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      this.x = -this.radius;
      this.y = Math.random() * height;
    } else if (side === 1) {
      this.x = width + this.radius;
      this.y = Math.random() * height;
    } else if (side === 2) {
      this.x = Math.random() * width;
      this.y = -this.radius;
    } else {
      this.x = Math.random() * width;
      this.y = height + this.radius;
    }

    const destX = width / 2 + (Math.random() - 0.5) * (width * 0.6);
    const destY = height / 2 + (Math.random() - 0.5) * (height * 0.6);
    const travelAngle = Math.atan2(destY - this.y, destX - this.x);
    const speed = Math.random() * 0.8 + 0.4;
    this.vx = Math.cos(travelAngle) * speed;
    this.vy = Math.sin(travelAngle) * speed;

    const types = ['cassette', 'floppy', 'mouse', 'keyboard', 'monitor', 'coffee'];
    this.type = types[Math.floor(Math.random() * types.length)];
    this.glowPulse = 0;
  }

  update(width, height) {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotSpeed;
    this.glowPulse += 0.05;

    if (!this.hasEntered) {
      if (this.x > 50 && this.x < width - 50 && this.y > 50 && this.y < height - 50) this.hasEntered = true;
    } else {
      if (this.x < 40 || this.x > width - 40) {
        this.vx *= -1;
        this.x = Math.max(40, Math.min(width - 40, this.x));
      }
      if (this.y < 40 || this.y > height - 40) {
        this.vy *= -1;
        this.y = Math.max(40, Math.min(height - 40, this.y));
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const pulseRadius = this.radius + 6 + Math.sin(this.glowPulse) * 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#10b981';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#10b981';
    ctx.font = '48px serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const icons = {
      cassette: '📼',
      floppy: '💾',
      mouse: '🖱️',
      keyboard: '⌨️',
      monitor: '🖥️',
      coffee: '☕',
    };

    ctx.fillText(icons[this.type], 0, 0);
    ctx.restore();
  }
}

// Clase principal del juego
class DevGame {
  constructor(container) {
    this.container = container;
    this.canvas = container.querySelector('.st-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.width = container.clientWidth;
    this.height = container.clientHeight;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Estado del juego
    this.phase = 'menu'; // 'menu' | 'playing' | 'gameover' | 'scores'
    this.score = 0;
    this.shields = GAME_CONFIG.maxShield;
    this.threatKey = 'VERDE';
    this.paused = false;
    this.muted = false;
    this.finalScore = 0;
    this.finalDuration = 0;
    this.finalThreatKey = 'VERDE';

    // Audio nodes
    this.audioCtx = null;
    this.audioEnabled = false;
    this.musicGain = null;
    this.sfxGain = null;
    this.delayNode = null;
    this.chargeOscNode = null;
    this.isSoundMuted = false;
    this.bellIntervalId = null;

    // Arrays de entidades
    this.particles = [];
    this.phasers = [];
    this.enemyLasers = [];
    this.atomicBlasts = [];
    this.meteors = [];
    this.enemies = [];
    this.items = [];

    // Estado interno
    this.gameState = {
      running: false,
      paused: false,
      score: 0,
      shields: GAME_CONFIG.maxShield,
      mouseX: this.width / 2,
      mouseY: this.height / 2,
      isPressingRight: false,
      isPressingLeft: false,
      chargeTime: 0,
      chargeLvl: 0,
      lastMeteorTime: 0,
      lastItemTime: 0,
      lastEnemyTime: 0,
      difficultyMultiplier: 1.0,
      threatLevel: 'VERDE',
      screenShake: 0,
      startedAt: 0,
      priorElapsedMs: 0,
    };

    // Fondo de estrellas
    this.stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * 3000 - 500,
      y: Math.random() * 3000 - 500,
      z: Math.random() * 2 + 0.1,
      size: Math.random() * 1.5 + 0.5,
      brightness: Math.random(),
    }));

    // Jugador (Enterprise)
    const self = this;
    this.enterprise = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      angle: 0,
      radius: (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) ? 25 : 35,
      damageGlow: 0,
      isThrusting: false,

      update() {
        this.isThrusting = false;
        if (self.gameState.isPressingRight) {
          const dx = self.gameState.mouseX - this.x;
          const dy = self.gameState.mouseY - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
            this.isThrusting = true;
            const targetAngle = Math.atan2(dy, dx);
            this.vx += Math.cos(targetAngle) * GAME_CONFIG.thrustPower;
            this.vy += Math.sin(targetAngle) * GAME_CONFIG.thrustPower;

            const impulseX = this.x - Math.cos(this.angle) * 15;
            const impulseY = this.y - Math.sin(this.angle) * 15;
            if (Math.random() > 0.4) {
              self.particles.push(
                new Particle(
                  impulseX,
                  impulseY,
                  -Math.cos(targetAngle) * 2 + (Math.random() - 0.5) * 0.5,
                  -Math.sin(targetAngle) * 2 + (Math.random() - 0.5) * 0.5,
                  '#38bdf8',
                  Math.random() * 15 + 10,
                  2
                )
              );
            }
          }
        }

        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (currentSpeed > GAME_CONFIG.maxSpeed) {
          this.vx = (this.vx / currentSpeed) * GAME_CONFIG.maxSpeed;
          this.vy = (this.vy / currentSpeed) * GAME_CONFIG.maxSpeed;
        }

        this.vx *= GAME_CONFIG.friction;
        this.vy *= GAME_CONFIG.friction;
        this.x += this.vx;
        this.y += this.vy;

        if (currentSpeed > 0.3) {
          const desiredAngle = Math.atan2(this.vy, this.vx);
          let angleDiff = desiredAngle - this.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          this.angle += angleDiff * 0.12;
        }

        if (this.x < -this.radius) this.x = self.width + this.radius;
        if (this.x > self.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = self.height + this.radius;
        if (this.y > self.height + this.radius) this.y = -this.radius;

        if (this.damageGlow > 0) this.damageGlow--;

        if (self.gameState.isPressingLeft) {
          self.gameState.chargeTime++;
          const calculatedLevel = Math.min(10, Math.floor(self.gameState.chargeTime / 60));
          if (calculatedLevel !== self.gameState.chargeLvl) {
            self.gameState.chargeLvl = calculatedLevel;
            if (self.gameState.chargeLvl > 0) {
              self.updateChargeSoundFreq(self.gameState.chargeLvl);
              let particleColor = '#06b6d4';
              if (self.gameState.chargeLvl >= 10) particleColor = '#22c55e';
              else if (self.gameState.chargeLvl >= 6) particleColor = '#a855f7';
              else if (self.gameState.chargeLvl >= 4) particleColor = '#ea580c';
              self.particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, particleColor, 20, 3));
            }
          }
        }
      },

      fire() {
        let shootAngle = this.angle;
        if (self.gameState.mouseX !== null && self.gameState.mouseX !== undefined && !self.isTouchShoot) {
          shootAngle = Math.atan2(self.gameState.mouseY - this.y, self.gameState.mouseX - this.x);
        }
        const originX = this.x + Math.cos(shootAngle) * 25;
        const originY = this.y + Math.sin(shootAngle) * 25;
        self.phasers.push(new PhaserBeam(originX, originY, shootAngle, false, 0));
        self.playPhaserSound();
        setTimeout(() => {
          if (self.gameState.shields > 30 && !self.gameState.paused) self.updateDifficulty();
        }, 1000);
      },

      fireSuperCannon(lvl) {
        self.playSuperCannonSound(lvl);
        self.gameState.screenShake = 10 + lvl * 2.5;

        let beamsCount = 36;
        if (lvl === 1) beamsCount = 8;
        else if (lvl === 2) beamsCount = 15;
        else if (lvl === 3) beamsCount = 22;
        else if (lvl === 4) beamsCount = 29;

        for (let i = 0; i < beamsCount; i++) {
          const angle = (i / beamsCount) * Math.PI * 2;
          const originX = this.x + Math.cos(angle) * 30;
          const originY = this.y + Math.sin(angle) * 30;
          self.phasers.push(new PhaserBeam(originX, originY, angle, true, lvl));
        }

        let explosionColor = '#67e8f9';
        if (lvl >= 6) explosionColor = '#f472b6';
        else if (lvl >= 4) explosionColor = '#fdba74';

        for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 3;
          self.particles.push(new Particle(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed, explosionColor, Math.random() * 35 + 20, Math.random() * 4 + 2));
        }

        setTimeout(() => {
          if (self.gameState.shields > 30 && !self.gameState.paused) self.updateDifficulty();
        }, 1500);
      },

      fireAtomicBomb() {
        self.playAtomicBombSound();
        self.gameState.screenShake = 45;
        self.atomicBlasts.push(new AtomicBlast(this.x, this.y, self.width, self.height));
        self.createAtomicExplosionParticles(this.x, this.y);
        setTimeout(() => {
          if (self.gameState.shields > 30 && !self.gameState.paused) self.updateDifficulty();
        }, 2500);
      },

      draw(ctx2) {
        ctx2.save();
        if (self.gameState.shields > 0) {
          ctx2.shadowBlur = this.damageGlow > 0 ? 35 : 18;
          ctx2.shadowColor = this.damageGlow > 0 ? '#ef4444' : '#22d3ee';
        }
        ctx2.translate(this.x, this.y);

        if (self.gameState.isPressingLeft && self.gameState.chargeLvl > 0) {
          ctx2.save();
          ctx2.shadowBlur = 15;
          let chargeColor = '#06b6d4';
          if (self.gameState.chargeLvl >= 10) chargeColor = '#22c55e';
          else if (self.gameState.chargeLvl >= 8) chargeColor = '#dc2626';
          else if (self.gameState.chargeLvl >= 6) chargeColor = '#a855f7';
          else if (self.gameState.chargeLvl >= 4) chargeColor = '#ea580c';

          ctx2.shadowColor = chargeColor;
          ctx2.strokeStyle = chargeColor;
          ctx2.lineWidth = 3;
          ctx2.beginPath();
          const chargeArc = (self.gameState.chargeTime / 600) * Math.PI * 2;
          ctx2.arc(0, 0, 70, -Math.PI / 2, -Math.PI / 2 + Math.min(Math.PI * 2, chargeArc));
          ctx2.stroke();

          ctx2.fillStyle = chargeColor;
          ctx2.font = 'bold 12px Courier New';
          ctx2.textAlign = 'center';

          let labelText = `[ CANALIZANDO: N${self.gameState.chargeLvl} ]`;
          if (self.gameState.chargeLvl >= 10) labelText = '⚠ [ ¡BOMBA ATÓMICA LISTA! ] ⚠';
          else if (self.gameState.chargeLvl >= 6) labelText = `⚡ [ SÚPER CAÑÓN DAÑO x${self.gameState.chargeLvl - 4} ] ⚡`;
          ctx2.fillText(labelText, 0, -85);
          ctx2.restore();
        }

        ctx2.rotate(this.angle);
        if (this.isThrusting) drawEnterpriseThrust(ctx2, 0.75 + Math.random() * 0.25);
        drawEnterpriseHull(ctx2);
        ctx2.restore();
      },
    };

    // Binding event listeners
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleContextMenu = this.handleContextMenu.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);

    this.container.addEventListener('mousedown', this.boundHandleMouseDown);
    this.container.addEventListener('mousemove', this.boundHandleMouseMove);
    this.container.addEventListener('mouseup', this.boundHandleMouseUp);
    this.container.addEventListener('contextmenu', this.boundHandleContextMenu);
    this.container.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.boundHandleTouchEnd, { passive: false });
    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);

    // Bindeo de botones HTML
    this.setupUIEvents();

    // Iniciar loop inactivo
    this.animateFrameId = requestAnimationFrame(() => this.animate());

    // Mostrar menú inicial
    this.setPhase('menu');
  }

  // --- UI & Lifecycle ---
  resize() {
    const clientW = this.container.clientWidth;
    const clientH = this.container.clientHeight;
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (isMobile && clientW < 600) {
      // Scale up the logical coordinate system to simulate a desktop space on mobile
      this.width = 900;
      this.height = Math.round(900 * (clientH / clientW));
    } else {
      this.width = clientW;
      this.height = clientH;
    }

    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  setupUIEvents() {
    const q = (sel) => this.container.querySelector(sel);

    q('.st-btn-new')?.addEventListener('click', () => this.handleStart());
    q('.st-btn-scores')?.addEventListener('click', () => this.setPhase('scores'));
    q('.st-btn-back')?.addEventListener('click', () => this.setPhase('menu'));
    q('.st-btn-restart')?.addEventListener('click', () => this.startPatrol());
    q('.st-btn-menu-back')?.addEventListener('click', () => this.setPhase('menu'));

    q('.st-btn-mute')?.addEventListener('click', () => this.toggleMuteAll());
    q('.st-btn-pause')?.addEventListener('click', () => this.togglePause());

    const shootBtn = q('.st-mobile-shoot-btn');
    if (shootBtn) {
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (isTouch) {
        shootBtn.style.setProperty('display', 'flex', 'important');
      }
      const handleShootStart = (e) => {
        e.preventDefault();
        if (!this.gameState.running || this.gameState.paused) return;
        this.isTouchShoot = true;
        this.gameState.isPressingLeft = true;
        this.gameState.chargeTime = 0;
        this.gameState.chargeLvl = 0;
        this.startChargeSound();
      };
      const handleShootEnd = (e) => {
        e.preventDefault();
        if (this.isTouchShoot) {
          this.releaseWeapon();
          this.isTouchShoot = false;
        }
      };
      shootBtn.addEventListener('touchstart', handleShootStart, { passive: false });
      shootBtn.addEventListener('touchend', handleShootEnd, { passive: false });
      shootBtn.addEventListener('mousedown', handleShootStart);
      shootBtn.addEventListener('mouseup', handleShootEnd);
    }
  }

  setPhase(newPhase) {
    this.phase = newPhase;
    const q = (sel) => this.container.querySelector(sel);

    // Ocultar todos los overlays
    q('.st-hud').classList.add('st-hidden');
    q('.st-intro-overlay-menu').classList.add('st-hidden');
    q('.st-intro-overlay-scores').classList.add('st-hidden');
    q('.st-gameover-overlay').classList.add('st-hidden');

    if (newPhase === 'playing') {
      q('.st-hud').classList.remove('st-hidden');
    } else if (newPhase === 'menu') {
      q('.st-intro-overlay-menu').classList.remove('st-hidden');
    } else if (newPhase === 'scores') {
      q('.st-intro-overlay-scores').classList.remove('st-hidden');
      this.renderHistoryTable(q('.st-intro-overlay-scores .st-history-container'));
    } else if (newPhase === 'gameover') {
      q('.st-gameover-overlay').classList.remove('st-hidden');

      q('.st-trophy-score').textContent = `${this.finalScore} puntos`;
      const finalThreat = threatLevelInfo(this.finalThreatKey);
      const threatLabel = q('.st-trophy-threat');
      threatLabel.textContent = `🚨 ${finalThreat.status}`;
      threatLabel.style.color = finalThreat.color;
      q('.st-trophy-time').textContent = `⏱️ ${formatDuration(this.finalDuration)}`;
      q('.st-trophy-date').textContent = `📅 ${formatPlayedAt(new Date().toISOString())}`;

      this.renderHistoryTable(q('.st-gameover-overlay .st-history-container'));
    }
  }

  renderHistoryTable(container) {
    if (!container) return;
    const history = this.getLocalScores();
    const bestScore = history.length > 0 ? Math.max(...history.map((h) => h.score)) : null;

    let html = `
      <p class="st-trophy-label">
        Partidas anteriores ${bestScore != null ? `· mejor puntuación: <span>${bestScore} pts</span>` : ''}
      </p>
    `;

    if (history.length === 0) {
      html += `<p class="st-hud-mini">Todavía no hay partidas guardadas.</p>`;
    } else {
      html += `
        <table class="st-history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Duración</th>
              <th>Puntos</th>
              <th>Amenaza</th>
            </tr>
          </thead>
          <tbody>
            ${history.map((h) => {
              const th = threatLevelInfo(h.threat_level);
              return `
                <tr>
                  <td>${formatPlayedAt(h.played_at)}</td>
                  <td>${formatDuration(h.duration_seconds)}</td>
                  <td>${h.score}</td>
                  <td style="color: ${th.color}">${th.status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
    container.innerHTML = html;
  }

  // --- Entrada de usuario ---
  isIgnoredTarget(target) {
    return target instanceof Element && target.closest('.st-ignore-canvas') !== null;
  }

  handleMouseDown(e) {
    if (!this.gameState.running || this.gameState.paused) return;
    if (this.isIgnoredTarget(e.target)) return;

    const rect = this.canvas.getBoundingClientRect();
    this.gameState.mouseX = (e.clientX - rect.left) * (this.width / rect.width);
    this.gameState.mouseY = (e.clientY - rect.top) * (this.height / rect.height);

    if (e.button === 2) {
      this.gameState.isPressingRight = true;
    } else if (e.button === 0) {
      this.gameState.isPressingLeft = true;
      this.gameState.chargeTime = 0;
      this.gameState.chargeLvl = 0;
      this.startChargeSound();
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.gameState.mouseX = (e.clientX - rect.left) * (this.width / rect.width);
    this.gameState.mouseY = (e.clientY - rect.top) * (this.height / rect.height);
  }

  releaseWeapon() {
    this.stopChargeSound();
    this.gameState.isPressingLeft = false;
    if (this.gameState.chargeLvl >= 10) this.enterprise.fireAtomicBomb();
    else if (this.gameState.chargeLvl >= 1) this.enterprise.fireSuperCannon(this.gameState.chargeLvl);
    else this.enterprise.fire();
    this.gameState.chargeLvl = 0;
    this.gameState.chargeTime = 0;
  }

  handleMouseUp(e) {
    if (e.button === 2) {
      this.gameState.isPressingRight = false;
    } else if (e.button === 0 && this.gameState.isPressingLeft) {
      this.releaseWeapon();
    }
  }

  handleContextMenu(e) {
    e.preventDefault();
  }

  handleTouchStart(e) {
    if (!this.gameState.running || this.gameState.paused) return;
    if (this.isIgnoredTarget(e.target)) return;
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    this.gameState.mouseX = (touch.clientX - rect.left) * (this.width / rect.width);
    this.gameState.mouseY = (touch.clientY - rect.top) * (this.height / rect.height);
    this.gameState.isPressingRight = true; // thrust
    this.isTouchPlaying = true;
    this.touchFireCooldown = 0;
  }

  handleTouchMove(e) {
    if (!this.gameState.running || this.gameState.paused) return;
    if (this.isIgnoredTarget(e.target)) return;
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    this.gameState.mouseX = (touch.clientX - rect.left) * (this.width / rect.width);
    this.gameState.mouseY = (touch.clientY - rect.top) * (this.height / rect.height);
  }

  handleTouchEnd(e) {
    if (!this.gameState.running) return;
    if (this.isIgnoredTarget(e.target)) return;
    e.preventDefault();
    this.gameState.isPressingRight = false;
    this.isTouchPlaying = false;
  }

  handleKeyDown(e) {
    if ((e.code === 'KeyP' || e.code === 'Escape') && this.gameState.running) {
      e.preventDefault();
      this.togglePause();
    }
    if (e.code === 'Space' && this.gameState.running && !this.gameState.isPressingLeft && !this.gameState.paused) {
      e.preventDefault();
      this.gameState.isPressingLeft = true;
      this.gameState.chargeTime = 0;
      this.gameState.chargeLvl = 0;
      this.startChargeSound();
    }
  }

  handleKeyUp(e) {
    if (e.code === 'Space' && this.gameState.running && this.gameState.isPressingLeft) {
      this.releaseWeapon();
    }
  }

  // --- Audio ---
  initAudio() {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return;
    }
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      this.musicGain.connect(this.audioCtx.destination);

      this.sfxGain = this.audioCtx.createGain();
      this.sfxGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      this.sfxGain.connect(this.audioCtx.destination);

      this.delayNode = this.audioCtx.createDelay(2.0);
      const delayFeedback = this.audioCtx.createGain();
      this.delayNode.delayTime.value = 0.6;
      delayFeedback.gain.value = 0.4;
      this.delayNode.connect(delayFeedback);
      delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.musicGain);

      const padOsc = this.audioCtx.createOscillator();
      const lowpass = this.audioCtx.createBiquadFilter();
      padOsc.type = 'triangle';
      padOsc.frequency.setValueAtTime(65.41, this.audioCtx.currentTime);
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(120, this.audioCtx.currentTime);
      padOsc.connect(lowpass);
      lowpass.connect(this.musicGain);
      padOsc.start();

      this.bellIntervalId = window.setInterval(() => this.playSpaceBell(), 3200);
      this.audioEnabled = true;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
      this.audioCtx = null;
      this.audioEnabled = false;
    }
  }


  playSpaceBell() {
    if (!this.audioCtx || !this.audioEnabled || !this.gameState.running || this.isSoundMuted || this.gameState.paused || !this.musicGain || !this.delayNode) return;
    const now = this.audioCtx.currentTime;
    const scale = [261.63, 311.13, 349.23, 392.0, 466.16, 523.25, 587.33];
    const freq = scale[Math.floor(Math.random() * scale.length)];

    const bellOsc = this.audioCtx.createOscillator();
    const bellGain = this.audioCtx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(freq, now);
    bellGain.gain.setValueAtTime(0, now);
    bellGain.gain.linearRampToValueAtTime(0.12, now + 0.1);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    bellOsc.connect(bellGain);
    bellGain.connect(this.musicGain);
    bellGain.connect(this.delayNode);
    bellOsc.start(now);
    bellOsc.stop(now + 2.2);
  }

  playPhaserSound() {
    if (!this.audioEnabled || !this.audioCtx || this.isSoundMuted || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(850, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  startChargeSound() {
    if (!this.audioEnabled || !this.audioCtx || this.chargeOscNode || this.isSoundMuted || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;
    this.chargeOscNode = this.audioCtx.createOscillator();
    const chargeGain = this.audioCtx.createGain();
    const chargeFilter = this.audioCtx.createBiquadFilter();
    this.chargeOscNode.type = 'sawtooth';
    this.chargeOscNode.frequency.setValueAtTime(180, now);
    chargeFilter.type = 'lowpass';
    chargeFilter.frequency.setValueAtTime(250, now);
    chargeGain.gain.setValueAtTime(0, now);
    chargeGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
    this.chargeOscNode.connect(chargeFilter);
    chargeFilter.connect(chargeGain);
    chargeGain.connect(this.sfxGain);
    this.chargeOscNode.start(now);
  }

  updateChargeSoundFreq(level) {
    if (!this.chargeOscNode || !this.audioCtx || this.isSoundMuted) return;
    const now = this.audioCtx.currentTime;
    const targetFreq = 180 + level * 80;
    this.chargeOscNode.frequency.setTargetAtTime(targetFreq, now, 0.15);
  }

  stopChargeSound() {
    if (this.chargeOscNode) {
      try {
        this.chargeOscNode.stop();
      } catch (e) {
        // ya parado
      }
      this.chargeOscNode = null;
    }
  }

  playSuperCannonSound(lvl) {
    if (!this.audioEnabled || !this.audioCtx || this.isSoundMuted || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;
    const subOsc = this.audioCtx.createOscillator();
    const subGain = this.audioCtx.createGain();
    const baseFreq = 450 - lvl * 35;
    const endFreq = 60 - lvl * 5;
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(baseFreq, now);
    subOsc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + 0.4 + lvl * 0.05);
    subGain.gain.setValueAtTime(0.2 + lvl * 0.04, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + lvl * 0.06);
    const lowpass = this.audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(300 + lvl * 120, now);
    subOsc.connect(lowpass);
    lowpass.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.6 + lvl * 0.07);
  }

  playAtomicBombSound() {
    if (!this.audioEnabled || !this.audioCtx || this.isSoundMuted || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;

    const atomicOsc = this.audioCtx.createOscillator();
    const atomicGain = this.audioCtx.createGain();
    atomicOsc.type = 'sawtooth';
    atomicOsc.frequency.setValueAtTime(450, now);
    atomicOsc.frequency.exponentialRampToValueAtTime(10, now + 2.5);
    atomicGain.gain.setValueAtTime(0.8, now);
    atomicGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    const lowpass = this.audioCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(400, now);
    atomicOsc.connect(lowpass);
    lowpass.connect(atomicGain);
    atomicGain.connect(this.sfxGain);
    atomicOsc.start(now);
    atomicOsc.stop(now + 2.6);

    const bufferSize = this.audioCtx.sampleRate * 2.5;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(900, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(20, now + 2.2);
    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  playExplosionSound() {
    if (!this.audioEnabled || !this.audioCtx || this.isSoundMuted || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;
    const bufferSize = this.audioCtx.sampleRate * 0.4;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);
    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  playShieldImpactSound() {
    if (!this.audioEnabled || !this.audioCtx || this.isSoundMuted || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playRecoverySound() {
    if (!this.audioEnabled || !this.audioCtx || this.isSoundMuted || !this.sfxGain) return;
    const now = this.audioCtx.currentTime;
    const notes = [392.0, 523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      if (!this.audioCtx || !this.sfxGain) return;
      const noteOsc = this.audioCtx.createOscillator();
      const noteGain = this.audioCtx.createGain();
      noteOsc.type = 'sine';
      noteOsc.frequency.setValueAtTime(freq, now + i * 0.08);
      noteGain.gain.setValueAtTime(0, now + i * 0.08);
      noteGain.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      noteOsc.connect(noteGain);
      noteGain.connect(this.sfxGain);
      noteOsc.start(now + i * 0.08);
      noteOsc.stop(now + i * 0.08 + 0.4);
    });
  }

  toggleMuteAll() {
    this.initAudio();
    if (!this.audioCtx) return;
    this.isSoundMuted = !this.isSoundMuted;
    this.muted = this.isSoundMuted;

    const q = (sel) => this.container.querySelector(sel);
    const muteBtn = q('.st-btn-mute');
    if (muteBtn) muteBtn.textContent = this.isSoundMuted ? '🔇' : '🔊';

    if (this.isSoundMuted) {
      this.musicGain?.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.sfxGain?.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.stopChargeSound();
    } else {
      this.musicGain?.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      this.sfxGain?.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    }
  }

  // --- Mecánicas de juego ---
  spawnMeteor() {
    if (!this.gameState.running || this.gameState.paused) return;
    let superChance = 0;
    if (this.gameState.score >= 250 && this.gameState.score < 500) superChance = 0.2;
    else if (this.gameState.score >= 500 && this.gameState.score < 850) superChance = 0.35;
    else if (this.gameState.score >= 850) superChance = 0.5;

    const isSuper = Math.random() < superChance;
    this.meteors.push(new Meteor(isSuper, this.width, this.height, this.gameState.difficultyMultiplier));

    let extraSmallMeteors = 0;
    if (this.gameState.difficultyMultiplier >= 1.2 && this.gameState.difficultyMultiplier < 1.45) {
      if (Math.random() < 0.35) extraSmallMeteors = 1;
    } else if (this.gameState.difficultyMultiplier >= 1.45 && this.gameState.difficultyMultiplier < 1.7) {
      extraSmallMeteors = 1 + (Math.random() < 0.4 ? 1 : 0);
    } else if (this.gameState.difficultyMultiplier >= 1.7 && this.gameState.difficultyMultiplier < 2.1) {
      extraSmallMeteors = 1 + Math.floor(Math.random() * 2);
    } else if (this.gameState.difficultyMultiplier >= 2.1) {
      extraSmallMeteors = 2 + Math.floor(Math.random() * 2);
    }

    for (let i = 0; i < extraSmallMeteors; i++) {
      this.meteors.push(new Meteor(false, this.width, this.height, this.gameState.difficultyMultiplier));
    }
  }

  spawnEnemyShip() {
    if (!this.gameState.running || this.gameState.paused) return;
    if (this.gameState.score >= 850 && this.enemies.length < 3) {
      this.enemies.push(new EnemyShip(this.width, this.height));
    }
  }

  spawnRetroItem() {
    if (!this.gameState.running || this.gameState.paused) return;
    if (this.items.length < 3) {
      this.items.push(new RetroItem(this.width, this.height));
    }
  }

  updateDifficulty() {
    const level = threatLevelForScore(this.gameState.score);
    this.gameState.difficultyMultiplier = level.multiplier;
    this.gameState.threatLevel = level.key;
    this.threatKey = level.key;

    // HUD updates
    const q = (sel) => this.container.querySelector(sel);
    const led = q('.st-alert-led');
    const label = q('.st-alert-text');
    const bottomLabel = q('.st-threat-label');

    if (led) led.style.background = level.color;
    if (label) {
      label.textContent = level.status;
      label.style.color = level.color;
    }
    if (bottomLabel) bottomLabel.textContent = level.label;
  }

  togglePause() {
    if (!this.gameState.running) return;
    this.gameState.paused = !this.gameState.paused;
    this.paused = this.gameState.paused;

    const q = (sel) => this.container.querySelector(sel);
    const pauseBtn = q('.st-btn-pause');
    if (pauseBtn) pauseBtn.textContent = this.paused ? '▶' : '⏸';

    const statusEl = q('.st-hud-status');
    if (statusEl) statusEl.textContent = `Estado: ${this.paused ? 'Sistemas en pausa' : 'Patrulla inercial activa'}`;

    if (this.paused) {
      this.stopChargeSound();
    } else {
      const now = performance.now();
      this.gameState.lastMeteorTime = now;
      this.gameState.lastItemTime = now;
      this.gameState.lastEnemyTime = now;
    }
  }

  saveScore() {
    const durationSeconds = Math.max(
      0,
      Math.round((this.gameState.priorElapsedMs + (performance.now() - this.gameState.startedAt)) / 1000)
    );
    this.finalScore = this.gameState.score;
    this.finalDuration = durationSeconds;
    this.finalThreatKey = this.gameState.threatLevel;

    this.saveLocalScore(durationSeconds, this.finalScore, this.finalThreatKey);
  }

  gameOver() {
    this.gameState.running = false;
    this.stopChargeSound();
    this.createExplosion(this.enterprise.x, this.enterprise.y);
    this.playExplosionSound();
    this.saveScore();
    this.setPhase('gameover');
  }

  applyDamage(amount) {
    this.gameState.shields -= amount;
    this.enterprise.damageGlow = 15;
    const shieldPercent = Math.max(0, this.gameState.shields);
    this.shields = shieldPercent;

    const q = (sel) => this.container.querySelector(sel);
    const shieldFill = q('.st-shield-fill');
    if (shieldFill) {
      shieldFill.style.width = `${shieldPercent}%`;
      shieldFill.className = 'st-shield-fill';
      if (shieldPercent === GAME_CONFIG.maxShield) {
        shieldFill.classList.add('st-shield-full');
      } else if (shieldPercent < 40) {
        shieldFill.classList.add('st-shield-critical');
      } else {
        shieldFill.classList.add('st-shield-hit');
      }
    }

    if (shieldPercent <= 0) this.gameOver();
  }

  createExplosion(x, y, isGreen = false) {
    this.playExplosionSound();
    const colors = isGreen ? ['#10b981', '#34d399', '#a7f3d0'] : ['#f97316', '#eab308', '#38bdf8'];
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, Math.random() * 30 + 15, Math.random() * 3 + 1));
    }
  }

  createAtomicExplosionParticles(x, y) {
    const colors = ['#22c55e', '#4ade80', '#16a34a', '#ffffff', '#a7f3d0'];
    for (let i = 0; i < 180; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, Math.random() * 80 + 40, Math.random() * 5 + 1.5));
    }
  }

  createImpactSparks(x, y) {
    this.playShieldImpactSound();
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 2;
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ef4444', Math.random() * 15 + 10, Math.random() * 2 + 1));
    }
  }

  beginRun(initial) {
    this.gameState.running = true;
    this.gameState.paused = false;
    this.gameState.score = initial.score;
    this.gameState.shields = initial.shields;
    const level = threatLevelInfo(initial.threatLevel);
    this.gameState.difficultyMultiplier = level.multiplier;
    this.gameState.threatLevel = level.key;
    this.gameState.isPressingLeft = false;
    this.gameState.chargeTime = 0;
    this.gameState.chargeLvl = 0;
    this.gameState.startedAt = performance.now();
    this.gameState.priorElapsedMs = initial.priorElapsedMs;

    this.score = initial.score;
    this.shields = initial.shields;
    this.threatKey = level.key;
    this.paused = false;

    // Reset UI
    const q = (sel) => this.container.querySelector(sel);
    q('.st-score').textContent = `Puntos: ${this.score}`;
    this.applyDamage(0); // Forzar refresco visual del escudo
    this.updateDifficulty();

    this.enterprise.x = this.width / 2;
    this.enterprise.y = this.height / 2;
    this.enterprise.vx = 0;
    this.enterprise.vy = 0;
    this.enterprise.angle = 0;

    this.meteors = [];
    this.enemies = [];
    this.items = [];
    this.phasers = [];
    this.enemyLasers = [];
    this.atomicBlasts = [];
    this.particles = [];

    const now = performance.now();
    this.gameState.lastMeteorTime = now;
    this.gameState.lastItemTime = now;
    this.gameState.lastEnemyTime = now;

    this.items.push(new RetroItem(this.width, this.height));

    this.setPhase('playing');
  }

  startPatrol() {
    this.beginRun({ score: 0, shields: GAME_CONFIG.maxShield, threatLevel: 'VERDE', priorElapsedMs: 0 });
  }

  handleStart() {
    this.initAudio();
    this.startPatrol();
  }

  handleResume() {
    this.initAudio();
  }

  // --- Bucle principal de animación ---
  drawPauseOverlay() {
    this.ctx.fillStyle = 'rgba(2, 6, 23, 0.05)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
    this.ctx.font = 'bold 20px "JetBrains Mono", Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#06b6d4';
    this.ctx.fillText('PAUSA DE OPERACIONES', this.width / 2, this.height / 2 - 20);
    this.ctx.font = '11px "JetBrains Mono", Courier New';
    this.ctx.fillStyle = '#6e6e8a';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText('PULSA [ P ] / [ ESC ] O EL BOTÓN SUPERIOR PARA REANUDAR', this.width / 2, this.height / 2 + 25);
    this.ctx.restore();
  }

  drawIdleStarfield() {
    this.ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.stars.forEach((star) => {
      star.x -= 0.1 * star.z;
      if (star.x < -100) star.x = this.width + 100;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  animate() {
    if (!this.canvas) return; // Destruido
    this.animateFrameId = requestAnimationFrame(() => this.animate());

    if (!this.gameState.running) {
      this.drawIdleStarfield();
      return;
    }

    if (this.gameState.paused) {
      this.drawPauseOverlay();
      return;
    }

    const now = performance.now();

    const dynamicMeteorInterval = Math.max(600, GAME_CONFIG.baseSpawnRate / this.gameState.difficultyMultiplier);
    if (now - this.gameState.lastMeteorTime > dynamicMeteorInterval) {
      this.spawnMeteor();
      this.gameState.lastMeteorTime = now;
    }

    if (now - this.gameState.lastItemTime > GAME_CONFIG.itemSpawnRate) {
      this.spawnRetroItem();
      this.gameState.lastItemTime = now;
    }

    if (this.gameState.score >= 850 && now - this.gameState.lastEnemyTime > GAME_CONFIG.enemySpawnRate) {
      this.spawnEnemyShip();
      this.gameState.lastEnemyTime = now;
    }

    this.ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    if (this.gameState.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.gameState.screenShake;
      const dy = (Math.random() - 0.5) * this.gameState.screenShake;
      this.ctx.translate(dx, dy);
      this.gameState.screenShake *= 0.92;
      if (this.gameState.screenShake < 0.5) this.gameState.screenShake = 0;
    }

    // Dibujar estrellas
    this.stars.forEach((star) => {
      star.x -= this.enterprise.vx * star.z * 0.1;
      star.y -= this.enterprise.vy * star.z * 0.1;
      if (star.x < -500) star.x = this.width + 500;
      if (star.x > this.width + 500) star.x = -500;
      if (star.y < -500) star.y = this.height + 500;
      if (star.y > this.height + 500) star.y = -500;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Bombas cuánticas activas
    for (let b = this.atomicBlasts.length - 1; b >= 0; b--) {
      const blast = this.atomicBlasts[b];
      blast.update();
      blast.draw(this.ctx);
      if (!blast.active) {
        this.atomicBlasts.splice(b, 1);
        continue;
      }
      for (let r = this.items.length - 1; r >= 0; r--) {
        const item = this.items[r];
        if (Math.hypot(blast.x - item.x, blast.y - item.y) < blast.radius + 15) {
          this.createExplosion(item.x, item.y, true);
          this.items.splice(r, 1);
        }
      }
      for (let m = this.meteors.length - 1; m >= 0; m--) {
        const meteor = this.meteors[m];
        if (Math.hypot(blast.x - meteor.x, blast.y - meteor.y) < blast.radius + 15) {
          this.createExplosion(meteor.x, meteor.y, true);
          this.meteors.splice(m, 1);
          this.gameState.score += meteor.isSuper ? 50 : 10;
          this.updateScoreUI();
        }
      }
      for (let e = this.enemies.length - 1; e >= 0; e--) {
        const enemy = this.enemies[e];
        if (Math.hypot(blast.x - enemy.x, enemy.y - enemy.y) < blast.radius + 15) {
          this.createExplosion(enemy.x, enemy.y, true);
          this.enemies.splice(e, 1);
          this.gameState.score += 30;
          this.updateScoreUI();
        }
      }
      for (let l = this.enemyLasers.length - 1; l >= 0; l--) {
        const laser = this.enemyLasers[l];
        if (Math.hypot(blast.x - laser.x, blast.y - laser.y) < blast.radius) this.enemyLasers.splice(l, 1);
      }
    }

    // Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      p.draw(this.ctx);
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Fáseres tácticos del jugador
    for (let i = this.phasers.length - 1; i >= 0; i--) {
      const beam = this.phasers[i];
      beam.update();
      beam.draw(this.ctx);

      if (beam.life <= 0) {
        this.phasers.splice(i, 1);
        continue;
      }

      let beamDestroyed = false;

      // Colisión con enemigos
      for (let e = this.enemies.length - 1; e >= 0; e--) {
        const enemy = this.enemies[e];
        if (Math.hypot(beam.x - enemy.x, beam.y - enemy.y) < enemy.radius + 10) {
          beamDestroyed = true;
          this.phasers.splice(i, 1);
          enemy.hp -= beam.damage;
          enemy.damageFlash = 6;
          this.createImpactSparks(beam.x, beam.y);
          if (enemy.hp <= 0) {
            this.createExplosion(enemy.x, enemy.y);
            this.enemies.splice(e, 1);
            this.gameState.score += 30;
            this.updateScoreUI();
          }
          break;
        }
      }

      if (beamDestroyed) continue;

      // Colisión con meteoros
      for (let m = this.meteors.length - 1; m >= 0; m--) {
        const meteor = this.meteors[m];
        if (Math.hypot(beam.x - meteor.x, beam.y - meteor.y) < meteor.radius + 10) {
          this.phasers.splice(i, 1);
          const damageDealt = beam.damage;
          if (meteor.isSuper) {
            meteor.hp -= damageDealt;
            meteor.damageFlash = 6;
            this.createImpactSparks(beam.x, beam.y);
            if (meteor.hp <= 0) {
              this.createExplosion(meteor.x, meteor.y);
              this.meteors.splice(m, 1);
              this.gameState.score += 50;
              this.updateScoreUI();
            }
          } else {
            this.createExplosion(meteor.x, meteor.y);
            this.meteors.splice(m, 1);
            this.gameState.score += 10;
            this.updateScoreUI();
          }
          break;
        }
      }
    }

    // Enemigos
    for (let e = this.enemies.length - 1; e >= 0; e--) {
      const enemy = this.enemies[e];
      enemy.update(this.enterprise.x, this.enterprise.y, this.width, this.height, this.enemyLasers);
      enemy.draw(this.ctx);
      if (this.gameState.running && Math.hypot(enemy.x - this.enterprise.x, enemy.y - this.enterprise.y) < enemy.radius + this.enterprise.radius) {
        this.createExplosion(enemy.x, enemy.y);
        this.enemies.splice(e, 1);
        this.applyDamage(30);
      }
    }

    // Lásers enemigos
    for (let l = this.enemyLasers.length - 1; l >= 0; l--) {
      const laser = this.enemyLasers[l];
      laser.update();
      laser.draw(this.ctx);
      if (laser.life <= 0) {
        this.enemyLasers.splice(l, 1);
        continue;
      }
      if (this.gameState.running && Math.hypot(laser.x - this.enterprise.x, laser.y - this.enterprise.y) < this.enterprise.radius + laser.radius) {
        this.createImpactSparks(laser.x, laser.y);
        this.enemyLasers.splice(l, 1);
        this.applyDamage(GAME_CONFIG.enemyLaserDamage);
      }
    }

    // Meteoros
    for (let m = this.meteors.length - 1; m >= 0; m--) {
      const meteor = this.meteors[m];
      meteor.update(this.particles);
      meteor.draw(this.ctx);

      if (this.gameState.running) {
        if (Math.hypot(meteor.x - this.enterprise.x, meteor.y - this.enterprise.y) < meteor.radius + this.enterprise.radius) {
          const damage = meteor.isSuper ? GAME_CONFIG.superMeteorDamage : GAME_CONFIG.meteorDamage;
          this.createExplosion(meteor.x, meteor.y);
          this.meteors.splice(m, 1);
          this.applyDamage(damage);
        } else if (meteor.x < -150 || meteor.x > this.width + 150 || meteor.y < -150 || meteor.y > this.height + 150) {
          this.meteors.splice(m, 1);
        }
      }
    }

    // Items retro recogibles (halo verde)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update(this.width, this.height);
      item.draw(this.ctx);
      if (this.gameState.running && Math.hypot(item.x - this.enterprise.x, item.y - this.enterprise.y) < item.radius + this.enterprise.radius) {
        this.gameState.shields = GAME_CONFIG.maxShield;
        this.shields = GAME_CONFIG.maxShield;
        this.playRecoverySound();
        this.createExplosion(item.x, item.y, true);
        this.items.splice(i, 1);
        this.applyDamage(0); // actualizar HUD
      }
    }

    // Nave del jugador
    if (this.gameState.running) {
      this.enterprise.update();
      this.enterprise.draw(this.ctx);
    }

    this.ctx.restore();
  }

  updateScoreUI() {
    this.score = this.gameState.score;
    const q = (sel) => this.container.querySelector(sel);
    const scoreVal = q('.st-score');
    if (scoreVal) scoreVal.textContent = `Puntos: ${this.score}`;
    this.updateDifficulty();
  }

  // --- LocalStorage persistence ---
  getLocalScores() {
    try {
      const raw = localStorage.getItem(SCORES_STORAGE_KEY);
      if (!raw) return this.getSeededScores();
      return JSON.parse(raw);
    } catch (e) {
      return this.getSeededScores();
    }
  }

  saveLocalScore(durationSeconds, score, threatLevel) {
    try {
      const scores = this.getLocalScores();
      const newScore = {
        id: 'score_' + Date.now(),
        played_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        score: score,
        threat_level: threatLevel
      };
      scores.unshift(newScore);
      scores.sort((a, b) => b.score - a.score);
      const topScores = scores.slice(0, 10);
      localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(topScores));
      return topScores;
    } catch (e) {
      return [];
    }
  }

  getSeededScores() {
    return [
      { id: 's1', played_at: new Date(Date.now() - 3600000 * 2).toISOString(), duration_seconds: 185, score: 1250, threat_level: 'ROJA' },
      { id: 's2', played_at: new Date(Date.now() - 3600000 * 24).toISOString(), duration_seconds: 120, score: 680, threat_level: 'NARANJA' },
      { id: 's3', played_at: new Date(Date.now() - 3600000 * 48).toISOString(), duration_seconds: 75, score: 320, threat_level: 'AMARILLA' }
    ];
  }

  // --- Clean up ---
  destroy() {
    cancelAnimationFrame(this.animateFrameId);
    this.resizeObserver.disconnect();
    if (this.bellIntervalId != null) window.clearInterval(this.bellIntervalId);
    this.stopChargeSound();

    this.container.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.container.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.container.removeEventListener('mouseup', this.boundHandleMouseUp);
    this.container.removeEventListener('contextmenu', this.boundHandleContextMenu);
    this.container.removeEventListener('touchstart', this.boundHandleTouchStart);
    this.container.removeEventListener('touchmove', this.boundHandleTouchMove);
    this.container.removeEventListener('touchend', this.boundHandleTouchEnd);
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);

    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
    }

    this.canvas = null;
    this.ctx = null;
  }
}

// Exponer la clase globalmente
window.DevGame = DevGame;
