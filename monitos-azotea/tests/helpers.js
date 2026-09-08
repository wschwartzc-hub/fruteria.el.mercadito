import { World } from '../src/core/world.js';

export const DT = 1 / 120;

export function makeWorld(opts = {}) {
  // rng determinista para las pruebas
  return new World({ barrels: false, rng: () => 0.5, ...opts });
}

export function run(world, seconds, inputsFn = () => []) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) world.tick(DT, inputsFn(i));
}

export function settle(world) { run(world, 0.3); }

export const IN = (o = {}) => ({ left: false, right: false, jump: false, punch: false, grab: false, ...o });

// Coloca a `a` a la izquierda de `b`, a distancia de golpe, mirándose.
export function faceOff(world, a, b, gap = 20) {
  a.x = world.roof.x + world.roof.w / 2 - gap / 2 - a.w / 2;
  b.x = world.roof.x + world.roof.w / 2 + gap / 2 + b.w / 2;
  a.facing = 1; b.facing = -1;
  a.vx = b.vx = 0;
  settle(world);
}

export function has(events, type) { return events.some((e) => e.type === type); }
