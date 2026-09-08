import test from 'node:test';
import assert from 'node:assert/strict';
import { S, B } from '../src/core/world.js';
import { CFG } from '../src/core/config.js';
import { makeWorld, run, IN, DT, has } from './helpers.js';

test('un barril que cae directo al suelo explota y lanza a los cercanos', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid - 60; b.x = mid + 400; run(w, 0.3); w.drain();
  const br = w.spawnBarrel(mid + 10);
  br.state = B.FALLING; br.fuse = 0; br.y = w.roof.y - 300;
  run(w, 1.5);
  const ev = w.drain();
  assert.ok(has(ev, 'explode'));
  assert.ok(!has(ev, 'squash'));
  assert.ok([S.LAUNCHED, S.KO].includes(a.state), 'a sale volando / KO');
  assert.equal(b.state, S.IDLE, 'b estaba lejos');
  run(w, 1.0);
  assert.equal(a.state, S.KO);
});

test('un barril que cae sobre un monito NO explota, lo desmaya y queda en el suelo', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid; b.x = mid + 400; run(w, 0.3); w.drain();
  const br = w.spawnBarrel(mid);
  br.state = B.FALLING; br.y = w.roof.y - 200;
  run(w, 1.5);
  const ev = w.drain();
  assert.ok(has(ev, 'squash'));
  assert.ok(!has(ev, 'explode'));
  assert.equal(a.state, S.KO);
  assert.equal(br.state, B.REST, 'barril intacto en el suelo');
});

test('un barril en reposo se puede agarrar y aventar; explota al pegarle a alguien', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid - 200; a.facing = 1; b.x = mid + 60; run(w, 0.3);
  const br = w.spawnBarrel(a.x + 30);
  br.state = B.REST; br.armed = false; br.y = w.roof.y;
  let inputs = []; inputs[a.id] = IN({ grab: true });
  w.tick(DT, inputs);
  assert.equal(a.state, S.CARRYING);
  assert.equal(br.state, B.CARRIED);
  w.drain();
  inputs = []; inputs[a.id] = IN({ grab: true });
  w.tick(DT, inputs);
  assert.equal(br.state, B.THROWN);
  run(w, 1.5);
  const ev = w.drain();
  assert.ok(has(ev, 'explode'));
  assert.ok([S.LAUNCHED, S.KO].includes(b.state));
  assert.equal(a.score, 1, 'el que lo aventó suma punto');
});

test('la explosión cancela un agarre en curso', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  const mid = w.roof.x + w.roof.w / 2;
  a.x = mid; b.x = mid + 30; a.facing = 1; run(w, 0.3);
  w.enterKO(b, CFG.ko.duration);
  const inputs = []; inputs[a.id] = IN({ grab: true });
  w.tick(DT, inputs); run(w, CFG.grab.windup + 0.02);
  assert.equal(b.state, S.CARRIED);
  const br = w.spawnBarrel(mid + 80);
  br.state = B.FALLING; br.y = w.roof.y - 100;
  run(w, 1.0);
  assert.ok(has(w.drain(), 'carryCancelled'));
  assert.notEqual(b.state, S.CARRIED);
});

test('los barriles explotan en cadena', () => {
  const w = makeWorld();
  w.addMonito(); w.addMonito();
  const mid = w.roof.x + w.roof.w / 2;
  for (const m of w.monitos) m.x = w.roof.x + 60;
  run(w, 0.3);
  const r1 = w.spawnBarrel(mid); r1.state = B.REST; r1.armed = false; r1.y = w.roof.y;
  const r2 = w.spawnBarrel(mid + 80); r2.state = B.REST; r2.armed = false; r2.y = w.roof.y;
  const f = w.spawnBarrel(mid + 40); f.state = B.FALLING; f.y = w.roof.y - 120;
  run(w, 1.0);
  const explosions = w.drain().filter((e) => e.type === 'explode');
  assert.equal(explosions.length, 3);
});

test('los barriles aparecen solos con aviso previo cuando están habilitados', () => {
  const w = makeWorld({ barrels: true });
  w.addMonito(); w.addMonito();
  run(w, CFG.barrel.spawnGraceInitial + 0.1);
  const ev = w.drain();
  assert.ok(has(ev, 'barrelWarning'));
  run(w, CFG.barrel.warning + 0.1);
  assert.ok(has(w.drain(), 'barrelSpawn'));
});
