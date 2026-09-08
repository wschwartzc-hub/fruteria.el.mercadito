// Bot sencillo para probar solo. Reglas de prioridad:
// 1) cargando a alguien -> ir al borde más cercano y aventarlo
// 2) hay un KO cerca     -> ir y levantarlo
// 3) hay barril en piso  -> agarrarlo y aventarlo hacia el rival
// 4) si no, acercarse al rival más cercano y golpear en rango
import { S, B } from './core/world.js';
import { CFG } from './core/config.js';

const memo = new Map(); // id -> { nextPunch, nextJump }

export function botInput(world, me, time) {
  const st = memo.get(me.id) || { nextPunch: 0, nextJump: 0, edge: 1 };
  memo.set(me.id, st);
  const inp = { left: false, right: false, jump: false, punch: false, grab: false, fart: false };
  if (![S.IDLE, S.WALK, S.JUMP, S.CARRYING].includes(me.state)) return inp;

  const roof = world.roof;
  const others = world.monitos.filter((m) => m !== me && m.state !== S.DEAD && m.state !== S.FALLING);
  const nearest = others.sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0];
  const goTo = (x, margin = 6) => { if (x < me.x - margin) inp.left = true; else if (x > me.x + margin) inp.right = true; };
  const safeGoTo = (x) => goTo(Math.max(roof.x + 40, Math.min(roof.x + roof.w - 40, x)));

  if (me.state === S.CARRYING) {
    if (me.carryingId != null) {
      const leftD = me.x - roof.x, rightD = roof.x + roof.w - me.x;
      const target = leftD < rightD ? roof.x + 22 : roof.x + roof.w - 22;
      goTo(target, 4);
      if (Math.abs(me.x - target) < 30 && me.facing === (target > roof.x + roof.w / 2 ? 1 : -1)) inp.grab = true;
      return inp;
    }
    // barril: aventarlo hacia el rival cuando esté a tiro
    if (nearest) {
      safeGoTo(nearest.x);
      if (Math.abs(nearest.x - me.x) < 260 && Math.sign(nearest.x - me.x) === me.facing) inp.grab = true;
    } else inp.grab = true;
    return inp;
  }

  // pedo si hay rival cerca y tengo frijol
  if (me.beans > 0 && me.onGround && nearest && world.dist(me, nearest) < CFG.fart.radius * 0.8 && nearest.state !== S.KO) { inp.fart = true; return inp; }
  // frijol cerca: ir por él
  const bean = world.beans.find((b) => b.state === 'rest' && Math.abs(b.x - me.x) < 240);
  if (bean && me.beans < CFG.bean.maxCharges && !others.some((o) => o.state === S.KO && Math.abs(o.x - me.x) < 120)) { safeGoTo(bean.x); return inp; }

  const ko = others.find((m) => m.state === S.KO && Math.abs(m.x - me.x) < 260 && !world.monitos.some((k) => k.pickupTargetId === m.id));
  if (ko) {
    safeGoTo(ko.x);
    if (world.dist(me, ko) < CFG.grab.range + ko.w / 2 - 4 && me.onGround) inp.grab = true;
    return inp;
  }

  const barrel = world.barrels.find((b) => b.state === B.REST && Math.abs(b.x - me.x) < 200);
  if (barrel && !world.barrels.some((b) => b.state === B.WARNING || (b.state === B.FALLING && Math.abs(b.x - me.x) < 120))) {
    safeGoTo(barrel.x);
    if (world.dist(me, barrel) < CFG.grab.range + barrel.w / 2 - 4 && me.onGround) inp.grab = true;
    return inp;
  }

  // esquivar barriles que vienen cayendo
  const danger = world.barrels.find((b) => (b.state === B.WARNING || b.state === B.FALLING) && Math.abs(b.x - me.x) < 90);
  if (danger) { safeGoTo(me.x + (me.x < danger.x ? -120 : 120)); return inp; }

  if (!nearest) return inp;
  const dx = nearest.x - me.x;
  const inRange = Math.abs(dx) < me.w / 2 + CFG.punch.range + 10 && Math.abs(nearest.y - me.y) < 40;
  if (inRange) {
    if (Math.sign(dx) !== me.facing) goTo(nearest.x, 0);
    if (time > st.nextPunch) { inp.punch = true; st.nextPunch = time + 0.35 + Math.random() * 0.45; }
  } else {
    safeGoTo(nearest.x + (dx > 0 ? -30 : 30));
    if (nearest.y < me.y - 40 && time > st.nextJump && me.onGround) { inp.jump = true; st.nextJump = time + 1; }
  }
  return inp;
}
