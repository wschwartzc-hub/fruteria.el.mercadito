import test from 'node:test';
import assert from 'node:assert/strict';
import { S } from '../src/core/world.js';
import { CFG } from '../src/core/config.js';
import { makeWorld, run, faceOff, IN, DT, has } from './helpers.js';

function knockOut(world, victim) { world.enterKO(victim, CFG.ko.duration); }

test('agarrar a un KO tiene windup y luego lo carga; aventarlo al vacío le quita una vida', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b);
  knockOut(w, b);
  let inputs = []; inputs[a.id] = IN({ grab: true });
  w.tick(DT, inputs);
  assert.equal(a.state, S.PICKUP);
  assert.equal(b.state, S.KO, 'sigue KO durante el windup');
  run(w, CFG.grab.windup + 0.02);
  assert.equal(a.state, S.CARRYING);
  assert.equal(b.state, S.CARRIED);
  assert.ok(b.y < a.y - a.h + 1, 'va encima del cargador');

  // Caminar (más lento) hacia el borde derecho y aventar
  const x0 = a.x;
  a.x = w.roof.x + w.roof.w - 220;
  run(w, 1.0, () => { const i = []; i[a.id] = IN({ right: true }); return i; });
  assert.ok(a.x > w.roof.x + w.roof.w - 220 + CFG.monito.carrySpeed * 0.8, 'avanzó cargando');
  assert.ok(a.x < w.roof.x + w.roof.w, 'sigue en la azotea');
  assert.equal(a.state, S.CARRYING, 'sigue cargando');
  assert.ok(x0 < a.x);
  inputs = []; inputs[a.id] = IN({ grab: true });
  w.tick(DT, inputs);
  assert.equal(b.state, S.THROWN);
  run(w, 2.0);
  const ev = w.drain();
  assert.ok(has(ev, 'fallOff'), 'cayó al vacío');
  assert.equal(b.stocks, CFG.match.stocks - 1);
  assert.equal(b.state, S.DEAD);
  run(w, CFG.match.respawnDelay + 0.1);
  assert.ok(has(w.drain(), 'respawn'));
});

test('si el KO despierta en brazos, se zafa', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b);
  w.enterKO(b, 1.0);
  const inputs = []; inputs[a.id] = IN({ grab: true });
  w.tick(DT, inputs);
  run(w, 1.2);
  assert.equal(b.state, S.IDLE);
  assert.equal(a.carryingId, null);
  assert.ok(has(w.drain(), 'breakFree'));
});

test('pegarle al que está cargando cancela y el desmayado vuelve a la normalidad', () => {
  const w = makeWorld();
  const a = w.addMonito({ total: 3 }), b = w.addMonito({ total: 3 }), c = w.addMonito({ total: 3 });
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid; b.x = mid + 30; c.x = mid - 20 - a.w; a.facing = 1; c.facing = 1; run(w, 0.3);
  knockOut(w, b);
  let inputs = []; inputs[a.id] = IN({ grab: true });
  w.tick(DT, inputs);
  assert.equal(a.state, S.PICKUP);
  // c golpea a a durante el windup
  inputs = []; inputs[c.id] = IN({ punch: true });
  w.tick(DT, inputs); run(w, CFG.punch.windup + 0.03);
  const ev = w.drain();
  assert.ok(has(ev, 'carryCancelled'));
  assert.equal(b.state, S.IDLE, 'el desmayado vuelve a la normalidad');
  assert.equal(b.koTimer, 0);
  assert.equal(a.state, S.HITSTUN);
  assert.equal(a.pickupTargetId, null);
});

test('pegarle al monito cargado también cancela la carga', () => {
  const w = makeWorld();
  const a = w.addMonito({ total: 3 }), b = w.addMonito({ total: 3 }), c = w.addMonito({ total: 3 });
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid; b.x = mid + 30; a.facing = 1; c.x = mid - 200; run(w, 0.3);
  knockOut(w, b);
  let inputs = []; inputs[a.id] = IN({ grab: true });
  w.tick(DT, inputs); run(w, CFG.grab.windup + 0.02);
  assert.equal(b.state, S.CARRIED);
  // c salta y golpea al cargado (está arriba de a)
  c.x = mid - a.w - 10; c.facing = 1; c.y = a.y - a.h - 10; c.vy = 0; c.onGround = false;
  inputs = []; inputs[c.id] = IN({ punch: true });
  w.tick(DT, inputs); run(w, CFG.punch.windup + 0.03);
  assert.equal(b.state, S.IDLE);
  assert.equal(a.state, S.IDLE);
  assert.equal(a.carryingId, null);
});

test('dos jugadores no pueden levantar al mismo KO', () => {
  const w = makeWorld();
  const a = w.addMonito({ total: 3 }), b = w.addMonito({ total: 3 }), c = w.addMonito({ total: 3 });
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid - 40; b.x = mid; c.x = mid + 40; a.facing = 1; c.facing = -1; run(w, 0.3);
  knockOut(w, b);
  const inputs = []; inputs[a.id] = IN({ grab: true }); inputs[c.id] = IN({ grab: true });
  w.tick(DT, inputs);
  assert.equal(a.state, S.PICKUP);
  assert.equal(c.state, S.IDLE);
});

test('si el cargador se cae del borde, el cargado también cae', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b);
  knockOut(w, b);
  const g = []; g[a.id] = IN({ grab: true });
  w.tick(DT, g); run(w, CFG.grab.windup + 0.02);
  a.x = w.roof.x + w.roof.w - 5; a.facing = 1;
  run(w, 1.5, () => { const i = []; i[a.id] = IN({ right: true }); return i; });
  assert.equal(a.state, S.DEAD);
  assert.equal(b.state, S.DEAD);
  assert.equal(a.stocks, CFG.match.stocks - 1);
  assert.equal(b.stocks, CFG.match.stocks - 1);
});
