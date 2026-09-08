# 🐒 Monitos en la Azotea

Juego 2D de peleas caóticas estilo *Gang Beasts*: animales de gelatina (mono,
león, zorro, panda…) se empujan a golpes en la azotea de una torre. Combo de
4 golpes = sale volando y queda desmayado; cárgalo y aviéntalo al vacío antes
de que despierte. Del cielo caen barriles que explotan y frijoles que, si te
los comes, te dejan tirar un pedo que desmaya a todos los que estén cerca.

## Jugar

Es HTML + canvas + JavaScript sin build, pero usa módulos ES, así que hay que
servirlo (no abrir con doble clic):

```bash
npm start          # http://localhost:5173
# o cualquier servidor estático: python3 -m http.server 5173
```

En GitHub Pages funciona directo.

**La forma más fácil:** `npm run build` genera `dist/monitos-azotea.html`, un
solo archivo sin dependencias. Ese sí se abre con doble clic, se manda por
WhatsApp o se sube a cualquier lado. Ya viene generado en el repo.

### Controles

Pensado para celular en horizontal (se pone en pantalla completa al tocar un modo):

| Táctil | |
|---|---|
| Joystick (pulgar izquierdo, aparece donde tocas) | mover (empujar arriba también salta) |
| ⬆️ botón morado | saltar |
| 👊 botón grande | golpear |
| ✋ botón amarillo | agarrar / aventar (desmayados y barriles) |
| 💨 botón verde | pedo (se enciende cuando llevas frijol) |

Modo "2 jugadores" en un solo teléfono o tablet: cada quien controla su mitad
de la pantalla (joystick en la esquina, botones junto a él).

| Teclado / gamepad | Jugador 1 | Jugador 2 | Gamepad |
|---|---|---|---|
| Mover | A / D | ← / → | Stick / D-pad |
| Saltar | W | ↑ | A |
| Golpear | F | , | X |
| Agarrar / Aventar | G | . | B |
| Pedo | H | / | Y |

## Pruebas

Las reglas viven en `src/core/world.js` sin depender del navegador, y se
prueban con el runner de Node:

```bash
npm test
```

## Documentación

- [`docs/GDD.md`](docs/GDD.md) — diseño: concepto, reglas, controles, arte, UI.
- [`docs/LOGICA.md`](docs/LOGICA.md) — máquinas de estado, orden del tick,
  fórmulas de combo, agarre y barriles, eventos, bot, parámetros para ajustar.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — qué sigue.

## Estructura

```
index.html          → entrada
src/core/config.js  → números ajustables
src/core/world.js   → reglas + física (puro JS)
src/render/         → monitos vectoriales, escenario, efectos
src/bot.js          → IA sencilla
src/game.js         → loop, input, HUD, menús
tests/              → pruebas de reglas
scripts/bundle.mjs  → empaqueta todo en dist/monitos-azotea.html
design/             → láminas del lienzo de diseño (personajes, escenario, controles)
```

## Mover este proyecto a su propio repositorio

Este juego nació dentro de otro repo. Para sacarlo con su historial:

```bash
# desde la raíz del repo que lo contiene
git subtree split --prefix=monitos-azotea -b monitos-azotea-solo
# crear el repo vacío en GitHub y luego:
git push git@github.com:<usuario>/monitos-azotea.git monitos-azotea-solo:main
```

O más simple: copiar la carpeta a un repo nuevo y hacer el primer commit.
