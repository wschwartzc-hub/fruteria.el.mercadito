// Controles táctiles. Un joystick flotante (mover; empujar hacia arriba =
// saltar) y dos botones grandes (golpear, agarrar/aventar) por jugador.
// Soporta 1 jugador (todo el ancho) o 2 en la misma pantalla (mitad y mitad).
const STICK_R = 56;       // radio útil del joystick en px CSS
const DEAD = 0.32;        // zona muerta horizontal
const JUMP_PUSH = -0.62;  // empujar hacia arriba más allá de esto = salto

export class TouchControls {
  constructor(root) {
    this.root = root;
    this.players = [];
    this.enabled = false;
  }

  static isTouchDevice() {
    return (navigator.maxTouchPoints || 0) > 0 || matchMedia('(pointer: coarse)').matches;
  }

  setup(n) {
    this.root.innerHTML = '';
    this.players = [];
    for (let i = 0; i < n; i++) this.players.push(this.buildPlayer(i, n));
    this.root.hidden = n === 0;
    this.root.dataset.players = String(n);
    this.enabled = n > 0;
  }

  buildPlayer(i, n) {
    const p = { dx: 0, dy: 0, punch: false, grab: false, jumpBtn: false, fart: false, jumpArmed: true, prev: { punch: false, grab: false, jumpBtn: false, fart: false }, pointerId: null, els: {} };
    const side = n === 1 ? 'solo' : i === 0 ? 'left' : 'right';

    const zone = document.createElement('div');
    zone.className = `tc-zone tc-${side}`;
    zone.innerHTML = '<div class="tc-base"><div class="tc-knob"></div></div><div class="tc-hint">mover · ↑ saltar</div>';
    const base = zone.querySelector('.tc-base'), knob = zone.querySelector('.tc-knob');
    let ox = 0, oy = 0;
    const place = (x, y) => { base.style.left = `${x}px`; base.style.top = `${y}px`; };
    zone.addEventListener('pointerdown', (e) => {
      if (p.pointerId != null) return;
      p.pointerId = e.pointerId; zone.setPointerCapture(e.pointerId);
      const r = zone.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      place(ox, oy); base.classList.add('on'); knob.style.transform = 'translate(0,0)';
      p.dx = 0; p.dy = 0; p.jumpArmed = true;
      e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== p.pointerId) return;
      const r = zone.getBoundingClientRect();
      let dx = e.clientX - r.left - ox, dy = e.clientY - r.top - oy;
      const len = Math.hypot(dx, dy);
      if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      p.dx = dx / STICK_R; p.dy = dy / STICK_R;
    });
    const release = (e) => {
      if (e.pointerId !== p.pointerId) return;
      p.pointerId = null; p.dx = 0; p.dy = 0; p.jumpArmed = true;
      base.classList.remove('on'); knob.style.transform = 'translate(0,0)';
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
    zone.addEventListener('lostpointercapture', release);

    const btns = document.createElement('div');
    btns.className = `tc-btns tc-${side}`;
    const mk = (cls, label, sub, key) => {
      const b = document.createElement('div');
      b.className = `tc-btn ${cls}`;
      b.innerHTML = `<span class="tc-ico">${label}</span><span class="tc-sub">${sub}</span>`;
      const down = (e) => { p[key] = true; b.classList.add('on'); b.setPointerCapture?.(e.pointerId); e.preventDefault(); };
      const up = () => { p[key] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      return b;
    };
    const top = document.createElement('div'); top.className = 'tc-row';
    const bottom = document.createElement('div'); bottom.className = 'tc-row';
    p.els.fart = mk('tc-fart', '💨', 'pedo', 'fart'); p.els.fart.classList.add('off');
    top.appendChild(p.els.fart);
    top.appendChild(mk('tc-jump', '⬆️', 'salto', 'jumpBtn'));
    bottom.appendChild(mk('tc-grab', '✋', 'agarrar', 'grab'));
    bottom.appendChild(mk('tc-punch', '👊', 'golpe', 'punch'));
    btns.appendChild(top); btns.appendChild(bottom);
    this.root.appendChild(zone); this.root.appendChild(btns);
    return p;
  }

  // Muestra cuántos frijoles tiene el jugador (el botón de pedo se enciende).
  setBeans(i, n) {
    const p = this.players[i];
    if (!p || !p.els.fart) return;
    p.els.fart.classList.toggle('off', n <= 0);
    p.els.fart.querySelector('.tc-sub').textContent = n > 0 ? `pedo ×${n}` : 'pedo';
  }

  // Devuelve el input del jugador i con flancos (jump/punch/grab/fart sólo el tick en que se presionan).
  read(i) {
    const p = this.players[i];
    if (!p) return null;
    const jumpHeld = p.dy < JUMP_PUSH;
    let jump = false;
    if (jumpHeld && p.jumpArmed) { jump = true; p.jumpArmed = false; }
    if (p.dy > JUMP_PUSH * 0.5) p.jumpArmed = true; // hay que soltar hacia el centro para volver a saltar
    const edge = (k) => { const v = p[k] && !p.prev[k]; p.prev[k] = p[k]; return v; };
    jump = edge('jumpBtn') || jump;
    return { left: p.dx < -DEAD, right: p.dx > DEAD, jump, jumpHeld: p.jumpBtn || jumpHeld, punch: edge('punch'), grab: edge('grab'), fart: edge('fart') };
  }
}
