import test from 'node:test';
import assert from 'node:assert/strict';
import { S } from '../src/core/world.js';
import { CFG } from '../src/core/config.js';
import { makeWorld, run, faceOff, IN, DT, has } from './helpers.js';

const mk = (opts = {}) => makeWorld({ jetpacks: false, ...opts });

test('el jet pack cae, se recoge al pisarlo y da gasolina', () => {
  const w = mk();
  const a = w.addMonito(), b = w.addMonito();
  run(w, 0.3); w.drain();
  const j = w.spawnJetpack(a.x); j.y = w.roof.y - 120;
  run(w, 2.0);
  assert.ok(has(w.drain(), 'jetpackPickup'));
  assert.ok(a.jetpack && a.jetpack.fuel > 0);
  assert.equal(b.jetpack, null);
  assert.equal(w.jetpacks.length, 0);
});

test('mantener salto en el aire empuja hacia arriba y gasta gasolina; al acabarse se cae la mochila', () => {
  const w = mk();
  const a = w.addMonito(); w.addMonito();
  run(w, 0.3);
  a.jetpack = { fuel: CFG.jetpack.fuel };
  const jumpIn = () => { const i = []; i[a.id] = IN({ jump: false, jumpHeld: true }); return i; };
  let i = []; i[a.id] = IN({ jump: true, jumpHeld: true }); w.tick(DT, i);
  run(w, 0.6, jumpIn);
  assert.ok(a.y < w.roof.y - 200, `debe estar muy alto (y=${Math.round(a.y)})`);
  assert.ok(a.thrusting);
  run(w, CFG.jetpack.fuel, jumpIn);
  assert.equal(a.jetpack, null, 'sin gasolina se pierde la mochila');
  assert.ok(has(w.drain(), 'jetpackEmpty'));
  run(w, 2.5);
  assert.equal(a.y, w.roof.y, 'vuelve al piso');
});

test('un monito aventado al vacío con jet pack presiona salto y se salva', () => {
  const w = mk();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b);
  w.enterKO(b, CFG.ko.duration);
  b.jetpack = { fuel: CFG.jetpack.fuel };
  let i = []; i[a.id] = IN({ grab: true }); w.tick(DT, i); run(w, CFG.grab.windup + 0.02);
  a.x = w.roof.x + w.roof.w - 60; a.facing = 1; run(w, 0.05);
  i = []; i[a.id] = IN({ grab: true }); w.tick(DT, i);
  assert.equal(b.state, S.THROWN);
  run(w, 0.25);
  assert.ok(!w.overRoof(b.x), 'ya salió de la azotea');
  // presiona salto y lo mantiene, y regresa hacia la izquierda
  i = []; i[b.id] = IN({ jump: true, jumpHeld: true, left: true }); w.tick(DT, i);
  assert.equal(b.state, S.JUMP);
  assert.ok(has(w.drain(), 'jetpackSave'));
  run(w, 0.9, () => { const k = []; k[b.id] = IN({ jumpHeld: true, left: true }); return k; });
  run(w, 2.5, () => { const k = []; k[b.id] = IN({ left: b.x > w.roof.x + w.roof.w / 2 }); return k; });
  assert.equal(b.stocks, CFG.match.stocks, 'no perdió vida');
  assert.notEqual(b.state, S.DEAD);
  assert.ok(w.overRoof(b.x));
});

test('sin jet pack, el aventado no se puede salvar', () => {
  const w = mk();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b);
  b.state = S.THROWN; b.x = w.roof.x + w.roof.w + 40; b.y = w.roof.y - 50; b.vx = 300; b.onGround = false;
  run(w, 2.0, () => { const k = []; k[b.id] = IN({ jump: true, jumpHeld: true }); return k; });
  assert.equal(b.stocks, CFG.match.stocks - 1);
});

test('machacar golpe mientras estás KO acorta el desmayo', () => {
  const w = mk();
  const a = w.addMonito(); w.addMonito();
  run(w, 0.3);
  w.enterKO(a, CFG.ko.duration);
  // 8 pulsaciones por segundo: 1.3 s de reloj + 10 × 0.22 s > 3 s
  run(w, 1.3, (i) => { const k = []; k[a.id] = IN({ punch: i % 15 === 0 }); return k; });
  assert.notEqual(a.state, S.KO, 'despertó en ~1.3 s en lugar de 3');
  assert.ok(has(w.drain(), 'mash'));
});

test('machacar en brazos del cargador te zafa antes', () => {
  const w = mk();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b);
  w.enterKO(b, CFG.ko.duration);
  const i = []; i[a.id] = IN({ grab: true }); w.tick(DT, i); run(w, CFG.grab.windup + 0.02);
  assert.equal(b.state, S.CARRIED);
  run(w, 1.2, (n) => { const k = []; k[b.id] = IN({ punch: n % 12 === 0 }); return k; });
  assert.notEqual(b.state, S.CARRIED);
  assert.equal(a.carryingId, null);
  assert.ok(has(w.drain(), 'breakFree'));
});

test('los jet packs aparecen solos cuando están habilitados', () => {
  const w = mk({ jetpacks: true });
  w.addMonito(); w.addMonito();
  run(w, CFG.jetpack.firstAt + 0.1);
  assert.ok(has(w.drain(), 'jetpackSpawn'));
});
