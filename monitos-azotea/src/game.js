// Ensambla todo: mundo + render + input + HUD + bot + sala en línea.
import { CFG } from './core/config.js';
import { World, S, SPECIES } from './core/world.js';
import { drawMonito, drawShadow, stepMonitoAnim, drawHead, drawFartCloud, OUTLINE } from './render/monito.js';
import { drawBackground, drawBarrel, drawBean, drawJetpackItem, drawMalletItem, drawBird } from './render/scene.js';
import { Effects } from './render/effects.js';
import { botInput } from './bot.js';
import { TouchControls } from './touch.js';
import { HostSession, ClientSession, Replica, InputSender, encodeSnapshot, SNAP_INTERVAL } from './net/session.js';
import { normalizeCode } from './net/peer.js';

export const VIEW = { w: 1280, h: 720 };
const NO_INPUT = { left: false, right: false, jump: false, jumpHeld: false, punch: false, grab: false, fart: false };
const SPECIES_COLORS = { mono: '#b07a4f', leon: '#f2a93b', zorro: '#ef8a3c', panda: '#f4f1ec', elefante: '#a9b4c4', jirafa: '#f5c445', pinguino: '#3a4661', buho: '#a0703f' };

// Mapas de teclado por jugador.
const KEYMAPS = [
  { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'], punch: ['KeyF', 'KeyJ'], grab: ['KeyG', 'KeyK'], fart: ['KeyH', 'KeyL'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], punch: ['Comma', 'KeyO'], grab: ['Period', 'KeyP'], fart: ['Slash', 'KeyI'] },
];

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.ctx = canvas.getContext('2d');
    this.keys = new Set();
    this.pressed = new Set();
    this.effects = new Effects();
    this.mode = 'menu'; // menu | playing | over | lobby | client
    this.players = [];   // { id, kind: 'key'|'touch'|'bot'|'remote', keymap?, touchIndex?, slot? }
    this.acc = 0; this.last = performance.now(); this.time = 0;
    this.isTouch = TouchControls.isTouchDevice();
    document.body.classList.toggle('touch', this.isTouch);
    this.touch = new TouchControls(ui.touch);
    this.online = null;   // HostSession | ClientSession
    this.role = null;     // 'host' | 'client'
    this.me = this.loadProfile();
    this.bindInput();
    this.bindUI();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 300));
    // iOS cambia el tamaño visible al abrir/cerrar el teclado sin avisar por 'resize'
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.errorToast = null;
    requestAnimationFrame((t) => this.frame(t));
  }

  // La pantalla no se apaga a media partida (donde el navegador lo permite).
  async keepAwake() {
    try { if (navigator.wakeLock && !this.wakeLock) { this.wakeLock = await navigator.wakeLock.request('screen'); this.wakeLock.addEventListener('release', () => { this.wakeLock = null; }); } } catch (e) { /* no disponible */ }
  }

  // ---------- perfil (nombre y animal) ----------
  loadProfile() {
    let p = { name: '', species: 'mono' };
    try { p = { ...p, ...JSON.parse(localStorage.getItem('monitos.profile') || '{}') }; } catch (e) { /* sin perfil */ }
    if (!SPECIES.includes(p.species)) p.species = 'mono';
    return p;
  }
  saveProfile() { try { localStorage.setItem('monitos.profile', JSON.stringify(this.me)); } catch (e) { /* privado */ } }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if (typing) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code); this.pressed.add(e.code);
      if (this.mode === 'menu') this.menuKey(e.code);
      else if (this.mode === 'over' && (e.code === 'KeyR' || e.code === 'Enter') && this.role !== 'client') this.rematch();
      else if (e.code === 'Escape' && this.role == null) this.showMenu();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  menuKey(code) {
    const map = { Digit1: 'solo1', Digit2: 'duo', Digit3: 'solo2', Digit4: 'duo2' };
    if (map[code]) this.startMode(map[code]);
  }

  bindUI() {
    const u = this.ui;
    for (const b of u.menu.querySelectorAll('[data-mode]')) b.addEventListener('click', () => { this.goFullscreen(); this.startMode(b.dataset.mode); });
    u.menu.querySelector('#btn-online').addEventListener('click', () => this.showOnline());
    u.over.querySelector('#rematch').addEventListener('click', () => this.rematch());
    u.over.querySelector('#tomenu').addEventListener('click', () => this.leaveToMenu());
    // panel en línea
    u.online.querySelector('#online-back').addEventListener('click', () => this.showMenu());
    u.online.querySelector('#btn-create').addEventListener('click', () => this.createRoom());
    u.online.querySelector('#btn-join').addEventListener('click', () => this.joinRoom());
    u.online.querySelector('#join-code').addEventListener('input', (e) => { e.target.value = normalizeCode(e.target.value); });
    u.online.querySelector('#join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.joinRoom(); });
    u.online.querySelector('#my-name').addEventListener('input', (e) => { this.me.name = e.target.value.slice(0, 14); this.saveProfile(); });
    u.online.querySelector('#my-avatar').addEventListener('click', () => this.cycleSpecies());
    // sala
    u.room.querySelector('#room-leave').addEventListener('click', () => this.leaveToMenu());
    u.room.querySelector('#room-start').addEventListener('click', () => this.hostStart());
    u.room.querySelector('#room-bot').addEventListener('click', () => { if (this.role === 'host') this.online.addBot(); });
    u.room.querySelector('#room-nobots').addEventListener('click', () => { if (this.role === 'host') this.online.removeBots(); });
    u.room.querySelector('#room-avatar').addEventListener('click', () => this.cycleSpecies());
  }

  goFullscreen() {
    if (!this.isTouch) return;
    const el = document.documentElement;
    const p = el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.();
    Promise.resolve(p).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  }

  hideAll() { for (const k of ['menu', 'over', 'online', 'room']) this.ui[k].hidden = true; }

  showMenu() {
    this.closeOnline();
    this.mode = 'menu';
    this.hideAll(); this.ui.menu.hidden = false;
    this.touch.setup(0);
  }

  // ---------- modos locales ----------
  startMode(mode) {
    this.lastMode = mode;
    const human = (i) => (this.isTouch ? { kind: 'touch', touchIndex: i } : { kind: 'key', keymap: i });
    const bot = { kind: 'bot' };
    const modes = { solo1: [human(0), bot], solo2: [human(0), bot, bot], duo: [human(0), human(1)], duo2: [human(0), human(1), bot, bot] };
    const list = modes[mode] || modes.solo1;
    // el jugador local usa su animal favorito; los demás toman los que sigan
    const used = new Set([this.me.species]);
    const pick = () => { const s = SPECIES.find((x) => !used.has(x)) || SPECIES[0]; used.add(s); return s; };
    this.start(list.map((p, i) => ({ ...p, species: i === 0 ? this.me.species : pick(), name: i === 0 && this.me.name ? this.me.name : undefined })));
  }

  start(players) {
    this.world = new World();
    this.players = players.map((p, i) => ({ id: i, ...p }));
    for (const p of this.players) {
      const m = this.world.addMonito({ total: players.length, species: p.species, name: p.name });
      if (p.kind === 'bot' && !p.name) m.name = `${m.name} (bot)`;
    }
    this.effects = new Effects();
    this.mode = 'playing';
    this.hideAll();
    document.activeElement?.blur?.(); // cierra el teclado si venía de escribir
    this.touch.setup(this.players.filter((p) => p.kind === 'touch').length);
    this.snapTimer = 0;
    this.keepAwake();
    setTimeout(() => this.resize(), 350);
  }

  rematch() {
    if (this.role === 'host') { this.hostStart(); return; }
    if (this.role === 'client') return;
    this.startMode(this.lastMode);
  }

  // ---------- entrada ----------
  localInput(p) {
    if (p.kind === 'touch') { const inp = this.touch.read(p.touchIndex) || NO_INPUT; return inp; }
    const km = KEYMAPS[p.keymap];
    const has = (arr) => arr.some((k) => this.keys.has(k));
    const hit = (arr) => arr.some((k) => this.pressed.has(k));
    const inp = { left: has(km.left), right: has(km.right), jump: hit(km.jump), jumpHeld: has(km.jump), punch: hit(km.punch), grab: hit(km.grab), fart: hit(km.fart) };
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const pad = pads[p.keymap];
    if (pad) {
      const ax = pad.axes[0] || 0;
      const btn = (i) => !!pad.buttons[i]?.pressed;
      const prev = (p.padPrev ||= {});
      const edge = (name, v) => { const r = v && !prev[name]; prev[name] = v; return r; };
      inp.left ||= ax < -0.4 || btn(14); inp.right ||= ax > 0.4 || btn(15);
      inp.jump ||= edge('jump', btn(0)); inp.jumpHeld ||= btn(0); inp.punch ||= edge('punch', btn(2)); inp.grab ||= edge('grab', btn(1)); inp.fart ||= edge('fart', btn(3));
    }
    return inp;
  }

  readInputs() {
    const inputs = [];
    for (const p of this.players) {
      const m = this.world.get(p.id);
      let inp;
      if (p.kind === 'bot') inp = botInput(this.world, m, this.time);
      else if (p.kind === 'remote') inp = this.online.inputs.read(p.id);
      else inp = this.localInput(p);
      if (p.kind === 'touch') this.touch.setBeans(p.touchIndex, m.beans);
      inputs[p.id] = inp;
    }
    return inputs;
  }

  // ---------- loop ----------
  frame(now) {
    const dtReal = Math.min(0.1, (now - this.last) / 1000);
    this.last = now; this.time += dtReal;
    // Si el tamaño visible cambió (teclado, barra del navegador), reajustar.
    if (window.innerWidth !== this.sizedW || window.innerHeight !== this.sizedH) this.resize();
    // Un error en un frame no debe congelar el juego: se muestra y se sigue.
    try {
      if (this.mode === 'playing' || this.mode === 'over') {
        if (this.role === 'client') this.clientFrame(dtReal);
        else this.simFrame(dtReal);
      }
      this.pressed.clear();
      this.draw();
    } catch (e) {
      this.pressed.clear();
      this.errorToast = { text: `Ups: ${e && e.message ? e.message : e}`, until: this.time + 8 };
      console.error(e);
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  simFrame(dtReal) {
    const STEP = 1 / 120;
    this.acc += dtReal;
    let steps = 0;
    const events = [];
    while (this.acc >= STEP && steps < 8) {
      const inputs = this.mode === 'playing' ? this.readInputs() : [];
      this.world.tick(STEP, inputs);
      this.pressed.clear();
      for (const m of this.world.monitos) stepMonitoAnim(m, STEP);
      this.acc -= STEP; steps++;
    }
    for (const ev of this.world.drain()) {
      events.push(ev);
      this.effects.handle(ev, this.world);
      if (ev.type === 'matchOver') this.finish(ev.winnerId);
    }
    this.effects.step(dtReal);
    if (this.role === 'host') {
      this.pendingEvents = (this.pendingEvents || []).concat(events);
      this.snapTimer += dtReal;
      if (this.snapTimer >= SNAP_INTERVAL) {
        this.snapTimer = 0;
        this.online.broadcastSnapshot(encodeSnapshot(this.world, this.pendingEvents));
        this.pendingEvents = [];
      }
    }
  }

  clientFrame(dtReal) {
    const rep = this.world;
    if (this.mode === 'playing') {
      const p = this.players[0];
      const inp = this.localInput(p);
      if (p.kind === 'touch') this.touch.setBeans(0, rep.get(this.online.slot)?.beans || 0);
      this.sender.push(inp, this.time);
    }
    rep.interpolate(this.time);
    for (const m of rep.monitos) stepMonitoAnim(m, dtReal);
    for (const ev of rep.drain()) {
      this.effects.handle(ev, rep);
      if (ev.type === 'matchOver') this.finish(ev.winnerId);
    }
    this.effects.step(dtReal);
  }

  finish(winnerId) {
    if (this.mode === 'over') return;
    this.mode = 'over';
    const win = winnerId != null ? this.world.get(winnerId) : null;
    this.ui.winner.textContent = win ? `¡GANA ${win.name.toUpperCase()}!` : 'EMPATE';
    this.ui.winner.style.color = win ? win.color : '#fff';
    this.touch.setup(0);
    const rematchBtn = this.ui.over.querySelector('#rematch');
    rematchBtn.hidden = this.role === 'client';
    this.ui.over.querySelector('#over-wait').hidden = this.role !== 'client';
    setTimeout(() => { if (this.mode === 'over') this.ui.over.hidden = false; }, 900);
  }

  // ---------- en línea: panel ----------
  showOnline() {
    this.mode = 'menu';
    this.hideAll(); this.ui.online.hidden = false;
    this.ui.online.querySelector('#my-name').value = this.me.name;
    this.setStatus('');
    this.paintAvatar(this.ui.online.querySelector('#my-avatar'), this.me.species);
  }
  setStatus(text, isError = false) {
    for (const el of [this.ui.online.querySelector('#online-status'), this.ui.room.querySelector('#room-status')]) { el.textContent = text; el.classList.toggle('error', isError); }
  }
  cycleSpecies() {
    this.me.species = SPECIES[(SPECIES.indexOf(this.me.species) + 1) % SPECIES.length];
    this.saveProfile();
    this.paintAvatar(this.ui.online.querySelector('#my-avatar'), this.me.species);
    this.paintAvatar(this.ui.room.querySelector('#room-avatar'), this.me.species);
    if (this.role === 'host') this.online.setMySpecies(this.me.species);
    if (this.role === 'client') this.online.setSpecies(this.me.species);
  }
  paintAvatar(canvas, species, expr = 'normal') {
    const dpr = 2, size = canvas.clientWidth || 64;
    canvas.width = size * dpr; canvas.height = size * dpr;
    const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    c.beginPath(); c.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2); c.fillStyle = ['#fde7a9', '#cfe6f7', '#f7cdd0', '#dbeed0'][SPECIES.indexOf(species) % 4]; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 3; c.stroke();
    c.save(); c.beginPath(); c.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2); c.clip();
    drawHead(c, species, size / 2, size / 2 + size * 0.06, size * 0.3, 1, expr, 0, SPECIES_COLORS[species]);
    c.restore();
  }
  myName() { const n = (this.me.name || '').trim(); return n || (this.isTouch ? 'Jugador' : 'Jugador'); }

  async createRoom() {
    if (this.online) return;
    this.setStatus('Creando sala…');
    this.online = new HostSession(); this.role = 'host';
    this.online.onRoster = (players) => { this.paintRoster(players, 0); this.adoptSpecies(players, 0); };
    this.online.onLeaveInGame = (slot) => { const p = this.players[slot]; if (p && p.kind === 'remote') { p.kind = 'bot'; const m = this.world.get(slot); m.name = `${m.name} (se fue)`; } };
    try {
      const code = await this.online.open({ name: this.myName(), species: this.me.species });
      this.showRoom(code);
    } catch (e) { this.closeOnline(); this.setStatus(e.message, true); }
  }

  async joinRoom() {
    if (this.online) return;
    const code = normalizeCode(this.ui.online.querySelector('#join-code').value);
    if (code.length < 4) { this.setStatus('Escribe el código de 4 letras de la sala.', true); return; }
    this.setStatus('Buscando la sala…');
    this.online = new ClientSession(); this.role = 'client';
    this.online.onRoster = (players, you) => { this.paintRoster(players, you); this.adoptSpecies(players, you); };
    this.online.onStart = (players, you) => this.clientStart(players, you);
    this.online.onSnapshot = (snap) => { if (this.world && this.world.apply) this.world.apply(snap, this.time); };
    this.online.onLobbyBack = () => { this.mode = 'lobby'; this.hideAll(); this.ui.room.hidden = false; this.touch.setup(0); };
    this.online.onClosed = (why) => { this.leaveToMenu(); this.showOnline(); this.setStatus(why || 'Se perdió la conexión con la sala.', true); };
    try {
      await this.online.join(code, { name: this.myName(), species: this.me.species });
      this.showRoom(code);
      this.setStatus('Esperando a que el anfitrión empiece…');
    } catch (e) { this.closeOnline(); this.setStatus(e.message, true); }
  }

  showRoom(code) {
    this.mode = 'lobby';
    this.hideAll(); this.ui.room.hidden = false;
    this.ui.room.querySelector('#room-code').textContent = code;
    const isHost = this.role === 'host';
    for (const id of ['#room-start', '#room-bot', '#room-nobots']) this.ui.room.querySelector(id).hidden = !isHost;
    this.ui.room.querySelector('#room-hint').textContent = isHost ? 'Pásales este código a tus amigos. Empieza cuando estén todos.' : 'Esperando a que el anfitrión empiece…';
    this.paintAvatar(this.ui.room.querySelector('#room-avatar'), this.me.species);
    this.setStatus('');
  }

  // Si en la sala ya estaba tomado mi animal, el anfitrión me asignó otro.
  adoptSpecies(players, you) {
    const me = players.find((p) => p.slot === you);
    if (!me || me.species === this.me.species) return;
    this.me.species = me.species; this.saveProfile();
    this.paintAvatar(this.ui.room.querySelector('#room-avatar'), this.me.species);
    this.paintAvatar(this.ui.online.querySelector('#my-avatar'), this.me.species);
    this.setStatus(`Ese animal ya estaba tomado: ahora eres ${me.species}.`);
  }

  paintRoster(players, you) {
    const list = this.ui.room.querySelector('#room-players');
    list.innerHTML = '';
    players.forEach((p) => {
      const li = document.createElement('div');
      li.className = 'room-player' + (p.slot === you ? ' me' : '');
      const cv = document.createElement('canvas'); cv.className = 'room-av'; cv.style.width = '44px'; cv.style.height = '44px';
      const name = document.createElement('span'); name.textContent = p.name + (p.host ? ' · anfitrión' : '') + (p.bot ? ' · bot' : '');
      li.appendChild(cv); li.appendChild(name); list.appendChild(li);
      requestAnimationFrame(() => this.paintAvatar(cv, p.species));
    });
    const count = this.ui.room.querySelector('#room-count');
    count.textContent = `${players.length} / ${CFG.match.maxPlayers}`;
    const startBtn = this.ui.room.querySelector('#room-start');
    startBtn.disabled = players.length < 2;
    startBtn.textContent = players.length < 2 ? 'Esperando a alguien más…' : `Empezar con ${players.length}`;
    this.ui.room.querySelector('#room-bot').disabled = players.length >= CFG.match.maxPlayers;
  }

  hostStart() {
    if (this.role !== 'host') return;
    const players = this.online.start();
    const human = this.isTouch ? { kind: 'touch', touchIndex: 0 } : { kind: 'key', keymap: 0 };
    this.start(players.map((p, i) => (i === 0 ? { ...human, species: p.species, name: p.name } : p.bot ? { kind: 'bot', species: p.species, name: `${p.name} ${i}` } : { kind: 'remote', species: p.species, name: p.name })));
    this.goFullscreen();
  }

  clientStart(players, you) {
    this.world = new Replica(players);
    this.players = [this.isTouch ? { id: 0, kind: 'touch', touchIndex: 0 } : { id: 0, kind: 'key', keymap: 0 }];
    this.sender = new InputSender((msg) => this.online.sendInput(msg));
    this.effects = new Effects();
    this.mode = 'playing';
    this.hideAll();
    document.activeElement?.blur?.();
    this.touch.setup(this.isTouch ? 1 : 0);
    this.goFullscreen();
    this.keepAwake();
    setTimeout(() => this.resize(), 350);
  }

  closeOnline() {
    if (this.online) { try { this.online.close(); } catch (e) { /* ya cerrado */ } }
    this.online = null; this.role = null; this.sender = null;
  }
  leaveToMenu() { this.showMenu(); }

  // ---------- dibujo ----------
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.sizedW = window.innerWidth; this.sizedH = window.innerHeight;
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
    if (this.world && (this.mode === 'playing' || this.mode === 'over')) {
      const w = this.world;
      for (const m of w.monitos) drawShadow(ctx, m, roof);
      for (const b of w.beans) drawBean(ctx, b, roof, this.time);
      for (const j of w.jetpacks) drawJetpackItem(ctx, j, roof, this.time);
      for (const it of w.mallets) drawMalletItem(ctx, it, roof, this.time);
      for (const b of w.barrels) drawBarrel(ctx, b, roof, this.time);
      const order = [...w.monitos].sort((a, b) => (a.state === S.KO ? -1 : 0) - (b.state === S.KO ? -1 : 0));
      for (const m of order) drawMonito(ctx, m, this.time, CFG);
      for (const m of w.monitos) drawFartCloud(ctx, m, this.time);
      for (const b of w.birds) drawBird(ctx, b, this.time);
      this.effects.draw(ctx);
      this.drawOverheads(ctx, w);
    }
    ctx.restore();
    if (this.effects.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.effects.flash * 2})`; ctx.fillRect(0, 0, W, H); }
    if (this.world && (this.mode === 'playing' || this.mode === 'over')) this.drawHUD(ctx, W, H);
    // aviso de señal (cliente en línea) y errores
    if (this.role === 'client' && this.world && this.world.nextAt != null && this.mode === 'playing') {
      const silence = this.time - this.world.nextAt;
      if (silence > 1.5) {
        ctx.textAlign = 'center'; ctx.font = '900 26px "Arial Black", Impact, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = OUTLINE;
        const msg = silence > 8 ? 'Se perdió al anfitrión…' : `Sin señal del anfitrión (${Math.floor(silence)} s)`;
        ctx.strokeText(msg, W / 2, H / 2); ctx.fillStyle = '#ffd23f'; ctx.fillText(msg, W / 2, H / 2);
      }
    }
    if (this.errorToast && this.time < this.errorToast.until) {
      ctx.textAlign = 'left'; ctx.font = '700 13px Arial';
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(10, H - 34, Math.min(W - 20, this.errorToast.text.length * 7.5 + 20), 24);
      ctx.fillStyle = '#ffb4b4'; ctx.fillText(this.errorToast.text.slice(0, 150), 20, H - 17);
    }
  }

  // Etiquetas de "este eres tú": TÚ cuando hay un humano local, J1/J2 cuando hay dos.
  localLabels() {
    const labels = new Map();
    if (this.role === 'client') { labels.set(this.online.slot, 'TÚ'); return labels; }
    const humans = this.players.filter((p) => p.kind === 'touch' || p.kind === 'key');
    if (humans.length === 1) labels.set(humans[0].id, 'TÚ');
    else humans.forEach((p, i) => labels.set(p.id, `J${i + 1}`));
    return labels;
  }

  drawOverheads(ctx, w) {
    const labels = this.localLabels();
    const pulse = (Math.sin(this.time * 6) + 1) / 2;
    for (const m of w.monitos) {
      if (m.state === S.DEAD) continue;
      const lying = m.state === S.KO || m.state === S.CARRIED;
      const topY = m.y - (lying ? m.w * 0.9 : m.h) - 14;
      const tag = labels.get(m.id);
      if (tag) { // halo bajo los pies para encontrarte de un vistazo
        ctx.save(); ctx.globalAlpha = 0.55 + 0.3 * pulse;
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(m.x, m.y + 3, 30 + pulse * 3, 9, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
      }
      ctx.font = '700 13px Arial'; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; ctx.strokeText(m.name, m.x, topY - 6);
      ctx.fillStyle = tag ? '#fff' : m.color; ctx.fillText(m.name, m.x, topY - 6);
      if (tag) { // flecha grande que rebota + etiqueta
        const by = topY - 26 - pulse * 8;
        ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(m.x, by); ctx.lineTo(m.x - 13, by - 18); ctx.lineTo(m.x - 5, by - 18); ctx.lineTo(m.x - 5, by - 34); ctx.lineTo(m.x + 5, by - 34); ctx.lineTo(m.x + 5, by - 18); ctx.lineTo(m.x + 13, by - 18); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.font = '900 16px "Arial Black", Impact, sans-serif';
        ctx.lineWidth = 5; ctx.strokeStyle = OUTLINE; ctx.strokeText(tag, m.x, by - 40);
        ctx.fillStyle = '#ffd23f'; ctx.fillText(tag, m.x, by - 40);
      }
      if (m.mallet) { // usos del mazo
        ctx.font = '900 13px "Arial Black", Impact, sans-serif';
        ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; ctx.strokeText(`🔨×${m.mallet.uses}`, m.x - 34, topY - 24);
        ctx.fillStyle = '#ff8c42'; ctx.fillText(`🔨×${m.mallet.uses}`, m.x - 34, topY - 24);
      }
      if (m.jetpack) { // medidor de gasolina
        const k = Math.max(0, Math.min(1, m.jetpack.fuel / CFG.jetpack.fuel));
        ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.roundRect(m.x - 22, topY - 2, 44, 8, 4); ctx.fill();
        ctx.fillStyle = k > 0.3 ? '#ff8c42' : '#ff3d3d'; ctx.beginPath(); ctx.roundRect(m.x - 20, topY, 40 * k, 4, 2); ctx.fill();
      }
      if ((m.state === S.KO || m.state === S.CARRIED) && m.id === mine && Math.floor(this.time * 4) % 2 === 0) {
        ctx.font = '900 16px "Arial Black", Impact, sans-serif';
        ctx.lineWidth = 5; ctx.strokeStyle = OUTLINE; ctx.strokeText('¡MACHACA GOLPE!', m.x, topY - 48);
        ctx.fillStyle = '#ffd23f'; ctx.fillText('¡MACHACA GOLPE!', m.x, topY - 48);
      }
      if (m.state === S.KO || m.state === S.CARRIED) {
        const k = Math.max(0, m.koTimer / CFG.ko.duration);
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(m.x, topY - 30, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(m.x, topY - 30, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
      }
      if (m.combo.count > 0) {
        ctx.font = '900 18px "Arial Black", Impact, sans-serif';
        ctx.lineWidth = 5; ctx.strokeStyle = OUTLINE; ctx.strokeText(`${m.combo.count}/${CFG.combo.hitsToLaunch}`, m.x + 30, topY - 24);
        ctx.fillStyle = '#ffd23f'; ctx.fillText(`${m.combo.count}/${CFG.combo.hitsToLaunch}`, m.x + 30, topY - 24);
      }
    }
  }

  drawHUD(ctx, W) {
    const w = this.world;
    const n = w.monitos.length;
    const cardW = n <= 4 ? 230 : 150, gap = 10;
    const startX = Math.max(12, (W - (n * cardW + (n - 1) * gap)) / 2);
    const labels = this.localLabels();
    w.monitos.forEach((m, i) => {
      const x = startX + i * (cardW + gap), y = 14;
      const mine = labels.has(m.id);
      ctx.fillStyle = mine ? '#fff3b0' : 'rgba(255,255,255,.88)'; ctx.strokeStyle = mine ? '#ffd23f' : OUTLINE; ctx.lineWidth = mine ? 5 : 3;
      ctx.beginPath(); ctx.roundRect(x, y, cardW, 58, 12); ctx.fill(); ctx.stroke();
      if (mine) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = OUTLINE; ctx.font = '900 10px Arial'; ctx.textAlign = 'right'; ctx.fillText(labels.get(m.id), x + cardW - 8, y + 14); }
      const pastel = ['#fde7a9', '#cfe6f7', '#f7cdd0', '#dbeed0'][i % 4];
      ctx.beginPath(); ctx.arc(x + 30, y + 29, 22, 0, Math.PI * 2); ctx.fillStyle = pastel; ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(x + 30, y + 29, 21, 0, Math.PI * 2); ctx.clip();
      drawHead(ctx, m.species, x + 30, y + 32, 13, 1, m.stocks > 0 ? 'normal' : 'ko', 0, m.color);
      ctx.restore();
      ctx.fillStyle = OUTLINE; ctx.font = `800 ${n <= 4 ? 15 : 12}px Arial`; ctx.textAlign = 'left';
      ctx.fillText(m.name.slice(0, n <= 4 ? 18 : 10), x + 60, y + 23);
      for (let s = 0; s < CFG.match.stocks; s++) {
        ctx.fillStyle = s < m.stocks ? '#ff4d6d' : '#ddd';
        ctx.beginPath(); ctx.arc(x + 66 + s * 16, y + 42, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (n <= 4) { ctx.fillStyle = OUTLINE; ctx.font = '700 12px Arial'; ctx.fillText(`KOs ${m.score}`, x + 132, y + 46); }
      for (let b = 0; b < m.beans; b++) { ctx.beginPath(); ctx.ellipse(x + (n <= 4 ? 190 : 118) + b * 12, y + 42, 5.5, 4, -0.4, 0, Math.PI * 2); ctx.fillStyle = '#8f3f2e'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); }
    });
  }
}
