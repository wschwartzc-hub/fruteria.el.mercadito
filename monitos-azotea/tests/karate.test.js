import test from 'node:test';
import assert from 'node:assert/strict';
import { S } from '../src/core/world.js';
import { CFG } from '../src/core/config.js';
import { makeWorld, run, faceOff, IN, DT, has } from './helpers.js';

const mk = () => makeWorld({ jetpacks: false, mallets: false, birds: false, beans: false, karates: false });

test('la banda karateka cae, se recoge y dura poco', () => {
  const w = mk();
  const a = w.addMonito(); w.addMonito();
  run(w, 0.3); w.drain();
  const it = w.spawnKarate(a.x); it.y = w.roof.y - 100;
  run(w, 1.5);
  assert.ok(has(w.drain(), 'karatePickup'));
  assert.ok(a.karate > 0 && a.karate <= CFG.karate.duration);
  run(w, CFG.karate.duration + 0.1);
  assert.equal(a.karate, 0);
  assert.ok(has(w.drain(), 'karateEnd'));
});

test('con banda los golpes salen mucho más rápido y el combo de 4 llega antes', () => {
  const punchesUntilLaunch = (karate) => {
    const w = mk();
    const a = w.addMonito(), b = w.addMonito();
    faceOff(w, a, b);
    if (karate) a.karate = CFG.karate.duration;
    b.invuln = 0;
    let t = 0, launched = false;
    // machaca golpe: pulsa cada tick y mantiene a b pegado
    for (let i = 0; i < 1200 && !launched; i++) {
      const inp = []; inp[a.id] = IN({ punch: true });
      w.tick(DT, inp); t += DT;
      if (b.state === S.HITSTUN || b.state === S.IDLE) { b.x = a.x + 40; b.vx = 0; }
      if (w.drain().some((e) => e.type === 'combo')) launched = true;
    }
    return { t, launched };
  };
  const slow = punchesUntilLaunch(false), fast = punchesUntilLaunch(true);
  assert.ok(slow.launched && fast.launched);
  assert.ok(fast.t < slow.t * 0.6, `rápido ${fast.t.toFixed(2)} s vs normal ${slow.t.toFixed(2)} s`);
});
