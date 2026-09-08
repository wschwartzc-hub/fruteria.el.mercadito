// Dibujo vectorial de los monitos con animación procedural.
// Nada de sprites: todo son trazos en canvas, así el personaje se puede
// deformar (squash & stretch, brazos de gelatina, caras expresivas).
import { S } from '../core/world.js';

const OUTLINE = '#1d1a24';
const anims = new Map(); // id -> estado de animación (solo visual)

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

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

// Extremidad con "codo": del punto A al B, curvada hacia `bend`.
function limb(ctx, ax, ay, bx, by, bend, color, w) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2;
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const ex = mx + nx * bend, ey = my + ny * bend;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = w + 4;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ex, ey, bx, by); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ex, ey, bx, by); ctx.stroke();
}

function fist(ctx, x, y, r, color) {
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = shade(color, -50); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
}

function shoe(ctx, x, y, dir, color) {
  ctx.fillStyle = OUTLINE;
  ctx.beginPath(); ctx.ellipse(x + dir * 3, y - 3, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x + dir * 3, y - 3, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath(); ctx.ellipse(x + dir * 6, y - 5, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
}

function roundedBlob(ctx, x, y, w, h, color) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.42, y - h);
  ctx.bezierCurveTo(x + w * 0.42, y - h, x + w * 0.62, y - h * 0.65, x + w * 0.55, y - h * 0.15);
  ctx.bezierCurveTo(x + w * 0.5, y + h * 0.05, x - w * 0.5, y + h * 0.05, x - w * 0.55, y - h * 0.15);
  ctx.bezierCurveTo(x - w * 0.62, y - h * 0.65, x - w * 0.42, y - h, x - w * 0.42, y - h);
  ctx.closePath();
  ctx.fillStyle = OUTLINE; ctx.lineWidth = 5; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = color; ctx.fill();
}

// expr: normal | angry | ouch | ko | scream | strain | happy | worried
function face(ctx, x, y, r, dir, expr, blink, color) {
  const ex = x + dir * r * 0.28, ey = y - r * 0.12;
  const gap = r * 0.36;
  const eyeR = r * 0.24;
  const drawEye = (cx, cy) => {
    if (expr === 'ko') {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5); ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5); ctx.stroke();
      return;
    }
    if (expr === 'ouch' || blink > 0) {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 5, cy + (expr === 'ouch' ? 2 : 0)); ctx.lineTo(cx + 5, cy + (expr === 'ouch' ? -2 : 0)); ctx.stroke();
      return;
    }
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(cx, cy, eyeR + 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, eyeR, 0, Math.PI * 2); ctx.fill();
    const pr = expr === 'scream' ? eyeR * 0.35 : eyeR * 0.55;
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(cx + dir * eyeR * 0.3, cy + eyeR * 0.1, pr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + dir * eyeR * 0.15, cy - eyeR * 0.2, pr * 0.35, 0, Math.PI * 2); ctx.fill();
  };
  drawEye(ex - gap, ey); drawEye(ex + gap, ey);

  // cejas
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  const browY = ey - eyeR - 5;
  let tilt = 0; // + = enojado (cae hacia el centro), - = preocupado
  if (expr === 'angry' || expr === 'strain') tilt = 4;
  if (expr === 'worried' || expr === 'scream' || expr === 'ouch') tilt = -4;
  ctx.beginPath();
  ctx.moveTo(ex - gap - 6, browY - tilt * 0.5); ctx.lineTo(ex - gap + 6, browY + tilt);
  ctx.moveTo(ex + gap - 6, browY + tilt); ctx.lineTo(ex + gap + 6, browY - tilt * 0.5);
  ctx.stroke();

  // cachetes
  ctx.fillStyle = 'rgba(255,120,120,.35)';
  ctx.beginPath(); ctx.arc(ex - gap - 4, ey + eyeR + 4, 5, 0, Math.PI * 2); ctx.arc(ex + gap + 4, ey + eyeR + 4, 5, 0, Math.PI * 2); ctx.fill();

  // boca
  const my = y + r * 0.42;
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
  ctx.beginPath();
  switch (expr) {
    case 'happy': case 'normal':
      ctx.moveTo(ex - 7, my); ctx.quadraticCurveTo(ex, my + (expr === 'happy' ? 9 : 5), ex + 7, my); ctx.stroke(); break;
    case 'angry':
      ctx.moveTo(ex - 8, my + 3); ctx.lineTo(ex - 3, my); ctx.lineTo(ex + 2, my + 3); ctx.lineTo(ex + 7, my); ctx.stroke(); break;
    case 'strain':
      ctx.moveTo(ex - 8, my); ctx.lineTo(ex + 8, my); ctx.stroke(); break;
    case 'ouch':
      ctx.moveTo(ex - 7, my + 4); ctx.quadraticCurveTo(ex, my - 4, ex + 7, my + 4); ctx.stroke(); break;
    case 'worried':
      ctx.moveTo(ex - 6, my + 3); ctx.quadraticCurveTo(ex, my - 2, ex + 6, my + 3); ctx.stroke(); break;
    case 'scream':
      ctx.fillStyle = OUTLINE; ctx.ellipse(ex, my + 2, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0607a'; ctx.beginPath(); ctx.ellipse(ex, my + 6, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill(); break;
    case 'ko':
      ctx.moveTo(ex - 6, my); ctx.quadraticCurveTo(ex, my + 3, ex + 6, my); ctx.stroke();
      // lengua
      ctx.fillStyle = '#e0607a'; ctx.beginPath(); ctx.ellipse(ex + dir * 5, my + 6, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke(); break;
    default: break;
  }
}

function hat(ctx, id, x, y, r, dir, color) {
  ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.lineJoin = 'round';
  switch (id % 4) {
    case 0: { // gorra
      ctx.fillStyle = shade(color, -30);
      ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 0.95, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(x + dir * r * 0.2 - (dir < 0 ? r * 1.4 : 0), y - r * 0.28, r * 1.4, 7, 3); ctx.fill(); ctx.stroke();
      break;
    }
    case 1: { // cresta
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.6);
      for (let i = 0; i < 5; i++) { const t = -0.6 + i * 0.3; ctx.lineTo(x + t * r, y - r * 1.5 + Math.abs(t) * r * 0.6); ctx.lineTo(x + (t + 0.15) * r, y - r * 0.75); }
      ctx.lineTo(x + r * 0.6, y - r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    case 2: { // banda
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect(x - r * 0.95, y - r * 0.6, r * 1.9, 8, 3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - dir * r * 0.9, y - r * 0.55); ctx.lineTo(x - dir * r * 1.5, y - r * 0.2); ctx.lineTo(x - dir * r * 1.3, y - r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    default: { // goggles en la frente
      ctx.fillStyle = '#6ad1ff';
      ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.75, r * 0.3, 0, Math.PI * 2); ctx.arc(x + r * 0.35, y - r * 0.75, r * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r * 0.05, y - r * 0.75); ctx.lineTo(x + r * 0.05, y - r * 0.75); ctx.stroke();
    }
  }
}

function birds(ctx, x, y, time) {
  for (let i = 0; i < 3; i++) {
    const a = time * 2.6 + (i * Math.PI * 2) / 3;
    const bx = x + Math.cos(a) * 30, by = y + Math.sin(a) * 9 - 6 + Math.sin(time * 6 + i) * 2;
    const depth = 0.7 + 0.3 * (Math.sin(a) + 1) / 2;
    const flap = Math.sin(time * 18 + i * 2) * 5;
    ctx.save(); ctx.translate(bx, by); ctx.scale(depth, depth);
    ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(-10, -4 - flap); ctx.moveTo(3, -1); ctx.lineTo(10, -4 - flap); ctx.stroke();
    ctx.fillStyle = '#ff8c42'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(10, 1); ctx.lineTo(6, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(3, -1.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

export function drawShadow(ctx, m, roof) {
  if (m.state === S.DEAD || m.state === S.CARRIED) return;
  if (m.x <= roof.x || m.x >= roof.x + roof.w) return;
  const hgt = Math.max(0, roof.y - m.y);
  const k = Math.max(0.35, 1 - hgt / 400);
  ctx.fillStyle = `rgba(0,0,0,${0.22 * k})`;
  ctx.beginPath(); ctx.ellipse(m.x, roof.y + 2, 20 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();
}

export function drawMonito(ctx, m, time, cfg) {
  if (m.state === S.DEAD) return;
  const a = animOf(m);
  const c = m.color, dark = shade(c, -45), light = shade(c, 40);
  const dir = m.facing;
  const H = m.h, W = m.w;
  const st = m.state;
  const inv = m.invuln > 0 && Math.floor(time * 14) % 2 === 0;

  ctx.save();
  ctx.translate(m.x, m.y);
  if (inv) ctx.globalAlpha = 0.55;

  // ---- transformaciones de cuerpo completo por estado ----
  let rot = 0, sx = 1, sy = 1, lift = 0;
  const lying = st === S.KO || st === S.CARRIED;
  if (st === S.LAUNCHED || st === S.THROWN) rot = -dir * m.t * 11;
  if (st === S.FALLING) rot = Math.sin(m.t * 6) * 0.35;
  if (lying) { rot = -dir * Math.PI / 2; lift = -W * 0.45; }
  if (st === S.HITSTUN) { const k = a.shake; ctx.translate((Math.random() - 0.5) * 6 * k, 0); rot = -dir * 0.18 * k; }
  if (a.squash > 0) { sx = 1 + a.squash * 0.28; sy = 1 - a.squash * 0.28; }
  if (st === S.JUMP && !m.onGround) { const k = Math.min(1, Math.abs(m.vy) / 900); sx = 1 - 0.12 * k; sy = 1 + 0.12 * k; }
  if (st === S.PICKUP) { rot = dir * 0.45 * Math.min(1, m.t / 0.15); }
  if (st === S.CARRYING) { sy = 0.94; sx = 1.05; }
  if (st === S.PUNCH) { rot = dir * 0.12; }
  if (lying) { ctx.translate(0, lift); }
  ctx.rotate(rot);
  ctx.scale(sx, sy);

  // ---- puntos de referencia ----
  const bob = (st === S.IDLE) ? Math.sin(time * 3 + m.id) * 1.5 : 0;
  const hipY = -H * 0.36, shoulderY = -H * 0.62 + bob, headY = -H * 0.78 + bob;
  const headR = H * 0.28;
  const bodyW = W * 1.0, bodyH = H * 0.52;

  // ---- piernas ----
  let lfx = -9, lfy = 0, rfx = 9, rfy = 0;
  if (st === S.WALK) {
    const p = a.walk;
    lfx = Math.sin(p) * 13 * dir; lfy = -Math.max(0, Math.cos(p)) * 8;
    rfx = Math.sin(p + Math.PI) * 13 * dir; rfy = -Math.max(0, Math.cos(p + Math.PI)) * 8;
  } else if (st === S.JUMP || st === S.LAUNCHED || st === S.THROWN) {
    lfx = -12; lfy = -14; rfx = 12; rfy = -8;
  } else if (st === S.FALLING) {
    lfx = -12 + Math.sin(m.t * 20) * 6; lfy = -10; rfx = 12 - Math.sin(m.t * 20) * 6; rfy = -12;
  } else if (lying) {
    lfx = -8; lfy = 4 + Math.sin(time * 4) * 2; rfx = 10; rfy = 2;
  } else if (st === S.PICKUP) { lfx = -14; rfx = 14; lfy = 4; rfy = 4; }
  limb(ctx, -7, hipY, lfx, lfy, -5, dark, 9);
  limb(ctx, 7, hipY, rfx, rfy, 5, dark, 9);
  shoe(ctx, lfx, lfy, dir, '#f4f4f4'); shoe(ctx, rfx, rfy, dir, '#f4f4f4');

  // ---- brazo trasero ----
  const backSh = { x: -dir * W * 0.38, y: shoulderY + 4 };
  const frontSh = { x: dir * W * 0.38, y: shoulderY + 4 };
  let bh, fh; // manos
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

  // ---- cuerpo ----
  roundedBlob(ctx, 0, -4 + bob, bodyW, bodyH + 4, c);
  ctx.fillStyle = light; ctx.globalAlpha *= 0.55;
  ctx.beginPath(); ctx.ellipse(dir * 2, -bodyH * 0.45 + bob, bodyW * 0.28, bodyH * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = inv ? 0.55 : 1;
  // ombligo / botón
  ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(dir * 3, -bodyH * 0.3 + bob, 2.2, 0, Math.PI * 2); ctx.fill();

  // ---- brazo frontal ----
  limb(ctx, frontSh.x, frontSh.y, fh.x, fh.y, -dir * 8, dark, 9);
  fist(ctx, fh.x, fh.y, 6.5, c);

  // ---- cabeza ----
  const hx = dir * 2, hy = headY - headR * 0.35;
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(hx, hy, headR + 2.5, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(hx - dir * headR * 0.3, hy - headR * 0.35, headR * 0.2, hx, hy, headR);
  g.addColorStop(0, light); g.addColorStop(1, c);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, headR, 0, Math.PI * 2); ctx.fill();
  // oreja trasera
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(hx - dir * headR * 0.95, hy, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(hx - dir * headR * 0.95, hy, 4.5, 0, Math.PI * 2); ctx.fill();

  let expr = 'normal';
  if (st === S.PUNCH) expr = 'angry';
  else if (st === S.HITSTUN) expr = 'ouch';
  else if (st === S.KO || st === S.CARRIED) expr = 'ko';
  else if (st === S.LAUNCHED || st === S.THROWN || st === S.FALLING) expr = 'scream';
  else if (st === S.CARRYING || st === S.PICKUP) expr = 'strain';
  else if (st === S.WALK) expr = 'happy';
  else if (st === S.JUMP) expr = 'worried';
  face(ctx, hx, hy, headR, dir, expr, a.blink, c);
  hat(ctx, m.id, hx, hy, headR, dir, c);

  ctx.restore();

  // ---- pajaritos (en espacio de mundo, arriba de la cabeza tumbada) ----
  if (st === S.KO) birds(ctx, m.x + dir * W * 0.6, m.y - H * 0.55, time);
  if (st === S.CARRIED) birds(ctx, m.x + dir * W * 0.6, m.y - H * 0.45, time);
}
