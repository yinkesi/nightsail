/* 夜航 dust.js — 上浮尘埃粒子场（转译自 antigravity-drift 套件 main.js） */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('dustfield');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, dust = [], raf = 0, t = 0;

  // 冷白为主，少量粒子带品牌渐变色
  const TINTS = [
    [226, 232, 245], [226, 232, 245], [226, 232, 245], [226, 232, 245],
    [226, 232, 245], [226, 232, 245], [226, 232, 245],
    [91, 157, 255], [180, 138, 224], [232, 127, 137]
  ];

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticle(seedY) {
    const d = Math.pow(Math.random(), 1.18);
    const big = Math.random() < 0.07;
    return {
      x: Math.random() * W,
      y: seedY !== undefined ? seedY : Math.random() * (H + 160) - 80,
      d,
      r: big ? 2.6 + Math.random() * 2 : 0.5 + d * 1.7,
      vy: -(0.06 + d * 0.4) * (big ? 0.7 : 1),
      sway: 0.12 + Math.random() * 0.46,
      phase: Math.random() * TAU,
      freq: 0.00035 + Math.random() * 0.00075,
      twk: 0.0006 + Math.random() * 0.0014,
      alpha: (0.22 + d * 0.58) * (big ? 1.25 : 1),
      tint: TINTS[(Math.random() * TINTS.length) | 0],
      halo: big
    };
  }

  function build() {
    size();
    const target = Math.round((W * H) / 9000);
    const n = Math.max(90, Math.min(W < 680 ? 140 : 300, target));
    dust = [];
    for (let i = 0; i < n; i++) dust.push(makeParticle());
  }

  function edgeFade(y) {
    const band = 110;
    if (y < band) return Math.max(0, y / band);
    if (y > H - band) return Math.max(0, (H - y) / band);
    return 1;
  }

  function draw() {
    t = performance.now();
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of dust) {
      p.y += p.vy * 1.6;
      p.x += Math.sin(t * p.freq + p.phase) * p.sway * 0.4;
      if (p.y < -90) { Object.assign(p, makeParticle(H + 80)); continue; }
      const tw = 0.72 + Math.sin(t * p.twk + p.phase) * 0.28;
      const a = p.alpha * tw * edgeFade(p.y);
      if (a <= 0.01) continue;
      const [r, g, b] = p.tint;
      if (p.halo) {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        grad.addColorStop(0, `rgba(${r},${g},${b},${a * 0.34})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (!reduce) raf = requestAnimationFrame(draw);
  }

  build();
  if (reduce) { draw(); canvas.classList.add('is-live'); }
  else {
    canvas.classList.add('is-live');
    raf = requestAnimationFrame(draw);
  }

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { build(); if (reduce) draw(); }, 180);
  });
})();
