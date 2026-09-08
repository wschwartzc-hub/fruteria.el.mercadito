// Escenario: cielo, nubes garabateadas (como el boceto), edificio y azotea.
// También el dibujo de los barriles.
import { B } from '../core/world.js';

const OUTLINE = '#1d1a24';

// Nube "a mano": polígono irregular determinista por semilla.
function cloud(ctx, x, y, w, h, seed) {
  ctx.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + 0.22 * Math.sin(seed + i * 2.3) + 0.12 * Math.cos(seed * 1.7 + i * 4.1);
    const px = x + Math.cos(a) * w * 0.5 * r, py = y + Math.sin(a) * h * 0.5 * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
}

export function drawBackground(ctx, W, H, roof, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#7ec8f5'); sky.addColorStop(0.6, '#cfeefe'); sky.addColorStop(1, '#f6e7c9');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // sol
  ctx.fillStyle = '#ffe680'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W - 150, 110, 46, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // nubes (se desplazan lentamente)
  const drift = (time * 12) % (W + 400);
  cloud(ctx, ((160 + drift) % (W + 400)) - 200, 120, 260, 120, 1);
  cloud(ctx, ((820 + drift * 0.7) % (W + 400)) - 200, 170, 220, 100, 4);
  cloud(ctx, ((1150 + drift * 0.5) % (W + 400)) - 200, 80, 180, 80, 7);

  // ciudad de fondo
  ctx.fillStyle = '#b8d4e6';
  const seedRects = [[0, 300, 120, 500], [130, 360, 90, 500], [230, 260, 70, 600], [1010, 330, 110, 600], [1140, 280, 140, 600], [900, 400, 80, 400]];
  for (const [x, y, w, h] of seedRects) { ctx.fillRect(x, y, w, h); }
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (const [x, y, w] of seedRects) for (let yy = y + 16; yy < roof.y + 200; yy += 26) for (let xx = x + 10; xx < x + w - 10; xx += 22) ctx.fillRect(xx, yy, 10, 12);

  // edificio principal (igual que el boceto: ventanas irregulares)
  const bx = roof.x, by = roof.y, bw = roof.w;
  ctx.fillStyle = '#f2dfc4'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.rect(bx, by, bw, H - by + 10); ctx.fill(); ctx.stroke();
  // sombra lateral
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(bx + bw - 60, by, 60, H - by);
  // ventanas
  ctx.lineWidth = 3.5;
  const cols = 6, rows = 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const wx = bx + 70 + c * ((bw - 140) / (cols - 1)) - 40, wy = by + 50 + r * 80;
    const wob = Math.sin(c * 3.1 + r * 7) * 4;
    ctx.fillStyle = (c + r) % 3 === 0 ? '#fff3b0' : '#9fd3f2';
    ctx.beginPath();
    ctx.moveTo(wx, wy + wob); ctx.lineTo(wx + 80, wy - wob); ctx.lineTo(wx + 82, wy + 56 + wob * 0.5); ctx.lineTo(wx - 2, wy + 58); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(wx + 6, wy + 6, 20, 14);
  }
  // pretil / borde de la azotea
  ctx.fillStyle = '#e4c9a5';
  ctx.beginPath(); ctx.roundRect(bx - 10, by - 10, bw + 20, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#cdb28f'; ctx.fillRect(bx - 10, by + 2, bw + 20, 8);
  // antena + tinaco (decoración, sin colisión)
  ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE;
  ctx.beginPath(); ctx.moveTo(bx + bw - 90, by - 10); ctx.lineTo(bx + bw - 90, by - 110); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx + bw - 110, by - 90); ctx.lineTo(bx + bw - 70, by - 90); ctx.moveTo(bx + bw - 104, by - 70); ctx.lineTo(bx + bw - 76, by - 70); ctx.stroke();
  ctx.fillStyle = '#d9d9d9';
  ctx.beginPath(); ctx.roundRect(bx + 40, by - 70, 70, 60, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#bcbcbc'; ctx.beginPath(); ctx.ellipse(bx + 75, by - 70, 35, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

export function drawBarrel(ctx, b, roof, time) {
  if (b.state === B.GONE) return;
  if (b.state === B.WARNING) {
    // sombra que crece + señal de peligro
    const k = 1 - b.fuse / 1.2;
    ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.3 * k})`;
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
    ctx.fillStyle = `rgba(0,0,0,${0.35 * k})`;
    ctx.beginPath(); ctx.ellipse(b.x, roof.y + 2, 28 * k, 8 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.translate(b.x, b.y - b.h / 2);
  ctx.rotate(b.state === B.THROWN ? b.spin : b.state === B.FALLING ? Math.sin(b.spin) * 0.25 : 0);
  if (b.state === B.EXPLODING) ctx.scale(1.1, 0.9);
  const w = b.w, h = b.h;
  ctx.fillStyle = '#a3642e'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c47d3a'; ctx.fillRect(-w / 2 + 5, -h / 2 + 4, 8, h - 8);
  ctx.fillStyle = '#6b6b6b';
  ctx.fillRect(-w / 2, -h / 2 + 8, w, 6); ctx.fillRect(-w / 2, h / 2 - 14, w, 6);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2 + 8, w, 6); ctx.strokeRect(-w / 2, h / 2 - 14, w, 6);
  // calavera
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -2, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-5, 0, 10, 6);
  ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.arc(3, -3, 2, 0, Math.PI * 2); ctx.fill();
  if (b.state === B.THROWN || b.state === B.EXPLODING) { // mecha encendida
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.quadraticCurveTo(8, -h / 2 - 10, 4, -h / 2 - 16); ctx.stroke();
    ctx.fillStyle = Math.floor(time * 20) % 2 ? '#ffd23f' : '#ff6b35'; ctx.beginPath(); ctx.arc(4, -h / 2 - 17, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
