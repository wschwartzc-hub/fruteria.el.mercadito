import test from 'node:test';
import assert from 'node:assert/strict';
import { S, B } from '../src/core/world.js';
import { CFG } from '../src/core/config.js';
import { makeWorld, run, IN, DT, has } from './helpers.js';

test('un frijol cae, se come al pisarlo y da una carga', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  run(w, 0.3); w.drain();
  const bean = w.spawnBean(a.x);
  bean.y = w.roof.y - 150;
  run(w, 1.5);
  const ev = w.drain();
  assert.ok(has(ev, 'eat'));
  assert.equal(a.beans, 1);
  assert.equal(b.beans, 0);
  assert.equal(w.beans.length, 0);
});

test('los frijoles aparecen solos y desaparecen si nadie los come', () => {
  const w = makeWorld({ beans: true });
  const a = w.addMonito(), b = w.addMonito();
  a.x = w.roof.x + 30; b.x = w.roof.x + w.roof.w - 30; // lejos del centro (rng=0.5)
  run(w, CFG.bean.firstAt + 0.1);
  assert.ok(has(w.drain(), 'beanSpawn'));
  w.beansEnabled = false; // sólo nos interesa este frijol
  run(w, 2.0);
  assert.equal(w.beans[0].state, 'rest');
  run(w, CFG.bean.ttl + 0.5);
  assert.equal(w.beans.length, 0);
});

test('el pedo desmaya a todos en el radio, no al que lo tira, y consume el frijol', () => {
  const w = makeWorld();
  const a = w.addMonito({ total: 3 }), b = w.addMonito({ total: 3 }), c = w.addMonito({ total: 3 });
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid; b.x = mid + 80; c.x = mid + 400; run(w, 0.3); w.drain();
  a.beans = 1;
  const inputs = []; inputs[a.id] = IN({ fart: true });
  w.tick(DT, inputs);
  assert.equal(a.state, S.FART);
  run(w, CFG.fart.windup + 0.05);
  const ev = w.drain();
  assert.ok(has(ev, 'fart'));
  assert.equal(b.state, S.KO);
  assert.equal(c.state, S.IDLE, 'estaba fuera del radio');
  assert.equal(a.state, S.IDLE);
  assert.equal(a.beans, 0);
});

test('sin frijoles no se puede tirar pedos', () => {
  const w = makeWorld();
  const a = w.addMonito(); w.addMonito();
  run(w, 0.3);
  const inputs = []; inputs[a.id] = IN({ fart: true });
  w.tick(DT, inputs);
  assert.notEqual(a.state, S.FART);
});

test('si te pegan mientras te agachas, el pedo se cancela y conservas el frijol', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid; a.facing = 1; b.x = mid - 20 - a.w; b.facing = 1; run(w, 0.3);
  a.beans = 1;
  let inputs = []; inputs[a.id] = IN({ fart: true });
  w.tick(DT, inputs);
  inputs = []; inputs[b.id] = IN({ punch: true });
  w.tick(DT, inputs); run(w, CFG.punch.windup + 0.03);
  assert.equal(a.state, S.HITSTUN);
  assert.equal(a.beans, 1);
  run(w, 1.0);
  assert.ok(!has(w.drain(), 'fart'));
});

test('el pedo enciende un barril cercano', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid; b.x = mid + 400; run(w, 0.3);
  const br = w.spawnBarrel(mid + 60); br.state = B.REST; br.armed = false; br.y = w.roof.y;
  a.beans = 1;
  const inputs = []; inputs[a.id] = IN({ fart: true });
  w.tick(DT, inputs); run(w, 1.0);
  assert.ok(has(w.drain(), 'explode'));
});
