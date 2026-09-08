// Parámetros de juego. Todo lo que se "siente" del juego vive aquí para
// poder ajustarlo sin tocar la lógica. Unidades: píxeles, segundos.
export const CFG = {
  gravity: 2300,

  // Azotea: x = borde izquierdo, w = ancho, y = altura del piso (los pies).
  roof: { x: 200, y: 560, w: 880 },

  monito: {
    w: 44, h: 68,
    walkSpeed: 270,      // velocidad normal
    carrySpeed: 150,     // cargando a alguien / un barril
    accel: 2600,         // qué tan rápido llega a la velocidad
    friction: 8,         // frenado en piso (exponencial por segundo)
    airControl: 0.55,    // fracción de control en el aire
    jumpVel: 800,
  },

  punch: {
    windup: 0.07,        // antes de que el golpe "conecte"
    active: 0.10,        // ventana en que el puño hace daño
    recovery: 0.16,      // tiempo muerto después
    range: 46,           // alcance frente al cuerpo
    knockbackX: 240,
    knockbackY: 140,
    hitstun: 0.28,       // aturdimiento de la víctima
  },

  combo: {
    hitsToLaunch: 4,     // 4to golpe = sale volando
    window: 1.4,         // segundos máximos entre golpes para que cuente
    launchX: 520,
    launchY: 560,
  },

  ko: {
    duration: 3.0,       // tiempo desmayado (pajaritos)
    minAfterThrow: 0.8,  // al aterrizar tras ser aventado, sigue KO al menos esto
    invulnAfterWake: 0.5,
  },

  grab: {
    range: 64,           // distancia para poder agarrar
    windup: 0.35,        // tiempo de "cargar"; si te pegan aquí, se cancela
    throwX: 620,
    throwY: 420,
  },

  barrel: {
    w: 38, h: 48,
    spawnGraceInitial: 5,  // sin barriles los primeros segundos
    spawnMin: 6, spawnMax: 12,
    warning: 1.2,          // segundos de aviso (sombra) antes de que aparezca
    explodeRadius: 150,
    explodeLaunchX: 640,
    explodeLaunchY: 600,
    chainDelay: 0.12,      // reacción en cadena entre barriles
    throwX: 560, throwY: 320,
    restFriction: 4,
  },

  bean: {
    w: 28, h: 24,
    firstAt: 7,            // primer frijol
    spawnMin: 7, spawnMax: 13,
    ttl: 12,               // segundos en el piso antes de desaparecer
    maxCharges: 3,         // frijoles que puedes guardar
  },

  fart: {
    windup: 0.45,          // agacharse antes del pedo; si te pegan, se cancela
    radius: 125,           // todos los demás dentro del radio se desmayan
    cloud: 1.0,            // duración de la nube (solo visual)
  },

  match: {
    maxPlayers: 8,         // una especie por jugador
    stocks: 3,
    respawnDelay: 2.0,
    respawnInvuln: 1.5,
    deathDepth: 420,       // píxeles por debajo de la azotea = eliminado
  },
};
