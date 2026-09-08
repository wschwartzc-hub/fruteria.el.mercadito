// Escenario según la referencia: torre cartoon con piso alto morado, pisos
// amarillos, toldos en las ventanas, barandal y bandera en la azotea, árbol
// al lado, ciudad lavanda al fondo. También barriles y frijoles.
import { B } from '../core/world.js';
import { OUTLINE } from './monito.js';

const P = {
  skyTop: '#5cb5ee', skyBottom: '#d6efff', cloud: '#ffffff',
  city: '#cbb9ea', city2: '#dfd3f3',
  purple: '#9a63d6', purpleDark: '#7a4bb6', purpleLight: '#b98ae6',
  yellow: '#f2c53d', yellowDark: '#d9a52a', brick: '#e0a23a',
  glass: '#8fcdf0', glassLight: '#c8e9fb', awning: '#7d8bab', frame: '#f7f2e8',
  wood: '#a86b34', woodDark: '#7d4c22', leaf: '#5cb44a', leafLight: '#83d16a', trunk: '#8a5a2b',
  metal: '#8d93a6', flag: '#f28c28',
};

function rr(ctx, x, y, w, h, r, fill, lw = 4) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill; ctx.fill();
  if (lw) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw; ctx.stroke(); }
}

function cloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
  ctx.arc(x + 30 * s, y - 12 * s, 34 * s, 0, Math.PI * 2);
  ctx.arc(x + 68 * s, y - 4 * s, 28 * s, 0, Math.PI * 2);
  ctx.arc(x + 96 * s, y + 8 * s, 20 * s, 0, Math.PI * 2);
  ctx.rect(x - 10 * s, y, 116 * s, 22 * s);
  ctx.fillStyle = P.cloud; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(x, y, 26 * s, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 30 * s, y - 12 * s, 34 * s, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(x + 68 * s, y - 4 * s, 28 * s, Math.PI * 1.25, Math.PI * 1.95);
  ctx.arc(x + 96 * s, y + 8 * s, 20 * s, Math.PI * 1.4, Math.PI * 0.5);
  ctx.lineTo(x, y + 22 * s);
  ctx.stroke();
}

function window_(ctx, x, y, w, h, awning) {
  rr(ctx, x - 4, y - 4, w + 8, h + 8, 4, P.frame, 3);
  rr(ctx, x, y, w, h, 2, P.glass, 3);
  ctx.fillStyle = P.glassLight; ctx.fillRect(x + 4, y + 4, w * 0.35, h - 8);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
  if (awning) {
    ctx.beginPath(); ctx.moveTo(x - 8, y - 6); ctx.lineTo(x + w + 8, y - 6); ctx.lineTo(x + w + 14, y + 14); ctx.lineTo(x - 2, y + 14); ctx.closePath();
    ctx.fillStyle = P.awning; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 6, y - 4, w - 12, 5);
  }
}

function tree(ctx, x, base) {
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 16; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + 6, base - 150); ctx.stroke();
  ctx.strokeStyle = P.trunk; ctx.lineWidth = 11; ctx.stroke();
  const blobs = [[0, -190, 46], [-44, -160, 36], [46, -165, 38], [-20, -215, 30], [24, -220, 32], [0, -150, 34]];
  ctx.beginPath(); for (const [dx, dy, r] of blobs) { ctx.moveTo(x + dx + r, base + dy); ctx.arc(x + dx, base + dy, r, 0, Math.PI * 2); }
  ctx.fillStyle = P.leaf; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4; ctx.stroke();
  ctx.beginPath(); for (const [dx, dy, r] of blobs) { ctx.moveTo(x + dx - r * 0.2 + r * 0.5, base + dy - r * 0.3); ctx.arc(x + dx - r * 0.2, base + dy - r * 0.3, r * 0.5, 0, Math.PI * 2); }
  ctx.fillStyle = P.leafLight; ctx.fill();
}

export function drawBackground(ctx, W, H, roof, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, P.skyTop); sky.addColorStop(1, P.skyBottom);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  const drift = (time * 10) % (W + 300);
  cloud(ctx, ((80 + drift) % (W + 300)) - 150, 110, 1.1);
  cloud(ctx, ((640 + drift * 0.7) % (W + 300)) - 150, 70, 0.8);
  cloud(ctx, ((1000 + drift * 0.5) % (W + 300)) - 150, 170, 0.95);

  // ciudad lavanda al fondo (dos planos)
  ctx.fillStyle = P.city2;
  for (const [x, y, w] of [[-20, 330, 130], [120, 380, 90], [1100, 300, 120], [1210, 360, 100]]) ctx.fillRect(x, y, w, H - y);
  ctx.fillStyle = P.city;
  for (const [x, y, w] of [[40, 420, 110], [1010, 400, 70], [1140, 440, 150]]) { ctx.fillRect(x, y, w, H - y); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, H - y + 10); }

  const bx = roof.x, by = roof.y, bw = roof.w;
  tree(ctx, bx + bw + 60, H + 10);

  // --- azotea: lo que está detrás de los monitos ---
  // barandal (sólo al fondo; los bordes quedan libres para caer)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(bx + 90, by - 46); ctx.lineTo(bx + bw - 90, by - 46); ctx.moveTo(bx + 90, by - 26); ctx.lineTo(bx + bw - 90, by - 26); ctx.stroke();
  ctx.strokeStyle = P.metal; ctx.lineWidth = 3; ctx.stroke();
  for (let x = bx + 90; x <= bx + bw - 90; x += 60) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, by - 52); ctx.lineTo(x, by - 4); ctx.stroke();
    ctx.strokeStyle = P.metal; ctx.lineWidth = 3; ctx.stroke();
  }
  // aire acondicionado y tinaco al fondo
  rr(ctx, bx + 120, by - 60, 70, 54, 6, '#b9bfcc');
  ctx.fillStyle = '#8d93a6'; ctx.fillRect(bx + 128, by - 52, 54, 30); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.strokeRect(bx + 128, by - 52, 54, 30);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(bx + 132, by - 46 + i * 7); ctx.lineTo(bx + 178, by - 46 + i * 7); ctx.stroke(); }
  // bandera
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(bx + bw - 70, by - 6); ctx.lineTo(bx + bw - 70, by - 150); ctx.stroke();
  ctx.strokeStyle = P.metal; ctx.lineWidth = 3; ctx.stroke();
  const wave = Math.sin(time * 4) * 6;
  ctx.beginPath(); ctx.moveTo(bx + bw - 70, by - 148); ctx.quadraticCurveTo(bx + bw - 40, by - 150 + wave, bx + bw - 10, by - 140); ctx.lineTo(bx + bw - 12, by - 105); ctx.quadraticCurveTo(bx + bw - 40, by - 112 - wave, bx + bw - 70, by - 110); ctx.closePath();
  ctx.fillStyle = P.flag; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();

  // --- edificio ---
  // pisos amarillos (abajo)
  ctx.fillStyle = P.yellow; ctx.fillRect(bx, by + 96, bw, H - by);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5; ctx.strokeRect(bx, by + 96, bw, H - by);
  ctx.fillStyle = P.brick;
  for (let i = 0; i < 5; i++) { ctx.fillRect(bx + 12, by + 120 + i * 34, 26, 8); ctx.fillRect(bx + bw - 38, by + 137 + i * 34, 26, 8); }
  for (let c = 0; c < 4; c++) window_(ctx, bx + 110 + c * 200, by + 130, 90, 70, false);
  // balcón de madera a la derecha
  rr(ctx, bx + bw - 200, by + 150, 170, 14, 3, P.wood);
  for (let i = 0; i < 6; i++) rr(ctx, bx + bw - 195 + i * 30, by + 118, 12, 34, 2, P.woodDark, 2);
  rr(ctx, bx + bw - 200, by + 112, 170, 8, 2, P.wood, 3);
  // piso alto morado
  ctx.fillStyle = P.purple; ctx.fillRect(bx, by, bw, 100);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5; ctx.strokeRect(bx, by, bw, 100);
  ctx.fillStyle = P.purpleDark; ctx.fillRect(bx, by + 80, bw, 20);
  ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(bx + bw - 70, by, 70, 100);
  for (let c = 0; c < 4; c++) window_(ctx, bx + 110 + c * 200, by + 24, 90, 52, true);
  // pretil / borde de la azotea
  rr(ctx, bx - 8, by - 10, bw + 16, 20, 5, P.purpleLight, 4);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx - 4, by - 7, bw + 8, 5);
}

export function drawBean(ctx, b, roof, time) {
  if (b.state === 'gone') return;
  if (b.state === 'falling' && b.x > roof.x && b.x < roof.x + roof.w) {
    ctx.fillStyle = 'rgba(40,20,60,.2)'; ctx.beginPath(); ctx.ellipse(b.x, roof.y + 2, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.translate(b.x, b.y - b.h / 2 + (b.state === 'rest' ? Math.sin(time * 5) * 2 : 0));
  ctx.rotate(b.state === 'falling' ? Math.sin(b.spin) * 0.6 : -0.3);
  const w = b.w, h = b.h;
  ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8f3f2e'; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#b8563f'; ctx.beginPath(); ctx.ellipse(-w * 0.12, -h * 0.15, w * 0.28, h * 0.22, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(w * 0.05, h * 0.05, w * 0.16, h * 0.1, 0, 0, Math.PI * 2); ctx.fill(); // ojito del frijol
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  if (b.state === 'rest') { // brillito para que se vea comestible
    const k = (Math.sin(time * 6) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * k})`;
    ctx.beginPath(); ctx.moveTo(b.x + 16, b.y - 30); ctx.lineTo(b.x + 19, b.y - 24); ctx.lineTo(b.x + 25, b.y - 22); ctx.lineTo(b.x + 19, b.y - 20); ctx.lineTo(b.x + 16, b.y - 14); ctx.lineTo(b.x + 13, b.y - 20); ctx.lineTo(b.x + 7, b.y - 22); ctx.lineTo(b.x + 13, b.y - 24); ctx.closePath(); ctx.fill();
  }
}

export function drawBarrel(ctx, b, roof, time) {
  if (b.state === B.GONE) return;
  if (b.state === B.WARNING) {
    const k = 1 - b.fuse / 1.2;
    ctx.fillStyle = `rgba(40,20,60,${0.15 + 0.3 * k})`;
    ctx.beginPath(); ctx.ellipse(b.x, roof.y + 2, 10 + 22 * k, 4 + 6 * k, 0, 0, Math.PI * 2); ctx.fill();
    const blink = Math.floor(time * 8) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3d3d' : '#ffd23f'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x, 18); ctx.lineTo(b.x + 18, 50); ctx.lineTo(b.x - 18, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = OUTLINE; ctx.font = '900 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('!', b.x, 46);
    return;
  }
  if (b.state === B.FALLING && b.armed && b.x > roof.x && b.x < roof.x + roof.w) {
    const hgt = Math.max(0, roof.y - b.y);
    const k = Math.max(0.3, 1 - hgt / 700);
    ctx.fillStyle = `rgba(40,20,60,${0.35 * k})`;
    ctx.beginPath(); ctx.ellipse(b.x, roof.y + 2, 28 * k, 8 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.translate(b.x, b.y - b.h / 2);
  ctx.rotate(b.state === B.THROWN ? b.spin : b.state === B.FALLING ? Math.sin(b.spin) * 0.25 : 0);
  if (b.state === B.EXPLODING) ctx.scale(1.1, 0.9);
  const w = b.w, h = b.h;
  rr(ctx, -w / 2, -h / 2, w, h, 9, '#a3642e', 4);
  ctx.fillStyle = '#c47d3a'; ctx.fillRect(-w / 2 + 5, -h / 2 + 4, 8, h - 8);
  ctx.fillStyle = '#6b6b6b';
  ctx.fillRect(-w / 2, -h / 2 + 8, w, 6); ctx.fillRect(-w / 2, h / 2 - 14, w, 6);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2 + 8, w, 6); ctx.strokeRect(-w / 2, h / 2 - 14, w, 6);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -2, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-5, 0, 10, 6);
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.arc(3, -3, 2, 0, Math.PI * 2); ctx.fill();
  if (b.state === B.THROWN || b.state === B.EXPLODING) {
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.quadraticCurveTo(8, -h / 2 - 10, 4, -h / 2 - 16); ctx.stroke();
    ctx.fillStyle = Math.floor(time * 20) % 2 ? '#ffd23f' : '#ff6b35'; ctx.beginPath(); ctx.arc(4, -h / 2 - 17, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
