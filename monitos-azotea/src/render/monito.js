// Dibujo vectorial de los monitos: cuerpo de gelatina + cabeza de animal
// estilo "flat" (contorno grueso, ojitos de punto, cachetes rosas).
import { S } from '../core/world.js';

export const OUTLINE = '#3a2a25';
const CREAM = '#f6dfbf';
const anims = new Map();

function animOf(m) {
  let a = anims.get(m.id);
  if (!a) { a = { walk: 0, squash: 0, blink: 0, nextBlink: 2 + Math.random() * 3, lastState: m.state, shake: 0 }; anims.set(m.id, a); }
  return a;
}

export function stepMonitoAnim(m, dt) {
  const a = animOf(m);
  a.walk += Math.abs(m.vx) * dt * 0.045;
  if (m.justLanded) a.squash = 1;
  a.squash = Math.max(0, a.squash - dt * 5);
  a.nextBlink -= dt;
  if (a.nextBlink <= 0) { a.blink = 0.12; a.nextBlink = 2 + Math.random() * 3; }
  a.blink = Math.max(0, a.blink - dt);
  if (m.state !== a.lastState) { a.lastState = m.state; if (m.state === S.HITSTUN) a.shake = 1; }
  a.shake = Math.max(0, a.shake - dt * 4);
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function limb(ctx, ax, ay, bx, by, bend, color, w) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const ex = mx - dy / len * bend, ey = my + dx / len * bend;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = w + 4;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ex, ey, bx, by); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ex, ey, bx, by); ctx.stroke();
}

function disc(ctx, x, y, r, fill, lw = 3) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (lw) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw; ctx.stroke(); }
}
function oval(ctx, x, y, rx, ry, fill, lw = 3, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  if (lw) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw; ctx.stroke(); }
}
function tri(ctx, pts, fill, lw = 3) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (lw) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

function fist(ctx, x, y, r, color) {
  disc(ctx, x, y, r, color, 3);
}

function shoe(ctx, x, y, dir, color) {
  oval(ctx, x + dir * 3, y - 3, 11, 6, color, 3);
}

function body(ctx, x, y, w, h, color) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.42, y - h);
  ctx.bezierCurveTo(x + w * 0.42, y - h, x + w * 0.62, y - h * 0.65, x + w * 0.55, y - h * 0.15);
  ctx.bezierCurveTo(x + w * 0.5, y + h * 0.05, x - w * 0.5, y + h * 0.05, x - w * 0.55, y - h * 0.15);
  ctx.bezierCurveTo(x - w * 0.62, y - h * 0.65, x - w * 0.42, y - h, x - w * 0.42, y - h);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4; ctx.stroke();
  // panza crema
  oval(ctx, x, y - h * 0.42, w * 0.3, h * 0.3, CREAM, 0);
}

// ---- ojos / boca según expresión ----
// expr: normal | happy | angry | ouch | ko | scream | strain | worried | puff
function face(ctx, x, y, r, dir, expr, blink, eyeStyle) {
  const ex = x + dir * r * 0.12, ey = y - r * 0.08;
  const gap = r * 0.36;
  const big = eyeStyle === 'big';
  const eyeR = big ? r * 0.2 : r * 0.1;
  const eye = (cx, cy) => {
    if (expr === 'ko') {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5); ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5); ctx.stroke();
      return;
    }
    if (expr === 'ouch' || expr === 'puff' || blink > 0) {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.quadraticCurveTo(cx, cy + (expr === 'puff' ? -4 : 3), cx + 5, cy); ctx.stroke();
      return;
    }
    if (expr === 'scream') {
      disc(ctx, cx, cy, r * 0.2, '#fff', 3);
      disc(ctx, cx + dir * 2, cy, r * 0.08, OUTLINE, 0);
      return;
    }
    if (big) {
      disc(ctx, cx, cy, eyeR, '#fff', 3);
      disc(ctx, cx + dir * eyeR * 0.3, cy + eyeR * 0.15, eyeR * 0.5, OUTLINE, 0);
      disc(ctx, cx + dir * eyeR * 0.1, cy - eyeR * 0.25, eyeR * 0.18, '#fff', 0);
      return;
    }
    disc(ctx, cx, cy, eyeR, OUTLINE, 0);
    disc(ctx, cx - dir * eyeR * 0.3, cy - eyeR * 0.35, eyeR * 0.35, '#fff', 0);
  };
  eye(ex - gap, ey); eye(ex + gap, ey);

  // cejas sólo cuando la emoción lo pide
  if (expr === 'angry' || expr === 'strain' || expr === 'worried') {
    const tilt = expr === 'worried' ? -4 : 4;
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const by = ey - eyeR - 7;
    ctx.beginPath();
    ctx.moveTo(ex - gap - 6, by - tilt * 0.5); ctx.lineTo(ex - gap + 6, by + tilt);
    ctx.moveTo(ex + gap - 6, by + tilt); ctx.lineTo(ex + gap + 6, by - tilt * 0.5);
    ctx.stroke();
  }
  // cachetes
  ctx.fillStyle = 'rgba(255,120,130,.4)';
  const cr = expr === 'puff' ? 8 : 5;
  ctx.beginPath(); ctx.arc(ex - gap - 6, ey + 9, cr, 0, Math.PI * 2); ctx.arc(ex + gap + 6, ey + 9, cr, 0, Math.PI * 2); ctx.fill();

  // boca
  const my = y + r * 0.4;
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath();
  switch (expr) {
    case 'happy': ctx.moveTo(ex - 6, my - 2); ctx.quadraticCurveTo(ex, my + 7, ex + 6, my - 2); ctx.stroke(); break;
    case 'angry': ctx.moveTo(ex - 7, my + 2); ctx.lineTo(ex - 3, my - 1); ctx.lineTo(ex + 2, my + 2); ctx.lineTo(ex + 7, my - 1); ctx.stroke(); break;
    case 'strain': ctx.moveTo(ex - 7, my); ctx.lineTo(ex + 7, my); ctx.stroke(); break;
    case 'ouch': ctx.moveTo(ex - 6, my + 3); ctx.quadraticCurveTo(ex, my - 4, ex + 6, my + 3); ctx.stroke(); break;
    case 'worried': ctx.moveTo(ex - 5, my + 2); ctx.quadraticCurveTo(ex, my - 2, ex + 5, my + 2); ctx.stroke(); break;
    case 'puff': disc(ctx, ex, my, 3, OUTLINE, 0); break;
    case 'scream': oval(ctx, ex, my + 1, 5, 7, OUTLINE, 0); oval(ctx, ex, my + 4, 3, 2.5, '#e0607a', 0); break;
    case 'ko':
      ctx.moveTo(ex - 5, my); ctx.quadraticCurveTo(ex, my + 3, ex + 5, my); ctx.stroke();
      oval(ctx, ex + dir * 4, my + 5, 3.5, 5, '#e0607a', 2); break;
    default: ctx.moveTo(ex - 5, my); ctx.quadraticCurveTo(ex, my + 4, ex + 5, my); ctx.stroke();
  }
}

// ---- cabezas por especie ----
export function drawHead(ctx, species, x, y, r, dir, expr, blink, color) {
  const dark = shade(color, -40);
  let eyeStyle = 'dot';
  // detrás de la cabeza
  switch (species) {
    case 'leon': {
      ctx.beginPath();
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ctx.arc(x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.15, r * 0.42, 0, Math.PI * 2); }
      ctx.fillStyle = '#e2802a'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      break;
    }
    case 'mono': disc(ctx, x - r * 0.95, y, r * 0.32, color); disc(ctx, x + r * 0.95, y, r * 0.32, color); disc(ctx, x - r * 0.95, y, r * 0.16, CREAM, 0); disc(ctx, x + r * 0.95, y, r * 0.16, CREAM, 0); break;
    case 'zorro': tri(ctx, [[x - r * 0.95, y - r * 0.3], [x - r * 0.55, y - r * 1.45], [x - r * 0.1, y - r * 0.85]], color); tri(ctx, [[x + r * 0.95, y - r * 0.3], [x + r * 0.55, y - r * 1.45], [x + r * 0.1, y - r * 0.85]], color);
      tri(ctx, [[x - r * 0.75, y - r * 0.85], [x - r * 0.55, y - r * 1.35], [x - r * 0.3, y - r * 0.95]], OUTLINE, 0); tri(ctx, [[x + r * 0.75, y - r * 0.85], [x + r * 0.55, y - r * 1.35], [x + r * 0.3, y - r * 0.95]], OUTLINE, 0); break;
    case 'panda': disc(ctx, x - r * 0.78, y - r * 0.68, r * 0.32, OUTLINE); disc(ctx, x + r * 0.78, y - r * 0.68, r * 0.32, OUTLINE); break;
    case 'elefante': disc(ctx, x - r * 1.0, y + r * 0.05, r * 0.58, color); disc(ctx, x + r * 1.0, y + r * 0.05, r * 0.58, color); disc(ctx, x - r * 1.0, y + r * 0.05, r * 0.36, '#e9b8c4', 0); disc(ctx, x + r * 1.0, y + r * 0.05, r * 0.36, '#e9b8c4', 0); break;
    case 'jirafa':
      for (const s of [-1, 1]) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + s * r * 0.35, y - r * 0.85); ctx.lineTo(x + s * r * 0.45, y - r * 1.35); ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.stroke(); disc(ctx, x + s * r * 0.45, y - r * 1.38, r * 0.14, '#b8783a'); }
      oval(ctx, x - r * 0.95, y - r * 0.35, r * 0.3, r * 0.18, color, 3, -0.5); oval(ctx, x + r * 0.95, y - r * 0.35, r * 0.3, r * 0.18, color, 3, 0.5); break;
    case 'buho': tri(ctx, [[x - r * 0.9, y - r * 0.4], [x - r * 0.7, y - r * 1.35], [x - r * 0.15, y - r * 0.85]], color); tri(ctx, [[x + r * 0.9, y - r * 0.4], [x + r * 0.7, y - r * 1.35], [x + r * 0.15, y - r * 0.85]], color); break;
    default: break;
  }
  // cabeza
  disc(ctx, x, y, r, color, 4);
  // frente: manchas / cara clara
  switch (species) {
    case 'mono': oval(ctx, x, y + r * 0.18, r * 0.72, r * 0.6, CREAM, 3); disc(ctx, x - r * 0.3, y - r * 0.15, r * 0.3, CREAM, 0); disc(ctx, x + r * 0.3, y - r * 0.15, r * 0.3, CREAM, 0); break;
    case 'leon': oval(ctx, x, y + r * 0.42, r * 0.42, r * 0.3, CREAM, 3); tri(ctx, [[x - r * 0.12, y + r * 0.22], [x + r * 0.12, y + r * 0.22], [x, y + r * 0.36]], OUTLINE, 0); break;
    case 'zorro': oval(ctx, x, y + r * 0.4, r * 0.7, r * 0.45, '#fff5ea', 3); tri(ctx, [[x - r * 0.1, y + r * 0.28], [x + r * 0.1, y + r * 0.28], [x, y + r * 0.42]], OUTLINE, 0); break;
    case 'panda': oval(ctx, x - r * 0.38, y - r * 0.02, r * 0.27, r * 0.34, OUTLINE, 0, -0.4); oval(ctx, x + r * 0.38, y - r * 0.02, r * 0.27, r * 0.34, OUTLINE, 0, 0.4); eyeStyle = 'big'; tri(ctx, [[x - r * 0.1, y + r * 0.3], [x + r * 0.1, y + r * 0.3], [x, y + r * 0.42]], OUTLINE, 0); break;
    case 'elefante': disc(ctx, x - r * 0.4, y + r * 0.5, r * 0.12, '#fff', 2); disc(ctx, x + r * 0.4, y + r * 0.5, r * 0.12, '#fff', 2); break;
    case 'jirafa': for (const [sx, sy, sr] of [[-0.55, -0.55, 0.22], [0.5, -0.6, 0.2], [0.75, 0.05, 0.16], [-0.8, 0.05, 0.14]]) disc(ctx, x + sx * r, y + sy * r, sr * r, '#c98a3c', 0); oval(ctx, x, y + r * 0.45, r * 0.5, r * 0.3, CREAM, 3); disc(ctx, x - r * 0.15, y + r * 0.45, 2.2, OUTLINE, 0); disc(ctx, x + r * 0.15, y + r * 0.45, 2.2, OUTLINE, 0); break;
    case 'pinguino': oval(ctx, x, y + r * 0.1, r * 0.66, r * 0.62, '#fff', 3); break;
    case 'buho': disc(ctx, x - r * 0.4, y - r * 0.05, r * 0.36, '#fff3d6', 3); disc(ctx, x + r * 0.4, y - r * 0.05, r * 0.36, '#fff3d6', 3); eyeStyle = 'big'; break;
    default: break;
  }
  face(ctx, x, y, r, dir, expr, blink, eyeStyle);
  // encima de la cara
  switch (species) {
    case 'elefante': {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.35); ctx.quadraticCurveTo(x + dir * r * 0.1, y + r * 0.9, x + dir * r * 0.35, y + r * 1.05); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.stroke();
      break;
    }
    case 'pinguino': tri(ctx, [[x - r * 0.18, y + r * 0.3], [x + r * 0.18, y + r * 0.3], [x + dir * r * 0.05, y + r * 0.55]], '#f2a03a', 2); break;
    case 'buho': tri(ctx, [[x - r * 0.12, y + r * 0.3], [x + r * 0.12, y + r * 0.3], [x, y + r * 0.55]], '#f2a03a', 2); break;
    default: break;
  }
  return dark;
}

function birds(ctx, x, y, time) {
  for (let i = 0; i < 3; i++) {
    const a = time * 2.6 + (i * Math.PI * 2) / 3;
    const bx = x + Math.cos(a) * 30, by = y + Math.sin(a) * 9 - 6 + Math.sin(time * 6 + i) * 2;
    const depth = 0.7 + 0.3 * (Math.sin(a) + 1) / 2;
    const flap = Math.sin(time * 18 + i * 2) * 5;
    ctx.save(); ctx.translate(bx, by); ctx.scale(depth, depth);
    oval(ctx, 0, 0, 6, 4.5, '#ffd23f', 2);
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(-10, -4 - flap); ctx.moveTo(3, -1); ctx.lineTo(10, -4 - flap); ctx.stroke();
    tri(ctx, [[6, 0], [10, 1], [6, 2]], '#ff8c42', 0);
    disc(ctx, 3, -1.5, 1, OUTLINE, 0);
    ctx.restore();
  }
}

// Mochila jet pack: se dibuja en coordenadas locales del monito (espalda).
export function drawJetpack(ctx, x, y, dir, thrusting, time, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  if (thrusting) {
    const f = 1 + Math.sin(time * 60) * 0.25;
    for (const nx of [-9, 9]) {
      ctx.beginPath(); ctx.moveTo(nx - 6, 18); ctx.quadraticCurveTo(nx, 18 + 34 * f, nx + 6, 18); ctx.closePath();
      ctx.fillStyle = '#ff8c42'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(nx - 3, 18); ctx.quadraticCurveTo(nx, 18 + 18 * f, nx + 3, 18); ctx.closePath();
      ctx.fillStyle = '#ffe14d'; ctx.fill();
    }
  }
  ctx.beginPath(); ctx.roundRect(-16, -18, 32, 36, 8); ctx.fillStyle = '#b9bfcc'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#ff5a5a'; ctx.fillRect(-16, -4, 32, 7);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.strokeRect(-16, -4, 32, 7);
  for (const nx of [-9, 9]) { ctx.beginPath(); ctx.roundRect(nx - 6, 14, 12, 8, 2); ctx.fillStyle = '#5d6270'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.beginPath(); ctx.arc(0, -8, 4, 0, Math.PI * 2); ctx.fillStyle = '#6ad1ff'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

// Mazo: mango + cabeza de madera con bandas. Origen en la mano, apunta hacia +y local.
export function drawMallet(ctx, x, y, angle, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -46); ctx.stroke();
  ctx.strokeStyle = '#c47d3a'; ctx.lineWidth = 6; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-24, -66, 48, 26, 7); ctx.fillStyle = '#8f3f2e'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.fillStyle = '#e8c28a'; ctx.fillRect(-19, -62, 6, 18); ctx.fillRect(13, -62, 6, 18);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.strokeRect(-19, -62, 6, 18); ctx.strokeRect(13, -62, 6, 18);
  ctx.restore();
}

export function drawShadow(ctx, m, roof) {
  if (m.state === S.DEAD || m.state === S.CARRIED) return;
  if (m.x <= roof.x || m.x >= roof.x + roof.w) return;
  const hgt = Math.max(0, roof.y - m.y);
  const k = Math.max(0.35, 1 - hgt / 400);
  ctx.fillStyle = `rgba(40,20,60,${0.22 * k})`;
  ctx.beginPath(); ctx.ellipse(m.x, roof.y + 2, 20 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();
}

export function drawFartCloud(ctx, m, time) {
  if (m.fartCloud <= 0) return;
  const k = 1 - m.fartCloud / 1.0; // 0 → 1
  const R = 40 + k * 100;
  ctx.save(); ctx.globalAlpha = (1 - k) * 0.75;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + time;
    const px = m.x + Math.cos(a) * R * 0.6, py = m.y - m.h * 0.35 + Math.sin(a) * R * 0.45 - k * 30;
    disc(ctx, px, py, 18 + k * 18, i % 2 ? '#b7e07a' : '#93c85a', 3);
  }
  ctx.restore();
}

export function drawMonito(ctx, m, time, cfg) {
  if (m.state === S.DEAD) return;
  const a = animOf(m);
  const c = m.color, dark = shade(c, -45);
  const dir = m.facing;
  const H = m.h, W = m.w;
  const st = m.state;
  const inv = m.invuln > 0 && Math.floor(time * 14) % 2 === 0;

  ctx.save();
  ctx.translate(m.x, m.y);
  if (inv) ctx.globalAlpha = 0.55;

  let rot = 0, sx = 1, sy = 1, lift = 0;
  const lying = st === S.KO || st === S.CARRIED;
  if (st === S.LAUNCHED || st === S.THROWN) rot = -dir * m.t * 11;
  if (st === S.FALLING) rot = Math.sin(m.t * 6) * 0.35;
  if (lying) { rot = -dir * Math.PI / 2; lift = -W * 0.45; }
  if (st === S.HITSTUN) { const k = a.shake; ctx.translate((Math.random() - 0.5) * 6 * k, 0); rot = -dir * 0.18 * k; }
  if (a.squash > 0) { sx = 1 + a.squash * 0.28; sy = 1 - a.squash * 0.28; }
  if (st === S.JUMP && !m.onGround) { const k = Math.min(1, Math.abs(m.vy) / 900); sx = 1 - 0.12 * k; sy = 1 + 0.12 * k; }
  if (st === S.PICKUP) rot = dir * 0.45 * Math.min(1, m.t / 0.15);
  if (st === S.CARRYING) { sy = 0.94; sx = 1.05; }
  if (st === S.PUNCH) rot = dir * 0.12;
  if (st === S.FART) { const k = Math.min(1, m.t / cfg.fart.windup); sy = 1 - 0.22 * k; sx = 1 + 0.18 * k + Math.sin(time * 40) * 0.02 * k; }
  if (lying) ctx.translate(0, lift);
  ctx.rotate(rot);
  ctx.scale(sx, sy);

  const bob = (st === S.IDLE) ? Math.sin(time * 3 + m.id) * 1.5 : 0;
  const hipY = -H * 0.36, shoulderY = -H * 0.62 + bob, headY = -H * 0.78 + bob;
  const headR = H * 0.3;
  const bodyW = W * 1.0, bodyH = H * 0.52;

  // piernas
  let lfx = -9, lfy = 0, rfx = 9, rfy = 0;
  if (st === S.WALK) {
    const p = a.walk;
    lfx = Math.sin(p) * 13 * dir; lfy = -Math.max(0, Math.cos(p)) * 8;
    rfx = Math.sin(p + Math.PI) * 13 * dir; rfy = -Math.max(0, Math.cos(p + Math.PI)) * 8;
  } else if (st === S.JUMP || st === S.LAUNCHED || st === S.THROWN) { lfx = -12; lfy = -14; rfx = 12; rfy = -8; }
  else if (st === S.FALLING) { lfx = -12 + Math.sin(m.t * 20) * 6; lfy = -10; rfx = 12 - Math.sin(m.t * 20) * 6; rfy = -12; }
  else if (lying) { lfx = -8; lfy = 4 + Math.sin(time * 4) * 2; rfx = 10; rfy = 2; }
  else if (st === S.PICKUP || st === S.FART) { lfx = -14; rfx = 14; lfy = 4; rfy = 4; }
  limb(ctx, -7, hipY, lfx, lfy, -5, dark, 9);
  limb(ctx, 7, hipY, rfx, rfy, 5, dark, 9);
  shoe(ctx, lfx, lfy, dir, '#fff'); shoe(ctx, rfx, rfy, dir, '#fff');

  const backSh = { x: -dir * W * 0.38, y: shoulderY + 4 };
  const frontSh = { x: dir * W * 0.38, y: shoulderY + 4 };
  let bh, fh;
  const swing = Math.sin(a.walk) * 10;
  switch (st) {
    case S.PUNCH: {
      const p = cfg.punch, t = m.t;
      let ext = 0;
      if (t < p.windup) ext = -0.5 * (t / p.windup);
      else if (t < p.windup + p.active) ext = 1;
      else ext = 1 - (t - p.windup - p.active) / p.recovery;
      fh = { x: dir * (W * 0.4 + ext * (p.range + 6)), y: shoulderY + 6 - ext * 4 };
      bh = { x: -dir * W * 0.55, y: shoulderY + 10 };
      break;
    }
    case S.CARRYING: fh = { x: dir * W * 0.3, y: -H - 2 }; bh = { x: -dir * W * 0.3, y: -H - 2 }; break;
    case S.PICKUP: fh = { x: dir * W * 0.7, y: -6 }; bh = { x: dir * W * 0.4, y: -4 }; break;
    case S.FART: fh = { x: dir * W * 0.55, y: shoulderY + 16 }; bh = { x: -dir * W * 0.55, y: shoulderY + 16 }; break;
    case S.MALLET: {
      const k = cfg.mallet, t = m.t;
      // levanta el mazo atrás, lo barre por abajo al frente y lo regresa
      let ph;
      if (t < k.windup) ph = -0.9 * Math.min(1, t / k.windup);
      else if (t < k.windup + k.active) ph = 1.6;
      else ph = 1.6 - 1.6 * Math.min(1, (t - k.windup - k.active) / k.recovery);
      m._malletPh = ph;
      fh = { x: dir * (W * 0.35 + ph * 22), y: shoulderY + 8 + Math.max(0, ph) * 18 };
      bh = { x: -dir * W * 0.3, y: shoulderY + 14 };
      break;
    }
    case S.JUMP: fh = { x: dir * W * 0.6, y: shoulderY - 18 }; bh = { x: -dir * W * 0.6, y: shoulderY - 14 }; break;
    case S.FALLING: { const f = m.t * 22; fh = { x: dir * W * 0.7, y: shoulderY - 22 + Math.sin(f) * 8 }; bh = { x: -dir * W * 0.7, y: shoulderY - 22 + Math.cos(f) * 8 }; break; }
    case S.LAUNCHED: case S.THROWN: fh = { x: dir * W * 0.8, y: shoulderY - 10 }; bh = { x: -dir * W * 0.8, y: shoulderY + 12 }; break;
    case S.HITSTUN: fh = { x: -dir * W * 0.2, y: shoulderY - 12 }; bh = { x: -dir * W * 0.6, y: shoulderY - 6 }; break;
    case S.KO: case S.CARRIED: fh = { x: dir * W * 0.3, y: shoulderY + 24 + Math.sin(time * 3) * 3 }; bh = { x: -dir * W * 0.45, y: shoulderY + 22 }; break;
    case S.WALK: fh = { x: dir * W * 0.45 + swing * dir, y: shoulderY + 22 }; bh = { x: -dir * W * 0.45 - swing * dir, y: shoulderY + 22 }; break;
    default: fh = { x: dir * W * 0.5, y: shoulderY + 24 + bob }; bh = { x: -dir * W * 0.5, y: shoulderY + 24 + bob };
  }
  limb(ctx, backSh.x, backSh.y, bh.x, bh.y, dir * 8, dark, 9);
  fist(ctx, bh.x, bh.y, 6.5, c);

  if (m.jetpack) drawJetpack(ctx, -dir * W * 0.42, -H * 0.42 + bob, dir, m.thrusting, time, 0.9);
  body(ctx, 0, -4 + bob, bodyW, bodyH + 4, c);

  limb(ctx, frontSh.x, frontSh.y, fh.x, fh.y, -dir * 8, dark, 9);
  if (m.mallet) {
    // ángulo: descansando sobre el hombro; en el golpe barre por el suelo al frente
    let ang = -dir * 0.55;
    if (st === S.MALLET) { const ph = m._malletPh || 0; ang = ph < 0 ? -dir * (0.55 - ph * 1.2) : dir * (Math.PI * 0.45 * (ph / 1.6) + 0.15) - dir * 0.55 * (1 - ph / 1.6); }
    drawMallet(ctx, fh.x, fh.y, ang, 0.85);
  }
  fist(ctx, fh.x, fh.y, 6.5, c);

  let expr = 'normal';
  if (st === S.PUNCH) expr = 'angry';
  else if (st === S.HITSTUN) expr = 'ouch';
  else if (st === S.KO || st === S.CARRIED) expr = 'ko';
  else if (st === S.LAUNCHED || st === S.THROWN || st === S.FALLING) expr = 'scream';
  else if (st === S.CARRYING || st === S.PICKUP) expr = 'strain';
  else if (st === S.FART) expr = 'puff';
  else if (st === S.WALK) expr = 'happy';
  else if (st === S.JUMP) expr = 'worried';
  drawHead(ctx, m.species, dir * 2, headY - headR * 0.35, headR, dir, expr, a.blink, c);

  ctx.restore();

  if (st === S.KO) birds(ctx, m.x + dir * W * 0.6, m.y - H * 0.55, time);
  if (st === S.CARRIED) birds(ctx, m.x + dir * W * 0.6, m.y - H * 0.45, time);
}
