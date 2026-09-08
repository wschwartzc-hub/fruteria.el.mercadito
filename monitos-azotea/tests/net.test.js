import test from 'node:test';
import assert from 'node:assert/strict';
import { RemoteInputs, InputSender } from '../src/net/session.js';

test('los contadores remotos se vuelven flancos de un tick, uno por tick', () => {
  const r = new RemoteInputs();
  r.receive(1, { l: true, r: false, jh: false, j: 0, p: 2, g: 0, f: 0 });
  let a = r.read(1); assert.equal(a.punch, false, 'la primera lectura fija la base');
  r.receive(1, { l: true, r: false, jh: true, j: 1, p: 4, g: 0, f: 0 });
  a = r.read(1); assert.deepEqual([a.jump, a.punch, a.jumpHeld, a.left], [true, true, true, true]);
  a = r.read(1); assert.deepEqual([a.jump, a.punch], [false, true], 'el segundo golpe sale al tick siguiente');
  a = r.read(1); assert.equal(a.punch, false);
});

test('si el cliente reinicia sus contadores (revancha), el anfitrión se resincroniza', () => {
  const r = new RemoteInputs();
  r.receive(0, { l: false, r: false, jh: false, j: 15, p: 40, g: 3, f: 0 }); r.read(0);
  r.receive(0, { l: false, r: false, jh: false, j: 0, p: 0, g: 0, f: 0 }); r.read(0); // nueva partida
  r.receive(0, { l: false, r: false, jh: false, j: 1, p: 1, g: 0, f: 0 });
  const a = r.read(0);
  assert.equal(a.jump, true, 'el primer salto de la revancha cuenta');
  assert.equal(a.punch, true);
});

test('un salto enorme de contador no replica cien toques viejos', () => {
  const r = new RemoteInputs();
  r.receive(0, { l: false, r: false, jh: false, j: 0, p: 0, g: 0, f: 0 }); r.read(0);
  r.receive(0, { l: false, r: false, jh: false, j: 0, p: 200, g: 0, f: 0 });
  let n = 0; for (let i = 0; i < 50; i++) if (r.read(0).punch) n++;
  assert.equal(n, 1);
});

test('el cliente manda cuando algo cambia y como latido cada 0.25 s', () => {
  const sent = [];
  const s = new InputSender((m) => sent.push(m));
  const NONE = { left: false, right: false, jump: false, jumpHeld: false, punch: false, grab: false, fart: false };
  s.push({ ...NONE, punch: true }, 0); s.push(NONE, 0.05); s.push(NONE, 0.1); s.push(NONE, 0.3);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].p, 1);
});
