// Núcleo del juego: física simple + reglas + máquinas de estado.
// Es JS puro sin canvas ni DOM para poder probarlo con `node --test`.
// El renderer sólo lee el estado y consume `world.drain()` (eventos).
import { CFG } from './config.js';

export const S = Object.freeze({
  IDLE: 'idle', WALK: 'walk', JUMP: 'jump', PUNCH: 'punch',
  HITSTUN: 'hitstun', LAUNCHED: 'launched', KO: 'ko',
  PICKUP: 'pickup', CARRYING: 'carrying', CARRIED: 'carried',
  THROWN: 'thrown', FALLING: 'falling', DEAD: 'dead', FART: 'fart',
});

export const B = Object.freeze({
  WARNING: 'warning', FALLING: 'falling', REST: 'rest',
  CARRIED: 'carried', THROWN: 'thrown', EXPLODING: 'exploding', GONE: 'gone',
});

const EMPTY_INPUT = Object.freeze({ left: false, right: false, jump: false, jumpHeld: false, punch: false, grab: false, fart: false });
// Estados desde los que un jet pack te puede rescatar.
const RESCUABLE = new Set([S.THROWN, S.LAUNCHED, S.FALLING]);

// Estados en los que un puñetazo tiene efecto sobre la víctima.
const HITTABLE = new Set([S.IDLE, S.WALK, S.JUMP, S.PUNCH, S.HITSTUN, S.PICKUP, S.CARRYING, S.CARRIED, S.FART]);
// Estados en los que se puede comer un frijol al pisarlo.
const CAN_EAT = new Set([S.IDLE, S.WALK, S.JUMP, S.PUNCH, S.CARRYING]);
// Estados en los que el jugador puede recibir input de movimiento/acción.
const ACTIONABLE = new Set([S.IDLE, S.WALK, S.JUMP]);

// Especies: el render dibuja la cabeza según `species`; el color es el del cuerpo.
export const SPECIES = ['mono', 'leon', 'zorro', 'panda', 'elefante', 'jirafa', 'pinguino', 'buho'];
const PALETTE = { mono: '#b07a4f', leon: '#f2a93b', zorro: '#ef8a3c', panda: '#f4f1ec', elefante: '#a9b4c4', jirafa: '#f5c445', pinguino: '#3a4661', buho: '#a0703f' };
const NAMES = { mono: 'Mono', leon: 'León', zorro: 'Zorro', panda: 'Panda', elefante: 'Elefante', jirafa: 'Jirafa', pinguino: 'Pingüino', buho: 'Búho' };

export function createMonito(id, x, y, opts = {}) {
  const species = opts.species ?? SPECIES[id % SPECIES.length];
  return {
    id, species, name: opts.name ?? NAMES[species], color: opts.color ?? PALETTE[species],
    x, y, vx: 0, vy: 0, w: CFG.monito.w, h: CFG.monito.h,
    facing: opts.facing ?? 1, onGround: false,
    state: S.IDLE, t: 0,                 // t = tiempo dentro del estado actual
    combo: { attackerId: null, count: 0, lastAt: -Infinity },
    koTimer: 0, invuln: 0,
    carryingId: null, carryingBarrelId: null, carriedById: null, pickupTargetId: null,
    punchHit: false,
    beans: 0, fartCloud: 0,
    jetpack: null, thrusting: false,   // jetpack = { fuel } cuando la traes puesta
    stocks: CFG.match.stocks, score: 0, respawnTimer: 0,
    justLanded: false,
  };
}

export function createBarrel(id, x, y) {
  return {
    id, x, y, vx: 0, vy: 0, w: CFG.barrel.w, h: CFG.barrel.h,
    state: B.WARNING, t: 0, armed: true, fuse: 0,
    carriedById: null, thrownById: null, spin: 0,
  };
}

export function createBean(id, x, y) {
  return { id, x, y, vx: 0, vy: 0, w: CFG.bean.w, h: CFG.bean.h, state: 'falling', ttl: CFG.bean.ttl, spin: 0 };
}

export function createJetpackItem(id, x, y) {
  return { id, x, y, vx: 0, vy: 0, w: CFG.jetpack.w, h: CFG.jetpack.h, state: 'falling', ttl: CFG.jetpack.ttl, spin: 0 };
}

export function boxOf(e) {
  return { l: e.x - e.w / 2, r: e.x + e.w / 2, t: e.y - e.h, b: e.y };
}
export function overlaps(a, b) {
  return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
}
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

export class World {
  constructor(opts = {}) {
    this.roof = { ...CFG.roof, ...(opts.roof || {}) };
    this.deathY = this.roof.y + CFG.match.deathDepth;
    this.time = 0;
    this.monitos = [];
    this.barrels = [];
    this.beans = [];
    this.events = [];
    this.beansEnabled = opts.beans ?? true;
    this.nextBeanIn = CFG.bean.firstAt;
    this.beanSeq = 0;
    this.jetpacks = [];
    this.jetpacksEnabled = opts.jetpacks ?? true;
    this.nextJetpackIn = CFG.jetpack.firstAt;
    this.jetpackSeq = 0;
    this.rng = opts.rng ?? Math.random;
    this.barrelsEnabled = opts.barrels ?? true;
    this.nextBarrelIn = CFG.barrel.spawnGraceInitial;
    this.barrelSeq = 0;
    this.over = false;
    this.winnerId = null;
  }

  // ---------- utilidades ----------
  addMonito(opts = {}) {
    const id = this.monitos.length;
    const spread = this.roof.w / (Math.max(1, (opts.total ?? 2)) + 1);
    const x = opts.x ?? this.roof.x + spread * (id + 1);
    const m = createMonito(id, x, opts.y ?? this.roof.y, {
      ...opts, facing: opts.facing ?? (x < this.roof.x + this.roof.w / 2 ? 1 : -1),
    });
    this.monitos.push(m);
    return m;
  }
  get(id) { return this.monitos[id]; }
  getBarrel(id) { return this.barrels.find((b) => b.id === id); }
  emit(type, data = {}) { this.events.push({ type, t: this.time, ...data }); }
  drain() { const e = this.events; this.events = []; return e; }
  overRoof(x) { return x > this.roof.x && x < this.roof.x + this.roof.w; }
  center(e) { return { x: e.x, y: e.y - e.h / 2 }; }
  dist(a, b) { const ca = this.center(a), cb = this.center(b); return Math.hypot(ca.x - cb.x, ca.y - cb.y); }

  // ---------- loop principal ----------
  tick(dt, inputs = []) {
    this.time += dt;
    for (const m of this.monitos) { m.justLanded = false; this.updateMonito(m, inputs[m.id] || EMPTY_INPUT, dt); }
    for (const m of this.monitos) this.integrate(m, dt);
    for (const m of this.monitos) this.syncCarried(m);
    for (const m of this.monitos) this.resolvePunch(m);
    this.updateBarrels(dt);
    this.updateBeans(dt);
    this.updateJetpacks(dt);
    for (const m of this.monitos) this.checkFall(m);
    this.checkWin();
  }

  // ---------- máquina de estados del monito ----------
  updateMonito(m, inp, dt) {
    m.t += dt;
    m.thrusting = false;
    if (m.invuln > 0) m.invuln -= dt;

    switch (m.state) {
      case S.DEAD:
        m.respawnTimer -= dt;
        if (m.respawnTimer <= 0 && m.stocks > 0 && !this.over) this.respawn(m);
        return;
      case S.KO:
        m.koTimer -= dt;
        if (inp.punch) this.mash(m);
        this.groundFriction(m, dt);
        if (m.koTimer <= 0) this.wake(m);
        return;
      case S.CARRIED:
        // El reloj del desmayo sigue corriendo: si despierta en brazos, se zafa.
        m.koTimer -= dt;
        if (inp.punch) this.mash(m);
        if (m.koTimer <= 0) this.breakFree(m);
        return;
      case S.HITSTUN:
        this.groundFriction(m, dt);
        if (m.t >= CFG.punch.hitstun) this.setState(m, m.onGround ? S.IDLE : S.JUMP);
        return;
      case S.LAUNCHED:
      case S.THROWN:
        if (this.canRescue(m) && inp.jump) { this.jetpackSave(m, inp, dt); return; }
        if (m.onGround && m.t > 0.08) this.enterKO(m, m.state === S.THROWN ? Math.max(m.koTimer, CFG.ko.minAfterThrow) : CFG.ko.duration);
        return;
      case S.FALLING:
        if (this.canRescue(m) && inp.jump) { this.jetpackSave(m, inp, dt); return; }
        return; // ya no hay control: sólo cae
      case S.PUNCH: {
        const p = CFG.punch;
        this.groundFriction(m, dt);
        if (m.t >= p.windup + p.active + p.recovery) this.setState(m, m.onGround ? S.IDLE : S.JUMP);
        return;
      }
      case S.PICKUP:
        this.groundFriction(m, dt);
        if (m.t >= CFG.grab.windup) this.completePickup(m);
        return;
      case S.FART:
        this.groundFriction(m, dt);
        if (m.t >= CFG.fart.windup) this.fart(m);
        return;
      case S.CARRYING:
        this.move(m, inp, dt, CFG.monito.carrySpeed);
        if (inp.grab) this.throwCarried(m);
        return;
      default: // IDLE / WALK / JUMP
        this.move(m, inp, dt, CFG.monito.walkSpeed, this.wantsThrust(m, inp));
        if (this.wantsThrust(m, inp)) this.thrust(m, dt);
        if (inp.punch) { this.setState(m, S.PUNCH); m.punchHit = false; return; }
        if (inp.grab && m.onGround && this.tryGrab(m)) return;
        if (inp.fart && m.onGround && m.beans > 0) { this.setState(m, S.FART); this.emit('fartStart', { id: m.id }); return; }
        if (inp.jump && m.onGround) { m.vy = -CFG.monito.jumpVel; m.onGround = false; this.setState(m, S.JUMP); this.emit('jump', { id: m.id }); return; }
        if (m.onGround) this.setState(m, Math.abs(m.vx) > 8 ? S.WALK : S.IDLE);
        else if (m.state !== S.JUMP) this.setState(m, S.JUMP);
    }
  }

  setState(m, s) { if (m.state !== s) { m.state = s; m.t = 0; } }

  move(m, inp, dt, speed, flying = false) {
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const ctrl = m.onGround ? 1 : flying ? CFG.jetpack.airControl : CFG.monito.airControl;
    if (dir !== 0) {
      m.facing = dir;
      const target = dir * speed;
      const a = CFG.monito.accel * ctrl * dt;
      m.vx = Math.abs(target - m.vx) <= a ? target : m.vx + sign(target - m.vx) * a;
    } else {
      this.groundFriction(m, dt);
    }
  }

  groundFriction(m, dt) {
    if (m.onGround) m.vx *= Math.exp(-CFG.monito.friction * dt);
  }

  integrate(m, dt) {
    if (m.state === S.CARRIED || m.state === S.DEAD) return;
    const prevY = m.y;
    m.vy += CFG.gravity * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;

    const wasOnGround = m.onGround;
    if (this.overRoof(m.x) && m.y >= this.roof.y && prevY <= this.roof.y + 0.5 && m.vy >= 0) {
      m.y = this.roof.y; m.vy = 0; m.onGround = true;
      if (!wasOnGround) { m.justLanded = true; this.emit('land', { id: m.id, x: m.x, y: m.y }); }
    } else {
      m.onGround = false;
    }
  }

  syncCarried(carrier) {
    if (carrier.carryingId != null) {
      const c = this.get(carrier.carryingId);
      c.x = carrier.x; c.y = carrier.y - carrier.h - 4; c.facing = carrier.facing; c.vx = carrier.vx; c.vy = 0;
    }
    if (carrier.carryingBarrelId != null) {
      const b = this.getBarrel(carrier.carryingBarrelId);
      if (b) { b.x = carrier.x; b.y = carrier.y - carrier.h - 2; b.vx = carrier.vx; b.vy = 0; }
    }
  }

  // ---------- golpes y combos ----------
  punchBox(m) {
    const p = CFG.punch;
    const front = m.x + m.facing * (m.w / 2);
    return {
      l: Math.min(front, front + m.facing * p.range), r: Math.max(front, front + m.facing * p.range),
      t: m.y - m.h * 0.85, b: m.y - m.h * 0.15,
    };
  }

  resolvePunch(m) {
    if (m.state !== S.PUNCH || m.punchHit) return;
    const p = CFG.punch;
    if (m.t < p.windup || m.t > p.windup + p.active) return;
    const hb = this.punchBox(m);
    let hit = false;
    for (const v of this.monitos) {
      if (v === m || !HITTABLE.has(v.state) || v.invuln > 0) continue;
      if (!overlaps(hb, boxOf(v))) continue;
      this.applyHit(m, v);
      hit = true;
    }
    if (hit) m.punchHit = true;
  }

  applyHit(a, v) {
    const dir = sign(v.x - a.x) || a.facing;

    // Golpear al monito cargado o a quien lo carga cancela el agarre y el
    // desmayado "vuelve a la normalidad".
    if (v.state === S.CARRIED) {
      const carrier = this.get(v.carriedById);
      this.cancelCarry(carrier, 'hit');
      this.emit('hit', { attackerId: a.id, victimId: v.id, x: v.x, y: v.y - v.h / 2, dir, cancelled: true });
      return;
    }
    if (v.state === S.PICKUP || v.state === S.CARRYING) this.cancelCarry(v, 'hit');

    const c = v.combo;
    const within = this.time - c.lastAt <= CFG.combo.window;
    if (c.attackerId === a.id && within) c.count += 1; else { c.attackerId = a.id; c.count = 1; }
    c.lastAt = this.time;
    this.emit('hit', { attackerId: a.id, victimId: v.id, x: v.x, y: v.y - v.h / 2, dir, combo: c.count });

    if (c.count >= CFG.combo.hitsToLaunch) {
      this.launch(v, dir, CFG.combo.launchX, CFG.combo.launchY);
      this.emit('combo', { attackerId: a.id, victimId: v.id, count: c.count, x: v.x, y: v.y - v.h });
      a.score += 1;
      c.count = 0; c.attackerId = null;
      return;
    }
    v.vx = dir * CFG.punch.knockbackX;
    v.vy = -CFG.punch.knockbackY;
    v.onGround = false;
    v.facing = -dir;
    this.setState(v, S.HITSTUN);
  }

  launch(m, dir, vx, vy) {
    if (m.state === S.PICKUP || m.state === S.CARRYING) this.cancelCarry(m, 'launch');
    m.vx = dir * vx; m.vy = -vy; m.onGround = false;
    m.combo.count = 0; m.combo.attackerId = null;
    this.setState(m, S.LAUNCHED);
    this.emit('launch', { id: m.id, dir });
  }

  enterKO(m, duration) {
    m.koTimer = duration;
    m.vx *= 0.25;
    m.combo.count = 0; m.combo.attackerId = null;
    this.setState(m, S.KO);
    this.emit('ko', { id: m.id, x: m.x, y: m.y });
  }

  wake(m) {
    m.koTimer = 0;
    m.invuln = CFG.ko.invulnAfterWake;
    this.setState(m, S.IDLE);
    this.emit('wake', { id: m.id });
  }

  // ---------- agarrar / cargar / aventar ----------
  tryGrab(m) {
    // 1) Un monito desmayado que nadie más esté levantando.
    let best = null, bestD = Infinity;
    for (const o of this.monitos) {
      if (o === m || o.state !== S.KO) continue;
      if (this.monitos.some((k) => k.pickupTargetId === o.id)) continue;
      const d = this.dist(m, o);
      if (d < CFG.grab.range + o.w / 2 && d < bestD) { best = o; bestD = d; }
    }
    if (best) {
      m.pickupTargetId = best.id;
      m.facing = sign(best.x - m.x) || m.facing;
      this.setState(m, S.PICKUP);
      this.emit('pickupStart', { id: m.id, targetId: best.id });
      return true;
    }
    // 2) Un barril en reposo.
    let bb = null; bestD = Infinity;
    for (const b of this.barrels) {
      if (b.state !== B.REST) continue;
      const d = this.dist(m, b);
      if (d < CFG.grab.range + b.w / 2 && d < bestD) { bb = b; bestD = d; }
    }
    if (bb) {
      bb.state = B.CARRIED; bb.carriedById = m.id; bb.vx = bb.vy = 0;
      m.carryingBarrelId = bb.id;
      this.setState(m, S.CARRYING);
      this.emit('barrelPickup', { id: m.id, barrelId: bb.id });
      return true;
    }
    return false;
  }

  completePickup(m) {
    const o = m.pickupTargetId != null ? this.get(m.pickupTargetId) : null;
    m.pickupTargetId = null;
    if (!o || o.state !== S.KO) { this.setState(m, S.IDLE); return; }
    o.carriedById = m.id;
    o.vx = o.vy = 0;
    this.setState(o, S.CARRIED);
    m.carryingId = o.id;
    this.setState(m, S.CARRYING);
    this.emit('pickup', { id: m.id, targetId: o.id });
  }

  // Cancela agarre/carga del `carrier`. El monito cargado se recupera de inmediato.
  cancelCarry(carrier, reason) {
    const targetId = carrier.carryingId ?? carrier.pickupTargetId;
    if (targetId != null) {
      const o = this.get(targetId);
      o.carriedById = null; o.koTimer = 0; o.invuln = CFG.ko.invulnAfterWake;
      o.x = carrier.x - carrier.facing * (carrier.w * 0.9); o.y = carrier.y; o.vx = 0; o.vy = 0;
      if (!this.overRoof(o.x)) o.x = carrier.x + carrier.facing * (carrier.w * 0.9);
      this.setState(o, S.IDLE);
      this.emit('carryCancelled', { carrierId: carrier.id, targetId, reason });
    }
    if (carrier.carryingBarrelId != null) {
      const b = this.getBarrel(carrier.carryingBarrelId);
      if (b) { b.state = B.REST; b.carriedById = null; b.armed = false; b.y = carrier.y; b.x = carrier.x - carrier.facing * 30; }
      this.emit('barrelDropped', { carrierId: carrier.id, barrelId: carrier.carryingBarrelId });
    }
    carrier.carryingId = null; carrier.pickupTargetId = null; carrier.carryingBarrelId = null;
    if (carrier.state === S.PICKUP || carrier.state === S.CARRYING) this.setState(carrier, S.IDLE);
  }

  breakFree(m) {
    const carrier = this.get(m.carriedById);
    carrier.carryingId = null;
    carrier.vx = -carrier.facing * 160; carrier.onGround = false; carrier.vy = -120;
    this.setState(carrier, S.HITSTUN);
    m.carriedById = null; m.koTimer = 0; m.invuln = CFG.ko.invulnAfterWake;
    m.x = carrier.x + carrier.facing * carrier.w; m.y = carrier.y; m.vx = 0; m.vy = 0;
    this.setState(m, S.IDLE);
    this.emit('breakFree', { id: m.id, carrierId: carrier.id });
  }

  throwCarried(m) {
    if (m.carryingId != null) {
      const o = this.get(m.carryingId);
      o.carriedById = null;
      o.x = m.x + m.facing * 16; o.y = m.y - m.h * 0.6;
      o.vx = m.facing * CFG.grab.throwX + m.vx * 0.5; o.vy = -CFG.grab.throwY; o.onGround = false;
      o.koTimer = Math.max(o.koTimer, CFG.ko.minAfterThrow);
      this.setState(o, S.THROWN);
      m.carryingId = null;
      this.setState(m, S.IDLE); m.t = 0;
      this.emit('throw', { id: m.id, targetId: o.id });
      return;
    }
    if (m.carryingBarrelId != null) {
      const b = this.getBarrel(m.carryingBarrelId);
      m.carryingBarrelId = null;
      this.setState(m, S.IDLE);
      if (!b) return;
      b.state = B.THROWN; b.t = 0; b.armed = true; b.carriedById = null; b.thrownById = m.id;
      b.x = m.x + m.facing * 20; b.y = m.y - m.h * 0.7;
      b.vx = m.facing * CFG.barrel.throwX + m.vx * 0.5; b.vy = -CFG.barrel.throwY;
      this.emit('barrelThrow', { id: m.id, barrelId: b.id });
    }
  }

  // ---------- jet pack ----------
  wantsThrust(m, inp) { return !!m.jetpack && m.jetpack.fuel > 0 && inp.jumpHeld && !m.onGround; }
  canRescue(m) { return !!m.jetpack && m.jetpack.fuel > 0; }

  thrust(m, dt) {
    m.thrusting = true;
    m.vy = Math.max(m.vy - CFG.jetpack.thrust * dt, -CFG.jetpack.maxUp);
    if (m.y - m.h < 30 && m.vy < 0) m.vy = 0; // techo: no se sale de la pantalla
    m.jetpack.fuel -= dt;
    if (m.jetpack.fuel <= 0) { m.jetpack = null; m.thrusting = false; this.emit('jetpackEmpty', { id: m.id, x: m.x, y: m.y - m.h }); }
  }

  // Un aventado / lanzado / cayendo con jet pack presiona salto: despierta y vuela.
  jetpackSave(m, inp, dt) {
    m.koTimer = 0; m.carriedById = null;
    m.invuln = Math.max(m.invuln, 0.4);
    m.onGround = false;
    if (m.vy > 200) m.vy = 200; // frena la caída para que se sienta el rescate
    this.setState(m, S.JUMP);
    this.emit('jetpackSave', { id: m.id, x: m.x, y: m.y - m.h });
    this.thrust(m, dt);
  }

  // Machacar golpe mientras estás KO (o cargado) acorta el desmayo.
  mash(m) {
    m.koTimer -= CFG.ko.mashReduce;
    this.emit('mash', { id: m.id, x: m.x, y: m.y - m.h * 0.6 });
  }

  spawnJetpack(x) {
    const j = createJetpackItem(this.jetpackSeq++, x ?? this.roof.x + 80 + this.rng() * (this.roof.w - 160), -90);
    this.jetpacks.push(j);
    this.emit('jetpackSpawn', { jetpackId: j.id, x: j.x });
    return j;
  }

  updateJetpacks(dt) {
    if (this.jetpacksEnabled && !this.over) {
      this.nextJetpackIn -= dt;
      if (this.nextJetpackIn <= 0) {
        this.spawnJetpack();
        this.nextJetpackIn = CFG.jetpack.spawnMin + this.rng() * (CFG.jetpack.spawnMax - CFG.jetpack.spawnMin);
      }
    }
    for (const j of this.jetpacks) {
      if (j.state === 'falling') {
        const prevY = j.y;
        j.vy += CFG.gravity * 0.35 * dt; // baja despacio, como con paracaídas
        j.vy = Math.min(j.vy, 260);
        j.spin += dt;
        j.x += Math.sin(j.spin * 3) * 30 * dt;
        j.y += j.vy * dt;
        if (this.overRoof(j.x) && j.y >= this.roof.y && prevY <= this.roof.y + 0.5) { j.y = this.roof.y; j.vy = 0; j.state = 'rest'; this.emit('jetpackLand', { jetpackId: j.id, x: j.x }); }
        else if (j.y > this.deathY) j.state = 'gone';
      } else if (j.state === 'rest') {
        j.ttl -= dt;
        if (j.ttl <= 0) { j.state = 'gone'; continue; }
      }
      if (j.state === 'gone') continue;
      const jb = boxOf(j);
      for (const m of this.monitos) {
        if (!CAN_EAT.has(m.state) || m.jetpack) continue;
        if (!overlaps(jb, boxOf(m))) continue;
        m.jetpack = { fuel: CFG.jetpack.fuel };
        j.state = 'gone';
        this.emit('jetpackPickup', { id: m.id, jetpackId: j.id, x: m.x, y: m.y - m.h });
        break;
      }
    }
    this.jetpacks = this.jetpacks.filter((j) => j.state !== 'gone');
  }

  // ---------- frijoles y pedos ----------
  spawnBean(x) {
    const b = createBean(this.beanSeq++, x ?? this.roof.x + 60 + this.rng() * (this.roof.w - 120), -80);
    this.beans.push(b);
    this.emit('beanSpawn', { beanId: b.id, x: b.x });
    return b;
  }

  updateBeans(dt) {
    if (this.beansEnabled && !this.over) {
      this.nextBeanIn -= dt;
      if (this.nextBeanIn <= 0) {
        this.spawnBean();
        this.nextBeanIn = CFG.bean.spawnMin + this.rng() * (CFG.bean.spawnMax - CFG.bean.spawnMin);
      }
    }
    for (const b of this.beans) {
      if (b.state === 'falling') {
        const prevY = b.y;
        b.vy += CFG.gravity * 0.45 * dt; // caen lento, como si flotaran
        b.y += b.vy * dt; b.spin += 2 * dt;
        if (this.overRoof(b.x) && b.y >= this.roof.y && prevY <= this.roof.y + 0.5) { b.y = this.roof.y; b.vy = 0; b.state = 'rest'; this.emit('beanLand', { beanId: b.id, x: b.x }); }
        else if (b.y > this.deathY) b.state = 'gone';
      } else if (b.state === 'rest') {
        b.ttl -= dt;
        if (b.ttl <= 0) { b.state = 'gone'; continue; }
      }
      if (b.state === 'gone') continue;
      const bb = boxOf(b);
      for (const m of this.monitos) {
        if (!CAN_EAT.has(m.state) || m.beans >= CFG.bean.maxCharges) continue;
        if (!overlaps(bb, boxOf(m))) continue;
        m.beans += 1; b.state = 'gone';
        this.emit('eat', { id: m.id, beanId: b.id, x: m.x, y: m.y - m.h, beans: m.beans });
        break;
      }
    }
    this.beans = this.beans.filter((b) => b.state !== 'gone');
    for (const m of this.monitos) if (m.fartCloud > 0) m.fartCloud -= dt;
  }

  // El pedo: todos los demás dentro del radio se desmayan. El barril que
  // esté dentro también se enciende (gas + mecha = mala idea).
  fart(m) {
    m.beans = Math.max(0, m.beans - 1);
    m.fartCloud = CFG.fart.cloud;
    const cx = m.x, cy = m.y - m.h / 2, R = CFG.fart.radius;
    this.setState(m, S.IDLE);
    this.emit('fart', { id: m.id, x: cx, y: cy, radius: R });
    const inRange = (e) => { const c = this.center(e); return Math.hypot(c.x - cx, c.y - cy) <= R; };
    for (const o of this.monitos) {
      if (o === m || o.state === S.DEAD || o.state === S.FALLING || o.state === S.CARRIED || o.invuln > 0 || !inRange(o)) continue;
      if (o.state === S.PICKUP || o.state === S.CARRYING) this.cancelCarry(o, 'fart');
      if (o.state === S.KO) { o.koTimer = Math.max(o.koTimer, CFG.ko.duration); continue; }
      o.vx = 0;
      this.enterKO(o, CFG.ko.duration);
      this.emit('gassed', { id: o.id, byId: m.id });
    }
    for (const b of this.barrels) {
      if ((b.state === B.REST || b.state === B.CARRIED) && inRange(b)) {
        if (b.carriedById != null) { const c = this.get(b.carriedById); c.carryingBarrelId = null; if (c.state === S.CARRYING) this.setState(c, S.IDLE); b.carriedById = null; }
        b.state = B.EXPLODING; b.fuse = CFG.barrel.chainDelay * 2; b.armed = true;
      }
    }
  }

  // ---------- barriles ----------
  spawnBarrel(x) {
    const b = createBarrel(this.barrelSeq++, x ?? this.roof.x + 60 + this.rng() * (this.roof.w - 120), -160);
    b.state = B.WARNING; b.fuse = CFG.barrel.warning;
    this.barrels.push(b);
    this.emit('barrelWarning', { barrelId: b.id, x: b.x });
    return b;
  }

  updateBarrels(dt) {
    if (this.barrelsEnabled && !this.over) {
      this.nextBarrelIn -= dt;
      if (this.nextBarrelIn <= 0) {
        this.spawnBarrel();
        this.nextBarrelIn = CFG.barrel.spawnMin + this.rng() * (CFG.barrel.spawnMax - CFG.barrel.spawnMin);
      }
    }
    for (const b of this.barrels) {
      b.t += dt;
      switch (b.state) {
        case B.WARNING:
          b.fuse -= dt;
          if (b.fuse <= 0) { b.state = B.FALLING; b.t = 0; this.emit('barrelSpawn', { barrelId: b.id, x: b.x }); }
          break;
        case B.FALLING:
        case B.THROWN: {
          const prevY = b.y;
          b.vy += CFG.gravity * dt;
          b.x += b.vx * dt; b.y += b.vy * dt;
          b.spin += (b.state === B.THROWN ? 9 : 1.5) * dt;
          if (this.barrelHitsMonito(b)) break;
          if (this.overRoof(b.x) && b.y >= this.roof.y && prevY <= this.roof.y + 0.5 && b.vy >= 0) {
            if (b.armed) { this.explode(b); break; }
            b.y = this.roof.y; b.vy = 0; b.vx *= 0.5; b.state = B.REST; b.t = 0;
            this.emit('barrelLand', { barrelId: b.id, x: b.x });
          }
          if (b.y > this.deathY) b.state = B.GONE;
          break;
        }
        case B.REST:
          b.vx *= Math.exp(-CFG.barrel.restFriction * dt);
          b.x += b.vx * dt;
          if (!this.overRoof(b.x)) { b.state = B.FALLING; b.armed = false; }
          break;
        case B.EXPLODING:
          b.fuse -= dt;
          if (b.fuse <= 0) this.explode(b);
          break;
        default:
          break;
      }
    }
    this.barrels = this.barrels.filter((b) => b.state !== B.GONE);
  }

  barrelHitsMonito(b) {
    if (!b.armed) return false;
    const bb = boxOf(b);
    for (const m of this.monitos) {
      if (m.state === S.DEAD || m.state === S.CARRIED || m.state === S.FALLING) continue;
      if (b.state === B.THROWN && m.id === b.thrownById && b.t < 0.2) continue;
      if (!overlaps(bb, boxOf(m))) continue;
      if (b.state === B.THROWN) { this.explode(b); return true; }
      // Cae del cielo directo sobre un monito: NO explota, lo desmaya.
      if (m.state === S.KO) { m.koTimer = Math.max(m.koTimer, CFG.ko.duration); }
      else {
        if (m.state === S.PICKUP || m.state === S.CARRYING) this.cancelCarry(m, 'squash');
        m.vx = 0;
        this.enterKO(m, CFG.ko.duration);
      }
      this.emit('squash', { id: m.id, barrelId: b.id, x: m.x, y: m.y - m.h });
      b.armed = false; b.vy = -180; b.vx = (b.x >= m.x ? 1 : -1) * 140;
      return false;
    }
    return false;
  }

  explode(b) {
    if (b.state === B.GONE) return;
    b.state = B.GONE;
    const cx = b.x, cy = b.y - b.h / 2;
    const R = CFG.barrel.explodeRadius;
    this.emit('explode', { barrelId: b.id, x: cx, y: cy, radius: R });
    const inRange = (e) => { const c = this.center(e); return Math.hypot(c.x - cx, c.y - cy) <= R; };

    // Primero se cancelan agarres, después se lanza a todos los afectados.
    for (const m of this.monitos) {
      if ((m.state === S.PICKUP || m.state === S.CARRYING) && inRange(m)) this.cancelCarry(m, 'explosion');
    }
    for (const m of this.monitos) {
      if (m.state === S.DEAD || m.state === S.CARRIED || m.state === S.FALLING || !inRange(m)) continue;
      const dir = sign(m.x - cx) || (this.rng() < 0.5 ? -1 : 1);
      const c = this.center(m);
      const k = 1 - Math.min(1, Math.hypot(c.x - cx, c.y - cy) / R) * 0.5; // 0.5..1 según distancia
      if (b.thrownById != null && b.thrownById !== m.id) this.get(b.thrownById).score += 1;
      this.launch(m, dir, CFG.barrel.explodeLaunchX * k, CFG.barrel.explodeLaunchY * k);
    }
    for (const o of this.barrels) {
      if (o === b || o.state === B.GONE || o.state === B.EXPLODING || o.state === B.WARNING) continue;
      if (!inRange(o)) continue;
      if (o.carriedById != null) { const c = this.get(o.carriedById); c.carryingBarrelId = null; if (c.state === S.CARRYING) this.setState(c, S.IDLE); o.carriedById = null; }
      o.state = B.EXPLODING; o.fuse = CFG.barrel.chainDelay; o.armed = true;
    }
  }

  // ---------- caídas, muerte, respawn ----------
  checkFall(m) {
    if (m.state === S.DEAD || m.state === S.CARRIED) return;
    const flying = m.state === S.JUMP && this.canRescue(m);
    if (m.state !== S.FALLING && !flying && !this.overRoof(m.x) && m.y > this.roof.y + 24) {
      if (m.carryingId != null) {
        const o = this.get(m.carryingId);
        o.carriedById = null; o.vx = m.vx; o.vy = m.vy; this.setState(o, S.FALLING);
        m.carryingId = null;
        this.emit('fallStart', { id: o.id });
      }
      if (m.carryingBarrelId != null) {
        const b = this.getBarrel(m.carryingBarrelId);
        if (b) { b.state = B.FALLING; b.armed = false; b.carriedById = null; }
        m.carryingBarrelId = null;
      }
      m.pickupTargetId = null;
      this.setState(m, S.FALLING);
      this.emit('fallStart', { id: m.id });
    }
    if (m.y > this.deathY) this.die(m);
  }

  die(m) {
    m.stocks -= 1;
    m.jetpack = null; m.thrusting = false;
    m.vx = 0; m.vy = 0;
    m.respawnTimer = CFG.match.respawnDelay;
    m.koTimer = 0; m.combo.count = 0; m.combo.attackerId = null;
    this.setState(m, S.DEAD);
    this.emit('fallOff', { id: m.id, stocks: m.stocks });
  }

  respawn(m) {
    m.x = this.roof.x + this.roof.w / 2 + (this.rng() - 0.5) * this.roof.w * 0.4;
    m.y = this.roof.y - 320; m.vx = 0; m.vy = 0;
    m.invuln = CFG.match.respawnInvuln;
    m.onGround = false;
    this.setState(m, S.JUMP);
    this.emit('respawn', { id: m.id });
  }

  checkWin() {
    if (this.over || this.monitos.length < 2) return;
    const alive = this.monitos.filter((m) => m.stocks > 0);
    if (alive.length <= 1) {
      this.over = true;
      this.winnerId = alive[0]?.id ?? null;
      this.emit('matchOver', { winnerId: this.winnerId });
    }
  }
}
