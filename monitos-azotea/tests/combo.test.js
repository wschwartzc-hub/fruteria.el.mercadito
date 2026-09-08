import test from 'node:test';
import assert from 'node:assert/strict';
import { S } from '../src/core/world.js';
import { CFG } from '../src/core/config.js';
import { makeWorld, run, faceOff, IN, DT, has } from './helpers.js';

function punchOnce(world, attacker) {
  const inputs = []; inputs[attacker.id] = IN({ punch: true });
  world.tick(DT, inputs);
  run(world, 0.5); // termina el golpe y el hitstun
}

test('un golpe empuja y aturde a la víctima (hitstun), sin desmayarla', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b);
  const inputs = []; inputs[a.id] = IN({ punch: true });
  w.tick(DT, inputs);
  run(w, CFG.punch.windup + 0.02);
  const ev = w.drain();
  assert.ok(has(ev, 'hit'), 'debe emitir hit');
  assert.equal(b.state, S.HITSTUN);
  assert.ok(b.vx > 0, 'sale empujado hacia la derecha');
  run(w, 0.6);
  assert.notEqual(b.state, S.KO);
});

test('4 golpes seguidos = lanzamiento y desmayo de 3s con despertar', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  for (let i = 0; i < CFG.combo.hitsToLaunch; i++) {
    faceOff(w, a, b);
    w.drain();
    punchOnce(w, a);
    if (i < CFG.combo.hitsToLaunch - 1) assert.equal(b.combo.count, i + 1, `combo debe ir en ${i + 1}`);
  }
  const ev = w.drain();
  assert.ok(has(ev, 'combo'), 'debe emitir combo');
  assert.ok(has(ev, 'launch'), 'debe emitir launch');
  run(w, 1.0);
  assert.equal(b.state, S.KO, 'tras aterrizar queda KO');
  assert.equal(a.score, 1);
  run(w, CFG.ko.duration + 0.1);
  assert.equal(b.state, S.IDLE, 'después de 3 s se levanta');
  assert.ok(has(w.drain(), 'wake'));
});

test('el combo se reinicia si pasa la ventana de tiempo', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b); punchOnce(w, a);
  assert.equal(b.combo.count, 1);
  run(w, CFG.combo.window + 0.2);
  faceOff(w, a, b); punchOnce(w, a);
  assert.equal(b.combo.count, 1, 'se reinicia a 1');
});

test('un atacante distinto reinicia el conteo del combo', () => {
  const w = makeWorld();
  const a = w.addMonito({ total: 3 }), b = w.addMonito({ total: 3 }), c = w.addMonito({ total: 3 });
  c.x = w.roof.x + 60; // fuera del pleito
  faceOff(w, a, b); punchOnce(w, a);
  faceOff(w, a, b); punchOnce(w, a);
  assert.equal(b.combo.count, 2);
  // Ahora c golpea a b desde la derecha
  b.x = w.roof.x + w.roof.w / 2; c.x = b.x + 20 + b.w; c.facing = -1; b.vx = 0; run(w, 0.3);
  punchOnce(w, c);
  assert.equal(b.combo.attackerId, c.id);
  assert.equal(b.combo.count, 1);
});

test('la invulnerabilidad al despertar evita golpes inmediatos', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  faceOff(w, a, b);
  w.enterKO(b, 0.01);
  run(w, 0.05);
  assert.equal(b.state, S.IDLE);
  assert.ok(b.invuln > 0);
  const inputs = []; inputs[a.id] = IN({ punch: true });
  w.tick(DT, inputs); run(w, 0.15);
  assert.ok(!has(w.drain(), 'hit'));
});
