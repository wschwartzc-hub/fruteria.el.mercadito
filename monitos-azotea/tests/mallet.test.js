import test from 'node:test';
import assert from 'node:assert/strict';
import { S } from '../src/core/world.js';
import { CFG } from '../src/core/config.js';
import { makeWorld, run, faceOff, IN, DT, has } from './helpers.js';

const mk = (o = {}) => makeWorld({ jetpacks: false, mallets: false, birds: false, beans: false, ...o });

test('el mazo cae, se recoge al pisarlo y un golpe manda a volar', () => {
  const w = mk();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b, 40); w.drain();
  const it = w.spawnMallet(a.x); it.y = w.roof.y - 100;
  run(w, 1.0);
  assert.ok(has(w.drain(), 'malletPickup'));
  assert.equal(a.mallet.uses, CFG.mallet.uses);
  const i = []; i[a.id] = IN({ punch: true }); w.tick(DT, i);
  assert.equal(a.state, S.MALLET);
  run(w, CFG.mallet.windup + 0.05);
  const ev = w.drain();
  assert.ok(has(ev, 'malletHit'));
  assert.equal(b.state, S.LAUNCHED);
  assert.equal(a.mallet.uses, CFG.mallet.uses - 1);
  run(w, 1.2);
  assert.equal(b.state, S.KO);
});

test('el mazo pega a varios a la vez y se rompe tras 3 golpes', () => {
  const w = mk();
  const a = w.addMonito({ total: 3 }), b = w.addMonito({ total: 3 }), c = w.addMonito({ total: 3 });
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid; a.facing = 1; b.x = mid + 50; c.x = mid + 90; run(w, 0.3);
  a.mallet = { uses: 1 };
  const i = []; i[a.id] = IN({ punch: true }); w.tick(DT, i);
  run(w, CFG.mallet.windup + 0.05);
  const ev = w.drain();
  assert.equal(ev.filter((e) => e.type === 'malletHit').length, 2);
  assert.equal(b.state, S.LAUNCHED); assert.equal(c.state, S.LAUNCHED);
  assert.equal(a.mallet, null, 'se rompió');
  assert.ok(has(ev, 'malletBroken'));
});

test('el golpe del mazo va por abajo: saltando se esquiva', () => {
  const w = mk();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b, 40);
  a.mallet = { uses: 3 };
  let i = []; i[a.id] = IN({ punch: true }); w.tick(DT, i);
  // b salta durante el windup
  i = []; i[b.id] = IN({ jump: true }); w.tick(DT, i);
  run(w, CFG.mallet.windup + 0.05);
  assert.ok(!has(w.drain(), 'malletHit'));
  assert.notEqual(b.state, S.LAUNCHED);
});

test('el contador de combo baja de uno en uno si no hay golpes, no se reinicia de golpe', () => {
  const w = mk();
  const a = w.addMonito(), b = w.addMonito();
  const punch = () => { faceOff(w, a, b); const i = []; i[a.id] = IN({ punch: true }); w.tick(DT, i); run(w, 0.5); };
  punch(); punch();
  assert.equal(b.combo.count, 2);
  run(w, CFG.combo.window - 0.3);
  assert.equal(b.combo.count, 1, 'bajó a 1');
  run(w, CFG.combo.decay + 0.05);
  assert.equal(b.combo.count, 0, 'bajó a 0');
  punch(); assert.equal(b.combo.count, 1);
  punch(); assert.equal(b.combo.count, 2);
  // dentro de la ventana un golpe sigue sumando aunque hayan pasado 1.5 s
  run(w, 1.0); punch();
  assert.equal(b.combo.count, 3);
});

test('una paloma baja tumba ligeramente a quien se cruce, una sola vez', () => {
  const w = mk();
  const a = w.addMonito(), b = w.addMonito();
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid; b.x = mid + 300; run(w, 0.3); w.drain();
  const bird = w.spawnBird({ dir: 1, low: true, y: w.roof.y - 30 });
  bird.x = a.x - 200;
  run(w, 0.7);
  const ev = w.drain();
  assert.equal(ev.filter((e) => e.type === 'birdHit').length, 1);
  assert.ok(a.combo.count === 0, 'no cuenta como golpe de combo');
  run(w, 0.5);
  assert.equal(a.state, S.IDLE, 'sólo fue un aturdimiento ligero');
  assert.ok(bird.scared);
});

test('una paloma alta no molesta a nadie', () => {
  const w = mk();
  const a = w.addMonito(); w.addMonito();
  run(w, 0.3); w.drain();
  const bird = w.spawnBird({ dir: 1, low: false, y: w.roof.y - 250 }); bird.x = a.x - 200;
  run(w, 1.5);
  assert.ok(!has(w.drain(), 'birdHit'));
});
