// Partículas, textos flotantes y screen shake. Consume eventos del mundo.
const OUTLINE = '#3a2a25';

export class Effects {
  constructor() { this.parts = []; this.shake = 0; this.flash = 0; }

  handle(ev, world) {
    switch (ev.type) {
      case 'hit':
        this.stars(ev.x, ev.y, 6);
        if (ev.cancelled) this.text(ev.x, ev.y - 40, '¡CANCELADO!', '#fff', 26);
        else if (ev.combo > 1) this.text(ev.x, ev.y - 40, `x${ev.combo}`, '#ffd23f', 30);
        else this.text(ev.x + ev.dir * 20, ev.y - 30, ['¡POW!', '¡PAF!', '¡ZAS!'][Math.floor(Math.random() * 3)], '#fff', 24);
        this.shake = Math.max(this.shake, 0.25);
        break;
      case 'combo':
        this.text(ev.x, ev.y - 50, '¡COMBO! ¡A VOLAR!', '#ff6b35', 34);
        this.ring(ev.x, ev.y + 30, 90, '#ffd23f');
        this.shake = Math.max(this.shake, 0.6);
        break;
      case 'ko':
        this.dust(ev.x, ev.y, 12);
        this.stars(ev.x, ev.y - 40, 8);
        this.shake = Math.max(this.shake, 0.4);
        break;
      case 'land': this.dust(ev.x, ev.y, 5); break;
      case 'explode':
        this.explosion(ev.x, ev.y, ev.radius);
        this.shake = Math.max(this.shake, 1);
        this.flash = 0.25;
        break;
      case 'squash':
        this.text(ev.x, ev.y - 30, '¡PLOC!', '#fff', 28);
        this.stars(ev.x, ev.y, 8);
        this.shake = Math.max(this.shake, 0.4);
        break;
      case 'fallOff': {
        const m = world.get(ev.id);
        this.text(m.x, world.roof.y - 60, '¡ADIÓS!', m.color, 34);
        break;
      }
      case 'breakFree': {
        const m = world.get(ev.id);
        this.text(m.x, m.y - 90, '¡ME ZAFÉ!', '#fff', 24);
        break;
      }
      case 'eat': {
        this.text(ev.x, ev.y - 10, '¡ÑAM!', '#ffd23f', 24);
        this.stars(ev.x, ev.y + 20, 3);
        break;
      }
      case 'fart':
        this.ring(ev.x, ev.y, ev.radius, '#8fd15a');
        this.text(ev.x, ev.y - 70, '¡PRRRT!', '#a5e06a', 40);
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
          this.parts.push({ type: 'smoke', x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.8 + Math.random() * 0.6, max: 1.4, size: 14 + Math.random() * 16, color: 'rgba(150,205,90,.55)' });
        }
        this.shake = Math.max(this.shake, 0.5);
        break;
      case 'gassed': {
        const m = world.get(ev.id);
        this.text(m.x, m.y - 100, '¡GUÁCALA!', '#9be26a', 26);
        break;
      }
      case 'jetpackPickup': this.text(ev.x, ev.y - 20, '¡JET PACK!', '#6ad1ff', 28); this.stars(ev.x, ev.y + 20, 5); break;
      case 'jetpackSave': this.text(ev.x, ev.y - 30, '¡SALVADO!', '#6ad1ff', 32); this.ring(ev.x, ev.y + 30, 60, '#6ad1ff'); break;
      case 'jetpackEmpty': this.text(ev.x, ev.y - 20, '¡SIN GAS!', '#ff8a8a', 24); this.dust(ev.x, ev.y + 30, 6); break;
      case 'mash': {
        const a = Math.random() * Math.PI * 2;
        this.parts.push({ type: 'star', x: ev.x + Math.cos(a) * 20, y: ev.y, vx: Math.cos(a) * 80, vy: -160, life: 0.35, max: 0.35, rot: 0, size: 5, color: '#ffd23f' });
        break;
      }
      case 'wake': { const m = world.get(ev.id); this.text(m.x, m.y - 90, '¿eh?', '#fff', 22); break; }
      default: break;
    }
  }

  text(x, y, str, color, size) { this.parts.push({ type: 'text', x, y, vx: 0, vy: -60, life: 0.9, max: 0.9, str, color, size }); }
  ring(x, y, r, color) { this.parts.push({ type: 'ring', x, y, r, life: 0.35, max: 0.35, color }); }
  stars(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 220;
      this.parts.push({ type: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 0.5 + Math.random() * 0.3, max: 0.8, rot: Math.random() * 6, size: 6 + Math.random() * 6, color: ['#ffd23f', '#fff', '#ff8c42'][i % 3] });
    }
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.PI + Math.random() * Math.PI, sp = 40 + Math.random() * 120;
      this.parts.push({ type: 'dust', x, y, vx: Math.cos(a) * sp * 2, vy: Math.sin(a) * sp * 0.4, life: 0.5 + Math.random() * 0.4, max: 0.9, size: 5 + Math.random() * 8, color: 'rgba(120,110,100,.55)' });
    }
  }
  explosion(x, y, R) {
    this.ring(x, y, R, '#fff'); this.ring(x, y, R * 0.6, '#ff6b35');
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, sp = 200 + Math.random() * 500;
      this.parts.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 150, life: 0.4 + Math.random() * 0.5, max: 0.9, size: 3 + Math.random() * 5, color: ['#ffd23f', '#ff6b35', '#ff3d3d'][i % 3] });
    }
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 120;
      this.parts.push({ type: 'smoke', x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.8 + Math.random() * 0.7, max: 1.5, size: 18 + Math.random() * 22, color: 'rgba(60,55,60,.6)' });
    }
    for (let i = 0; i < 8; i++) { // tablas del barril
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 300 + Math.random() * 400;
      this.parts.push({ type: 'plank', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.4, max: 1.4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, color: '#8a5a2b' });
    }
    this.text(x, y - 60, '¡BOOM!', '#ff6b35', 44);
  }

  step(dt) {
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.flash = Math.max(0, this.flash - dt);
    for (const p of this.parts) {
      p.life -= dt;
      if (p.type === 'ring' || p.type === 'text') { if (p.type === 'text') p.y += p.vy * dt; continue; }
      const g = p.type === 'smoke' ? -80 : p.type === 'dust' ? 200 : 1200;
      p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'plank') p.rot += p.vr * dt;
      if (p.type === 'smoke') p.size += 25 * dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.parts) {
      const k = Math.max(0, p.life / p.max);
      ctx.save();
      switch (p.type) {
        case 'text':
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.font = `900 ${p.size}px "Arial Black", Impact, sans-serif`;
          ctx.textAlign = 'center'; ctx.lineJoin = 'round';
          ctx.lineWidth = 6; ctx.strokeStyle = OUTLINE; ctx.strokeText(p.str, p.x, p.y);
          ctx.fillStyle = p.color; ctx.fillText(p.str, p.x, p.y);
          break;
        case 'ring':
          ctx.globalAlpha = k; ctx.lineWidth = 6 * k + 2; ctx.strokeStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.3 - k), 0, Math.PI * 2); ctx.stroke();
          break;
        case 'star': {
          ctx.globalAlpha = k; ctx.translate(p.x, p.y); ctx.rotate(p.rot + (1 - k) * 6);
          ctx.fillStyle = p.color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const r = i % 2 ? p.size * 0.45 : p.size; const a = (i / 10) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          break;
        }
        case 'spark':
          ctx.globalAlpha = k; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2); ctx.fill();
          break;
        case 'dust': case 'smoke':
          ctx.globalAlpha = k * 0.9; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          break;
        case 'plank':
          ctx.globalAlpha = Math.min(1, k * 3); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(-10, -3, 20, 6, 2); ctx.fill(); ctx.stroke();
          break;
        default: break;
      }
      ctx.restore();
    }
  }
}
