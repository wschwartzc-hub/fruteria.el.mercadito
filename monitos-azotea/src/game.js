// Ensambla todo: mundo + render + input + HUD + bot.
import { CFG } from './core/config.js';
import { World, S, B } from './core/world.js';
import { drawMonito, drawShadow, stepMonitoAnim } from './render/monito.js';
import { drawBackground, drawBarrel } from './render/scene.js';
import { Effects } from './render/effects.js';
import { botInput } from './bot.js';
import { TouchControls } from './touch.js';

export const VIEW = { w: 1280, h: 720 };
const OUTLINE = '#1d1a24';

// Mapas de teclado por jugador.
const KEYMAPS = [
  { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'], punch: ['KeyF', 'KeyJ'], grab: ['KeyG', 'KeyK'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], punch: ['Comma', 'KeyO'], grab: ['Period', 'KeyP'] },
];

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.ctx = canvas.getContext('2d');
    this.keys = new Set();
    this.pressed = new Set();
    this.effects = new Effects();
    this.mode = 'menu'; // menu | playing | over
    this.players = [];   // { id, kind: 'key'|'touch'|'bot', keymap?, touchIndex? }
    this.acc = 0; this.last = performance.now(); this.time = 0;
    this.isTouch = TouchControls.isTouchDevice();
    document.body.classList.toggle('touch', this.isTouch);
    this.touch = new TouchControls(ui.touch);
    this.bindInput();
    this.bindUI();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame((t) => this.frame(t));
  }

  bindUI() {
    for (const b of this.ui.menu.querySelectorAll('[data-mode]')) {
      b.addEventListener('click', () => { this.goFullscreen(); this.startMode(b.dataset.mode); });
    }
    this.ui.over.querySelector('#rematch').addEventListener('click', () => this.startMode(this.lastMode));
    this.ui.over.querySelector('#tomenu').addEventListener('click', () => this.showMenu());
  }

  // En celular: pantalla completa y bloquear en horizontal (si el navegador lo permite).
  goFullscreen() {
    if (!this.isTouch) return;
    const el = document.documentElement;
    const p = el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.();
    Promise.resolve(p).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  }

  showMenu() {
    this.mode = 'menu';
    this.ui.menu.hidden = false; this.ui.over.hidden = true;
    this.touch.setup(0);
  }

  // Modos del menú. En táctil los humanos usan la pantalla; en escritorio, el teclado.
  startMode(mode) {
    this.lastMode = mode;
    const human = (i) => (this.isTouch ? { kind: 'touch', touchIndex: i } : { kind: 'key', keymap: i });
    const bot = { kind: 'bot' };
    const modes = {
      solo1: [human(0), bot], solo2: [human(0), bot, bot],
      duo: [human(0), human(1)], duo2: [human(0), human(1), bot, bot],
    };
    this.start(modes[mode] || modes.solo1);
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code); this.pressed.add(e.code);
      if (this.mode === 'menu') this.menuKey(e.code);
      else if (this.mode === 'over' && (e.code === 'KeyR' || e.code === 'Enter')) this.startMode(this.lastMode);
      else if (e.code === 'Escape') this.showMenu();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  menuKey(code) {
    const map = { Digit1: 'solo1', Digit2: 'duo', Digit3: 'solo2', Digit4: 'duo2' };
    if (map[code]) this.startMode(map[code]);
  }

  start(players) {
    this.world = new World();
    this.players = players.map((p, i) => ({ id: i, ...p }));
    for (const p of this.players) this.world.addMonito({ total: players.length, name: p.kind === 'bot' ? `Bot ${p.id + 1}` : `Jugador ${p.id + 1}` });
    this.effects = new Effects();
    this.mode = 'playing';
    this.overT = 0;
    this.ui.menu.hidden = true; this.ui.over.hidden = true;
    this.touch.setup(this.players.filter((p) => p.kind === 'touch').length);
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
      else if (p.kind === 'touch') inp = this.touch.read(p.touchIndex) || { left: false, right: false, jump: false, punch: false, grab: false };
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
        if (ev.type === 'matchOver') this.finish(ev.winnerId);
      }
      this.effects.step(dtReal);
      if (this.mode === 'over') this.overT += dtReal;
    }
    this.pressed.clear();
    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  finish(winnerId) {
    this.mode = 'over';
    const win = winnerId != null ? this.world.get(winnerId) : null;
    this.ui.winner.textContent = win ? `¡GANA ${win.name.toUpperCase()}!` : 'EMPATE';
    this.ui.winner.style.color = win ? win.color : '#fff';
    this.touch.setup(0);
    setTimeout(() => { if (this.mode === 'over') this.ui.over.hidden = false; }, 900);
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

    if (this.mode !== 'menu') this.drawHUD(ctx, W, H);
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
}
