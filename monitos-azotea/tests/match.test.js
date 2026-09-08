import test from 'node:test';
import assert from 'node:assert/strict';
import { S } from '../src/core/world.js';
import { CFG } from '../src/core/config.js';
import { makeWorld, run, IN, has } from './helpers.js';

test('caminar fuera del borde te tira; perder todas las vidas termina la partida', () => {
  const w = makeWorld();
  const a = w.addMonito(), b = w.addMonito();
  run(w, 0.3);
  for (let s = 0; s < CFG.match.stocks; s++) {
    run(w, 4.0, () => { const i = []; i[b.id] = IN({ right: true }); return i; });
    assert.equal(b.stocks, CFG.match.stocks - 1 - s);
    if (b.stocks > 0) { run(w, CFG.match.respawnDelay + 1.0); assert.ok(b.state !== S.DEAD); }
  }
  assert.equal(w.over, true);
  assert.equal(w.winnerId, a.id);
  assert.ok(has(w.drain(), 'matchOver'));
});

test('saltar y caer de vuelta al piso', () => {
  const w = makeWorld();
  const a = w.addMonito(); w.addMonito();
  run(w, 0.3);
  const i = []; i[a.id] = IN({ jump: true });
  w.tick(1 / 120, i);
  assert.equal(a.state, S.JUMP);
  run(w, 1.5);
  assert.equal(a.state, S.IDLE);
  assert.equal(a.y, w.roof.y);
});
