// Ensambla todo: mundo + render + input + HUD + bot.
import { CFG } from './core/config.js';
import { World, S, B } from './core/world.js';
import { drawMonito, drawShadow, stepMonitoAnim } from './render/monito.js';
import { drawBackground, drawBarrel } from './render/scene.js';
import { Effects } from './render/effects.js';
import { botInput } from './bot.js';

export const VIEW = { w: 1280, h: 720 };
const OUTLINE = '#1d1a24';

// Mapas de teclado por jugador.
const KEYMAPS = [
  { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'], punch: ['KeyF', 'KeyJ'], grab: ['KeyG', 'KeyK'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], punch: ['Comma', 'KeyO'], grab: ['Period', 'KeyP'] },
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.keys = new Set();
    this.pressed = new Set();
    this.effects = new Effects();
    this.mode = 'menu'; // menu | playing | over
    this.players = [];   // { id, kind: 'key'|'pad'|'bot', keymap?, padIndex? }
    this.acc = 0; this.last = performance.now(); this.time = 0;
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame((t) => this.frame(t));
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code); this.pressed.add(e.code);
      if (this.mode === 'menu') this.menuKey(e.code);
      else if (this.mode === 'over' && (e.code === 'KeyR' || e.code === 'Enter')) this.mode = 'menu';
      else if (e.code === 'Escape') this.mode = 'menu';
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  menuKey(code) {
    if (code === 'Digit1') this.start([{ kind: 'key', keymap: 0 }, { kind: 'bot' }]);
    if (code === 'Digit2') this.start([{ kind: 'key', keymap: 0 }, { kind: 'key', keymap: 1 }]);
    if (code === 'Digit3') this.start([{ kind: 'key', keymap: 0 }, { kind: 'key', keymap: 1 }, { kind: 'bot' }]);
    if (code === 'Digit4') this.start([{ kind: 'key', keymap: 0 }, { kind: 'key', keymap: 1 }, { kind: 'bot' }, { kind: 'bot' }]);
  }

  start(players) {
    this.world = new World();
    this.players = players.map((p, i) => ({ id: i, ...p }));
    for (const p of this.players) this.world.addMonito({ total: players.length, name: p.kind === 'bot' ? `Bot ${p.id + 1}` : `Jugador ${p.id + 1}` });
    this.effects = new Effects();
    this.mode = 'playing';
    this.overT = 0;
  }

  // Lee input de todos los jugadores para este tick.
  readInputs() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const inputs = [];
    let padIdx = 0;
    for (const p of this.players) {
      const m = this.world.get(p.id);
      let inp;
      if (p.kind === 'bot') inp = botInput(this.world, m, this.time);
      else {
        const km = KEYMAPS[p.keymap];
        const has = (arr) => arr.some((k) => this.keys.has(k));
        const hit = (arr) => arr.some((k) => this.pressed.has(k));
        inp = { left: has(km.left), right: has(km.right), jump: hit(km.jump), punch: hit(km.punch), grab: hit(km.grab) };
        // gamepad opcional: el N-ésimo control se suma al N-ésimo jugador humano
        const pad = pads[padIdx++];
        if (pad) {
          const ax = pad.axes[0] || 0;
          const btn = (i) => !!pad.buttons[i]?.pressed;
          const prev = (p.padPrev ||= {});
          const edge = (name, v) => { const r = v && !prev[name]; prev[name] = v; return r; };
          inp.left ||= ax < -0.4 || btn(14); inp.right ||= ax > 0.4 || btn(15);
          inp.jump ||= edge('jump', btn(0)); inp.punch ||= edge('punch', btn(2)); inp.grab ||= edge('grab', btn(1));
        }
      }
      inputs[p.id] = inp;
    }
    return inputs;
  }

  frame(now) {
    const dtReal = Math.min(0.1, (now - this.last) / 1000);
    this.last = now; this.time += dtReal;
    if (this.mode === 'playing' || this.mode === 'over') {
      const STEP = 1 / 120;
      this.acc += dtReal;
      let steps = 0;
      while (this.acc >= STEP && steps < 8) {
        const inputs = this.mode === 'playing' ? this.readInputs() : [];
        this.world.tick(STEP, inputs);
        this.pressed.clear();
        for (const m of this.world.monitos) stepMonitoAnim(m, STEP);
        this.acc -= STEP; steps++;
      }
      for (const ev of this.world.drain()) {
        this.effects.handle(ev, this.world);
        if (ev.type === 'matchOver') { this.mode = 'over'; this.overT = 0; }
      }
      this.effects.step(dtReal);
      if (this.mode === 'over') this.overT += dtReal;
    }
    this.pressed.clear();
    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
    this.canvas.width = VIEW.w * dpr; this.canvas.height = VIEW.h * dpr;
    this.canvas.style.width = `${VIEW.w * scale}px`; this.canvas.style.height = `${VIEW.h * scale}px`;
    this.dpr = dpr;
  }

  draw() {
    const ctx = this.ctx, W = VIEW.w, H = VIEW.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const roof = this.world ? this.world.roof : CFG.roof;
    const sh = this.effects.shake;
    ctx.save();
    if (sh > 0) ctx.translate((Math.random() - 0.5) * 18 * sh, (Math.random() - 0.5) * 12 * sh);
    drawBackground(ctx, W, H, roof, this.time);

    if (this.world) {
      const w = this.world;
      for (const m of w.monitos) drawShadow(ctx, m, roof);
      for (const b of w.barrels) drawBarrel(ctx, b, roof, this.time);
      // Orden de dibujo: los KO al fondo, los que cargan al frente con su carga encima.
      const order = [...w.monitos].sort((a, b) => (a.state === S.KO ? -1 : 0) - (b.state === S.KO ? -1 : 0));
      for (const m of order) drawMonito(ctx, m, this.time, CFG);
      this.effects.draw(ctx);
      this.drawOverheads(ctx, w);
    }
    ctx.restore();
    if (this.effects.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.effects.flash * 2})`; ctx.fillRect(0, 0, W, H); }

    if (this.mode === 'menu') this.drawMenu(ctx, W, H);
    else { this.drawHUD(ctx, W, H); if (this.mode === 'over') this.drawOver(ctx, W, H); }
  }

  drawOverheads(ctx, w) {
    for (const m of w.monitos) {
      if (m.state === S.DEAD) continue;
      const lying = m.state === S.KO || m.state === S.CARRIED;
      const topY = m.y - (lying ? m.w * 0.9 : m.h) - 14;
      // etiqueta de jugador
      ctx.font = '700 13px Arial'; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; ctx.strokeText(m.name, m.x, topY - 6);
      ctx.fillStyle = m.color; ctx.fillText(m.name, m.x, topY - 6);
      // temporizador de KO
      if (m.state === S.KO || m.state === S.CARRIED) {
        const k = Math.max(0, m.koTimer / CFG.ko.duration);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(m.x, topY - 30, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(m.x, topY - 30, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
      }
      // combo en curso
      if (m.combo.count > 0 && w.time - m.combo.lastAt < CFG.combo.window) {
        ctx.font = '900 18px "Arial Black", Impact, sans-serif';
        ctx.lineWidth = 5; ctx.strokeStyle = OUTLINE; ctx.strokeText(`${m.combo.count}/${CFG.combo.hitsToLaunch}`, m.x + 30, topY - 24);
        ctx.fillStyle = '#ffd23f'; ctx.fillText(`${m.combo.count}/${CFG.combo.hitsToLaunch}`, m.x + 30, topY - 24);
      }
    }
  }

  drawHUD(ctx, W) {
    const w = this.world;
    const cardW = 230;
    w.monitos.forEach((m, i) => {
      const x = 20 + i * (cardW + 12), y = 16;
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(x, y, cardW, 58, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(x + 30, y + 29, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = OUTLINE; ctx.font = '800 16px Arial'; ctx.textAlign = 'left';
      ctx.fillText(m.name, x + 58, y + 24);
      for (let s = 0; s < CFG.match.stocks; s++) {
        ctx.fillStyle = s < m.stocks ? '#ff4d6d' : '#ddd';
        ctx.beginPath(); ctx.arc(x + 66 + s * 20, y + 42, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = OUTLINE; ctx.font = '700 13px Arial';
      ctx.fillText(`KOs: ${m.score}`, x + 150, y + 46);
    });
  }

  drawMenu(ctx, W, H) {
    ctx.fillStyle = 'rgba(20,18,30,.55)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = '900 72px "Arial Black", Impact, sans-serif'; ctx.lineJoin = 'round';
    ctx.lineWidth = 10; ctx.strokeStyle = OUTLINE; ctx.strokeText('MONITOS EN LA AZOTEA', W / 2, 170);
    ctx.fillStyle = '#ffd23f'; ctx.fillText('MONITOS EN LA AZOTEA', W / 2, 170);
    const lines = [
      '[1]  1 jugador vs Bot', '[2]  2 jugadores (teclado)', '[3]  2 jugadores + 1 Bot', '[4]  2 jugadores + 2 Bots', '',
      'J1: A / D mover · W saltar · F golpear · G agarrar/aventar',
      'J2: ← / → mover · ↑ saltar · , golpear · . agarrar/aventar',
      'Gamepad: stick mover · A saltar · X golpear · B agarrar', '',
      '4 golpes seguidos = ¡a volar! · Levanta al desmayado y aviéntalo al vacío',
      'Cuidado con los barriles que caen del cielo',
    ];
    ctx.font = '700 24px Arial'; ctx.fillStyle = '#fff'; ctx.lineWidth = 6;
    lines.forEach((l, i) => { ctx.strokeText(l, W / 2, 250 + i * 36); ctx.fillText(l, W / 2, 250 + i * 36); });
  }

  drawOver(ctx, W, H) {
    const w = this.world;
    const win = w.winnerId != null ? w.get(w.winnerId) : null;
    ctx.fillStyle = 'rgba(20,18,30,.45)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.font = '900 64px "Arial Black", Impact, sans-serif';
    ctx.lineWidth = 10; ctx.strokeStyle = OUTLINE;
    const msg = win ? `¡GANA ${win.name.toUpperCase()}!` : 'EMPATE';
    ctx.strokeText(msg, W / 2, H / 2 - 20); ctx.fillStyle = win ? win.color : '#fff'; ctx.fillText(msg, W / 2, H / 2 - 20);
    ctx.font = '700 26px Arial'; ctx.lineWidth = 6; ctx.fillStyle = '#fff';
    ctx.strokeText('R = revancha', W / 2, H / 2 + 40); ctx.fillText('R = revancha', W / 2, H / 2 + 40);
  }
}
