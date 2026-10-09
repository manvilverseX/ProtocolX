/* =====================================================
   ProtocolX — app.js
   State management, animations, particle canvas
   ===================================================== */

'use strict';

// ─── Particle Background ───────────────────────────────────────────────────

const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animFrameId;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticle() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    radius: Math.random() * 1.5 + 0.4,
    alpha: Math.random() * 0.5 + 0.1,
    color: Math.random() > 0.5
      ? `rgba(124, 58, 237, `
      : `rgba(37, 99, 235, `,
    twinkleSpeed: Math.random() * 0.02 + 0.005,
    twinklePhase: Math.random() * Math.PI * 2,
  };
}

function initParticles() {
  const count = Math.floor((canvas.width * canvas.height) / 8000);
  particles = Array.from({ length: Math.min(count, 120) }, createParticle);
}

function drawConnectionLines() {
  const maxDist = 140;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const opacity = (1 - dist / maxDist) * 0.12;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(124, 58, 237, ${opacity})`;
        ctx.lineWidth = 0.6;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles(time = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawConnectionLines();

  for (const p of particles) {
    p.twinklePhase += p.twinkleSpeed;
    const twinkle = 0.5 + 0.5 * Math.sin(p.twinklePhase);
    const alpha = p.alpha * (0.5 + 0.5 * twinkle);

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `${p.color}${alpha})`;
    ctx.fill();

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
  }

  animFrameId = requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  initParticles();
});

// ─── State Management ──────────────────────────────────────────────────────

const stateWelcome = document.getElementById('state-welcome');
const stateDashboard = document.getElementById('state-dashboard');

function showState(state) {
  if (stateWelcome) stateWelcome.classList.add('hidden');
  if (stateDashboard) stateDashboard.classList.add('hidden');

  if (state === 'dashboard') {
    if (stateDashboard) stateDashboard.classList.remove('hidden');
    document.getElementById('navbar-onboarding').style.display = 'none';
    document.querySelector('.main-content').style.display = 'none';
  } else {
    if (stateWelcome) stateWelcome.classList.remove('hidden');
    document.getElementById('navbar-onboarding').style.display = '';
    const main = document.querySelector('.main-content');
    if (main) main.style.display = '';
  }
}

function resetState() {
  showState('welcome');
}

function startAnalysis() {
  // Simulate an analysis process
  const btn = document.getElementById('analyzeBtn');
  btn.style.pointerEvents = 'none';
  const originalHtml = btn.querySelector('.btn-content').innerHTML;
  btn.querySelector('.btn-content').innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
      style="animation:spin 0.8s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Analyzing Conversation...
  `;

  if (!document.getElementById('spinKf')) {
    const s = document.createElement('style');
    s.id = 'spinKf';
    s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(s);
  }

  // Fake delay then transition
  setTimeout(() => {
    btn.style.pointerEvents = '';
    btn.querySelector('.btn-content').innerHTML = originalHtml;
    showState('dashboard');
  }, 1500);
}

function switchDashTab(tabId) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dash-tab-panel').forEach(p => {
    p.classList.remove('active');
    p.style.animation = 'none';
  });

  const tab = document.getElementById('tab-' + tabId);
  const panel = document.getElementById('panel-' + tabId);

  if (tab) tab.classList.add('active');
  if (panel) {
    panel.classList.add('active');
    requestAnimationFrame(() => {
      panel.style.animation = '';
    });
    const content = document.querySelector('.dash-content');
    if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Init
resizeCanvas();
initParticles();
animateParticles();

// Default state
showState('welcome');
