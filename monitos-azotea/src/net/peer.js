// Transporte en línea con WebRTC (PeerJS). No necesita servidor propio:
// el servidor público de PeerJS sólo presenta a los jugadores; después los
// datos viajan directo entre teléfonos. El anfitrión es la "estrella":
// todos se conectan a él y él reparte el estado del juego.
const PEERJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js';
const PREFIX = 'monitos-azotea-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

export function makeCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}
export function normalizeCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); }

// Para pruebas o para usar tu propio PeerServer: window.MONITOS_PEER = { host, port, path, secure, script }.
function peerOptions() {
  const o = window.MONITOS_PEER || {};
  const { script, ...server } = o;
  return { debug: 0, config: ICE, ...server };
}

let loading = null;
export function loadPeerJS() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = (window.MONITOS_PEER && window.MONITOS_PEER.script) || PEERJS_URL; s.async = true;
      s.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error('PeerJS no cargó')));
      s.onerror = () => reject(new Error('No se pudo cargar PeerJS'));
      document.head.appendChild(s);
    });
  }
  return loading;
}

function describe(err) {
  const t = err?.type || '';
  if (t === 'peer-unavailable') return 'No existe una sala con ese código.';
  if (t === 'unavailable-id') return 'Ese código ya está en uso, intenta otra vez.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'No se pudo conectar con el servidor de salas. Revisa tu internet o abre el juego desde la versión publicada.';
  if (t === 'browser-incompatible') return 'Este navegador no soporta juego en línea.';
  return err?.message || 'Error de conexión.';
}

export class HostNet {
  constructor() { this.peer = null; this.conns = new Map(); this.onJoin = null; this.onLeave = null; this.onMessage = null; this.code = null; }

  async open(code = makeCode(), tries = 3) {
    const Peer = await loadPeerJS();
    return new Promise((resolve, reject) => {
      const peer = new Peer(PREFIX + code, peerOptions());
      let settled = false;
      peer.on('open', () => { settled = true; this.peer = peer; this.code = code; this.wire(); resolve(code); });
      peer.on('error', (err) => {
        if (settled) { if (this.onError) this.onError(describe(err)); return; }
        peer.destroy();
        if (err?.type === 'unavailable-id' && tries > 1) this.open(makeCode(), tries - 1).then(resolve, reject);
        else reject(new Error(describe(err)));
      });
    });
  }

  wire() {
    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.conns.set(conn.peer, conn);
        if (this.onJoin) this.onJoin(conn.peer);
      });
      conn.on('data', (msg) => { if (this.onMessage) this.onMessage(conn.peer, msg); });
      const bye = () => { if (this.conns.delete(conn.peer) && this.onLeave) this.onLeave(conn.peer); };
      conn.on('close', bye); conn.on('error', bye);
    });
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) { /* nada */ } });
  }

  send(id, msg) { const c = this.conns.get(id); if (c && c.open) { try { c.send(msg); } catch (e) { /* se cayó */ } } }
  broadcast(msg) { for (const c of this.conns.values()) if (c.open) { try { c.send(msg); } catch (e) { /* se cayó */ } } }
  kick(id) { const c = this.conns.get(id); if (c) c.close(); }
  close() { if (this.peer) this.peer.destroy(); this.peer = null; this.conns.clear(); }
}

export class ClientNet {
  constructor() { this.peer = null; this.conn = null; this.onMessage = null; this.onClose = null; }

  async connect(code) {
    const Peer = await loadPeerJS();
    return new Promise((resolve, reject) => {
      const peer = new Peer(undefined, peerOptions());
      let opened = false;
      const timer = setTimeout(() => { if (!opened) { peer.destroy(); reject(new Error('La sala no respondió. ¿El código es correcto y el anfitrión sigue en la sala?')); } }, 12000);
      peer.on('open', () => {
        const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        conn.on('open', () => { opened = true; clearTimeout(timer); this.peer = peer; this.conn = conn; resolve(); });
        conn.on('data', (msg) => { if (this.onMessage) this.onMessage(msg); });
        conn.on('close', () => { if (this.onClose) this.onClose('El anfitrión cerró la sala.'); });
        conn.on('error', (e) => { if (!opened) { clearTimeout(timer); reject(new Error(describe(e))); } });
      });
      peer.on('error', (err) => { if (!opened) { clearTimeout(timer); peer.destroy(); reject(new Error(describe(err))); } else if (this.onClose && err?.type !== 'peer-unavailable') this.onClose(describe(err)); });
    });
  }

  send(msg) { if (this.conn && this.conn.open) { try { this.conn.send(msg); } catch (e) { /* se cayó */ } } }
  close() { if (this.conn) this.conn.close(); if (this.peer) this.peer.destroy(); this.conn = null; this.peer = null; }
}
