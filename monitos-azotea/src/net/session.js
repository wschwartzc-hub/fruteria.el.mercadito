// Sala (lobby) y partida en línea. El anfitrión corre el mundo real y manda
// "fotos" del estado 20 veces por segundo; los demás mandan sus botones y
// dibujan la última foto (interpolando entre dos para que se vea fluido).
import { HostNet, ClientNet, normalizeCode } from './peer.js';
import { createMonito, SPECIES } from '../core/world.js';
import { CFG } from '../core/config.js';

export const SNAP_INTERVAL = 0.05; // s
const r1 = (v) => Math.round(v * 10) / 10;

// ---------- codificación de fotos ----------
export function encodeSnapshot(world, events) {
  return {
    t: 'snap', time: r1(world.time), over: world.over, winnerId: world.winnerId,
    m: world.monitos.map((m) => [m.id, r1(m.x), r1(m.y), r1(m.vx), r1(m.vy), m.facing, m.state, r1(m.t), r1(m.koTimer), r1(m.invuln), m.beans, r1(m.fartCloud), m.stocks, m.score, m.combo.count, r1(m.combo.lastAt), m.onGround ? 1 : 0, m.carriedById ?? -1, m.jetpack ? r1(m.jetpack.fuel) : -1, m.thrusting ? 1 : 0, m.mallet ? m.mallet.uses : -1, r1(m.karate)]),
    b: world.barrels.map((b) => [b.id, r1(b.x), r1(b.y), b.state, b.armed ? 1 : 0, r1(b.fuse), r1(b.spin), r1(b.t)]),
    f: world.beans.map((b) => [b.id, r1(b.x), r1(b.y), b.state, r1(b.spin)]),
    j: world.jetpacks.map((j) => [j.id, r1(j.x), r1(j.y), j.state, r1(j.spin)]),
    k: world.mallets.map((it) => [it.id, r1(it.x), r1(it.y), it.state, r1(it.spin)]),
    q: world.karates.map((it) => [it.id, r1(it.x), r1(it.y), it.state, r1(it.spin)]),
    p: world.birds.map((b) => [b.id, r1(b.x), r1(b.y), b.dir, r1(b.flap)]),
    ev: events.map((e) => { const { t, ...rest } = e; return rest; }),
  };
}

// Réplica del mundo del lado del cliente: sólo lo que el render necesita.
export class Replica {
  constructor(players) {
    this.roof = { ...CFG.roof };
    this.time = 0; this.over = false; this.winnerId = null;
    this.monitos = players.map((p, i) => { const m = createMonito(i, this.roof.x + 100, this.roof.y, { species: p.species, name: p.name }); m.justLanded = false; return m; });
    this.barrels = []; this.beans = []; this.jetpacks = []; this.mallets = []; this.karates = []; this.birds = [];
    this.prev = null; this.next = null; this.prevAt = 0; this.nextAt = 0;
    this.events = [];
  }
  get(id) { return this.monitos[id]; }
  apply(snap, now) {
    if (this.next && snap.time < this.next.time) return; // foto vieja que llegó tarde
    this.prev = this.next; this.prevAt = this.nextAt;
    this.next = snap; this.nextAt = now;
    this.time = snap.time; this.over = snap.over; this.winnerId = snap.winnerId;
    for (const row of snap.m) {
      const m = this.monitos[row[0]]; if (!m) continue;
      [, m.tx, m.ty, m.vx, m.vy, m.facing, m.state, m.t, m.koTimer, m.invuln, m.beans, m.fartCloud, m.stocks, m.score, m.combo.count, m.combo.lastAt] = row;
      m.onGround = row[16] === 1; m.carriedById = row[17] < 0 ? null : row[17];
      m.jetpack = row[18] >= 0 ? { fuel: row[18] } : null; m.thrusting = row[19] === 1;
      m.mallet = row[20] >= 0 ? { uses: row[20] } : null; m.karate = row[21] || 0;
      if (m.x == null || m.state === 'dead') { m.x = m.tx; m.y = m.ty; }
      m.px = m.x; m.py = m.y; // punto de partida de la interpolación
      if (Math.hypot(m.tx - m.x, m.ty - m.y) > 200) { m.px = m.tx; m.py = m.ty; } // teletransporte (respawn)
    }
    this.barrels = snap.b.map(([id, x, y, state, armed, fuse, spin, t]) => ({ id, x, y, w: CFG.barrel.w, h: CFG.barrel.h, state, armed: armed === 1, fuse, spin, t, carriedById: null }));
    this.beans = snap.f.map(([id, x, y, state, spin]) => ({ id, x, y, w: CFG.bean.w, h: CFG.bean.h, state, spin }));
    this.jetpacks = (snap.j || []).map(([id, x, y, state, spin]) => ({ id, x, y, w: CFG.jetpack.w, h: CFG.jetpack.h, state, spin }));
    this.mallets = (snap.k || []).map(([id, x, y, state, spin]) => ({ id, x, y, w: CFG.mallet.w, h: CFG.mallet.h, state, spin }));
    this.karates = (snap.q || []).map(([id, x, y, state, spin]) => ({ id, x, y, w: CFG.karate.w, h: CFG.karate.h, state, spin }));
    this.birds = (snap.p || []).map(([id, x, y, dir, flap]) => ({ id, x, y, dir, flap, w: 34, h: 22, state: 'flying' }));
    this.events.push(...snap.ev.map((e) => ({ t: snap.time, ...e })));
  }
  // Avanza la posición dibujada hacia la última foto.
  interpolate(now) {
    if (!this.next) return;
    const span = Math.max(0.02, this.nextAt - this.prevAt || SNAP_INTERVAL);
    const k = Math.min(1, (now - this.nextAt) / span + 0.0);
    for (const m of this.monitos) {
      if (m.tx == null) continue;
      m.x = m.px + (m.tx - m.px) * k; m.y = m.py + (m.ty - m.py) * k;
      // el cargado va pegado a quien lo carga, sin retraso
      if (m.carriedById != null) { const c = this.monitos[m.carriedById]; if (c) { m.x = c.x; m.y = c.y - c.h - 4; } }
    }
  }
  drain() { const e = this.events; this.events = []; return e; }
}

// ---------- entradas remotas (contadores para no perder toques) ----------
export function emptyCounters() { return { l: false, r: false, jh: false, j: 0, p: 0, g: 0, f: 0 }; }

export class RemoteInputs {
  constructor() { this.latest = new Map(); this.seen = new Map(); this.lastSeq = new Map(); }
  receive(slot, msg) {
    // los mensajes pueden llegar desordenados: sólo cuenta el más nuevo
    const seq = msg.seq ?? 0;
    if (seq < (this.lastSeq.get(slot) ?? -1)) return;
    this.lastSeq.set(slot, seq);
    this.latest.set(slot, msg);
  }
  // Convierte contadores en flancos de un tick (uno por tick, se encolan).
  // Si el cliente reinició sus contadores (revancha, reconexión), nos
  // sincronizamos en vez de ignorarlo hasta que "alcance" la cuenta vieja.
  read(slot) {
    const c = this.latest.get(slot) || emptyCounters();
    const s = this.seen.get(slot) || { j: c.j, p: c.p, g: c.g, f: c.f };
    const edge = (k) => {
      if (c[k] < s[k]) { s[k] = c[k]; return false; }
      if (c[k] - s[k] > 30) s[k] = c[k] - 1; // salto enorme: no replicar 100 toques viejos
      if (c[k] > s[k]) { s[k] += 1; return true; }
      return false;
    };
    const out = { left: !!c.l, right: !!c.r, jump: edge('j'), jumpHeld: !!c.jh, punch: edge('p'), grab: edge('g'), fart: edge('f') };
    this.seen.set(slot, s);
    return out;
  }
  forget(slot) { this.latest.delete(slot); this.seen.delete(slot); this.lastSeq.delete(slot); }
}

// Del lado del cliente: acumula flancos locales en contadores y manda cuando cambia.
export class InputSender {
  constructor(send) { this.send = send; this.c = emptyCounters(); this.lastSent = ''; this.lastAt = 0; this.seq = 0; }
  push(inp, now) {
    if (inp.jump) this.c.j++; if (inp.punch) this.c.p++; if (inp.grab) this.c.g++; if (inp.fart) this.c.f++;
    this.c.l = inp.left; this.c.r = inp.right; this.c.jh = !!inp.jumpHeld;
    const key = JSON.stringify(this.c);
    if (key !== this.lastSent || now - this.lastAt > 0.25) { this.send({ t: 'in', seq: this.seq++, ...this.c }); this.lastSent = key; this.lastAt = now; }
  }
}

// ---------- sala ----------
export class HostSession {
  constructor(ui) {
    this.net = new HostNet(); this.ui = ui;
    this.players = []; // { key, name, species, host, bot }
    this.inputs = new RemoteInputs();
    this.onRoster = null; this.onStart = null;
    this.me = { key: 'host', name: 'Anfitrión', species: 'mono', host: true };
    this.playing = false;
  }
  get code() { return this.net.code; }
  async open(me) {
    this.me = { ...this.me, ...me };
    this.players = [this.me];
    this.net.onJoin = (key) => { if (this.players.length >= CFG.match.maxPlayers || this.playing) { this.net.send(key, { t: 'kick', reason: this.playing ? 'La partida ya empezó.' : 'La sala está llena.' }); setTimeout(() => this.net.kick(key), 200); return; } };
    this.net.onLeave = (key) => {
      const i = this.players.findIndex((p) => p.key === key);
      if (i < 0) return;
      if (this.playing) { this.players[i].gone = true; this.inputs.forget(i); if (this.onLeaveInGame) this.onLeaveInGame(i); }
      else { this.players.splice(i, 1); this.roster(); }
    };
    this.net.onMessage = (key, msg) => {
      if (!msg || typeof msg !== 'object') return;
      const i = this.players.findIndex((p) => p.key === key);
      if (msg.t === 'hello') {
        if (i >= 0 || this.players.length >= CFG.match.maxPlayers || this.playing) return;
        this.players.push({ key, name: String(msg.name || 'Amigo').slice(0, 14), species: this.freeSpecies(SPECIES.includes(msg.species) ? msg.species : 'leon'), host: false });
        this.roster();
      } else if (msg.t === 'species' && i >= 0 && !this.playing) {
        if (SPECIES.includes(msg.species)) { this.players[i].species = this.freeSpecies(msg.species, key); this.roster(); }
      } else if (msg.t === 'in' && i >= 0) {
        this.inputs.receive(i, msg);
      }
    };
    const code = await this.net.open();
    this.roster();
    return code;
  }
  // Nadie repite animal en la sala: si el que pides está tomado, el siguiente libre.
  freeSpecies(wanted, exceptKey = null) {
    const used = new Set(this.players.filter((p) => p.key !== exceptKey).map((p) => p.species));
    if (!used.has(wanted)) return wanted;
    const start = SPECIES.indexOf(wanted);
    for (let k = 1; k < SPECIES.length; k++) { const sp = SPECIES[(start + k) % SPECIES.length]; if (!used.has(sp)) return sp; }
    return wanted;
  }
  addBot() {
    if (this.players.length >= CFG.match.maxPlayers) return;
    const used = new Set(this.players.map((p) => p.species));
    const species = SPECIES.find((s) => !used.has(s)) || SPECIES[this.players.length % SPECIES.length];
    this.players.push({ key: `bot${Date.now()}`, name: 'Bot', species, host: false, bot: true });
    this.roster();
  }
  removeBots() { this.players = this.players.filter((p) => !p.bot); this.roster(); }
  setMySpecies(species) { const sp = this.freeSpecies(species, 'host'); this.me.species = sp; this.players[0].species = sp; this.roster(); }
  rosterMsg() { return { t: 'lobby', code: this.code, players: this.players.map((p, slot) => ({ slot, key: p.key, name: p.name, species: p.species, host: p.host, bot: !!p.bot })) }; }
  roster() {
    const msg = this.rosterMsg();
    for (const p of this.players) if (!p.host && !p.bot) this.net.send(p.key, { ...msg, you: this.players.indexOf(p) });
    if (this.onRoster) this.onRoster(msg.players);
  }
  start() {
    this.playing = true;
    this.inputs = new RemoteInputs(); // cada partida empieza con contadores limpios
    this.players = this.players.filter((p) => !p.gone);
    const msg = { t: 'start', players: this.rosterMsg().players };
    for (const p of this.players) if (!p.host && !p.bot) this.net.send(p.key, { ...msg, you: this.players.indexOf(p) });
    return this.players;
  }
  backToLobby() { this.playing = false; this.players = this.players.filter((p) => !p.gone); this.net.broadcast({ t: 'lobbyBack' }); this.roster(); }
  broadcastSnapshot(snap) { this.net.broadcast(snap); }
  close() { this.net.close(); }
}

export class ClientSession {
  constructor() { this.net = new ClientNet(); this.slot = null; this.players = []; this.onRoster = null; this.onStart = null; this.onSnapshot = null; this.onClosed = null; this.onLobbyBack = null; }
  async join(code, me) {
    await this.net.connect(normalizeCode(code));
    this.net.onMessage = (msg) => {
      if (!msg || typeof msg !== 'object') return;
      switch (msg.t) {
        case 'lobby': this.players = msg.players; this.slot = msg.you; if (this.onRoster) this.onRoster(msg.players, msg.you); break;
        case 'start': this.players = msg.players; this.slot = msg.you; if (this.onStart) this.onStart(msg.players, msg.you); break;
        case 'snap': if (this.onSnapshot) this.onSnapshot(msg); break;
        case 'lobbyBack': if (this.onLobbyBack) this.onLobbyBack(); break;
        case 'kick': this.net.close(); if (this.onClosed) this.onClosed(msg.reason); break;
        default: break;
      }
    };
    this.net.onClose = (why) => { if (this.onClosed) this.onClosed(why); };
    this.net.send({ t: 'hello', name: me.name, species: me.species });
  }
  setSpecies(species) { this.net.send({ t: 'species', species }); }
  sendInput(msg) { this.net.send(msg); }
  close() { this.net.close(); }
}
