# Monitos en la Azotea — Documento de diseño (GDD)

> Peleas caóticas en 2D estilo *Gang Beasts*: monitos de gelatina se empujan a
> golpes en la azotea de un edificio. Gana el último que siga arriba.

## 1. Concepto

| | |
|---|---|
| Género | Party fighter / plataformas de empujones, 2D lateral |
| Jugadores | 2 a 4 locales (teclado y/o gamepad), bots para rellenar |
| Duración de partida | 1 a 3 minutos |
| Tono | Cómico, torpe, exagerado. Nadie "muere": se caen y regresan |
| Plataforma | Web (HTML5 canvas, sin build). Funciona en GitHub Pages |
| Referencias | Gang Beasts (agarres y caídas), Smash Bros (stocks y "sacar del escenario"), Super Meat Boy (squash & stretch) |

**Fantasía del jugador:** ser un muñeco de gelatina torpe que intenta tirar a los
demás del edificio, y reírse cuando el plan sale mal (te cae un barril encima,
te pegan mientras cargas a alguien, el desmayado despierta en tus brazos).

## 2. Reglas del juego

### 2.1 Escenario
- Una sola azotea plana (más adelante: variantes con niveles y obstáculos).
- No hay paredes: si sales por izquierda o derecha, caes.
- Caer por debajo del edificio = pierdes una **vida** (stock). Reapareces
  desde arriba en el centro tras 2 s, con 1.5 s de invulnerabilidad parpadeante.

### 2.2 Acciones
| Acción | Efecto |
|---|---|
| Mover | Caminar izquierda/derecha. En el aire hay control reducido |
| Saltar | Salto único (sin doble salto por ahora) |
| Golpear | Puñetazo corto al frente. Empuja y aturde 0.28 s |
| Agarrar / Aventar | Si hay un monito **desmayado** cerca: lo levanta (0.35 s de "cargar"). Si ya cargas algo: lo avientas. Si hay un **barril** en el piso: lo tomas |

### 2.3 Combo de 4 golpes
- Cada golpe que conecta suma 1 al **combo de la víctima**.
- El combo cuenta sólo si el siguiente golpe llega en menos de **1.4 s** y viene
  del **mismo atacante** (otro atacante reinicia el conteo en 1).
- Al **4.º golpe** la víctima sale volando (`launched`) y al aterrizar queda
  **desmayada (KO) 3 segundos**, con pajaritos dando vueltas sobre la cabeza.
- Mientras está KO no puede hacer nada. Al despertar tiene 0.5 s de
  invulnerabilidad para que no la vuelvan a encadenar de inmediato.

### 2.4 Cargar y aventar a un desmayado
- Cualquier jugador (incluido un aliado, no hay equipos) puede levantar a un KO.
- El que carga camina más lento (150 px/s vs 270) y **no puede saltar ni golpear**.
- Aventar: sale disparado hacia donde miras. Si cae al vacío, pierde la vida.
  Si aterriza en la azotea, sigue KO al menos 0.8 s.
- **Cancelación:** si golpean al que carga (durante el "cargar" o mientras
  camina con él), o golpean al cargado, el agarre se rompe y **el desmayado se
  levanta de inmediato**, ya en estado normal.
- El reloj del desmayo **sigue corriendo mientras lo cargan**: si llega a cero
  en tus brazos, **se zafa** y te da un empujón. Esto obliga a decidir rápido.
- Dos jugadores no pueden levantar al mismo desmayado: gana el primero que
  presionó agarrar.

### 2.5 Barriles
- A partir del segundo 5 caen barriles cada 6 a 12 s en un punto aleatorio.
  Antes de caer hay **1.2 s de aviso** (sombra que crece y señal `!`).
- **Cae directo al piso:** explota. Radio 150 px. Todos los que están dentro
  salen volando y quedan KO. Los barriles cercanos explotan en cadena.
- **Cae sobre un monito:** NO explota. El monito queda **KO al instante**
  (si estaba cargando a alguien, se cancela). El barril rebota y queda intacto
  en el piso.
- Un barril en el piso se puede **cargar y aventar**. Al aventarlo se enciende
  la mecha: explota al tocar el piso o a cualquier monito (excepto al que lo
  aventó durante los primeros 0.2 s).
- Un barril que rueda fuera de la azotea desaparece sin explotar.

### 2.6 Condición de victoria
- Cada monito tiene **3 vidas**. Pierde una al caer del edificio.
- Gana el último con vidas. Se muestra un marcador de "KOs" (combos de 4 y
  explosiones que provocaste) para picar el orgullo.
- Modos futuros: tiempo límite (gana quien tiene más vidas), equipos 2v2,
  "rey de la azotea" por puntos.

## 3. Controles

**Prioridad: celular.** Sólo hay tres acciones (mover/saltar, golpear,
agarrar) para que quepan en dos pulgares sin mirar la pantalla.

### 3.1 Táctil (principal)
- **Joystick flotante** en la mitad izquierda: aparece donde apoyas el pulgar,
  así no hay que buscarlo. Izquierda/derecha mueve; **empujar hacia arriba
  salta** (hay que regresar el pulgar al centro para volver a saltar, evita
  saltos accidentales). Zona muerta del 32 % para que caminar sea estable.
- **👊 Golpe**: botón grande (88 px) abajo a la derecha, bajo el pulgar derecho.
- **✋ Agarrar / Aventar**: botón amarillo junto al de golpe. Misma tecla
  para levantar, aventar y tomar barriles: una sola idea, "manos".
- Al elegir modo se pide pantalla completa y orientación horizontal. En
  vertical aparece un aviso de "gira tu teléfono".
- **2 jugadores en el mismo aparato:** la pantalla se parte en mitades. Cada
  jugador tiene su joystick en la esquina exterior y sus dos botones al lado,
  todos pegados al borde inferior para no tapar la azotea. Cómodo en tablet;
  en teléfono funciona pero queda apretado.
- Los controles son elementos HTML encima del canvas (`src/touch.js`), con
  `pointer events` y captura por dedo, para que dos o cuatro pulgares a la vez
  no se estorben.

### 3.2 Teclado y gamepad (escritorio)
| | Jugador 1 | Jugador 2 | Gamepad |
|---|---|---|---|
| Mover | A / D | ← / → | Stick izq. / D-pad |
| Saltar | W (o Espacio) | ↑ | A |
| Golpear | F (o J) | , (o O) | X |
| Agarrar / Aventar | G (o K) | . (o P) | B |

Menú con botones tocables; en teclado también `1`..`4`. `R` = revancha,
`Esc` = menú.

## 4. Dirección de arte

- **Monitos vectoriales, no sprites.** Se dibujan con trazos de canvas, así el
  cuerpo se puede deformar (squash & stretch al aterrizar, estirarse al saltar,
  temblar al recibir golpe) y la cara cambia de expresión por estado.
- Estilo: contorno grueso oscuro, colores planos con una luz suave, cabezas
  grandes, brazos "de gelatina" (curvas con codo), pies tipo tenis.
- Cada jugador tiene color y accesorio propio: gorra, cresta, banda, goggles.
- **Caras por estado:** normal, feliz (caminando), enojado (golpeando), "ouch"
  (aturdido), gritando (volando o cayendo), esfuerzo (cargando), KO (ojos en X,
  lengua fuera, pajaritos).
- Escenario inspirado en el boceto original: nubes garabateadas, edificio con
  ventanas chuecas, tinaco y antena. Ciudad al fondo.
- Efectos: onomatopeyas (¡POW!, ¡ZAS!, ¡BOOM!), estrellas, polvo al aterrizar,
  anillo de explosión, tablas del barril volando, screen shake y flash.

### Pendiente de arte
- Animación de aterrizaje de reaparición (paracaídas o globo).
- Ropa/gestos extra por personaje, variantes de skin.
- Fondo con parallax (nubes en dos capas, ciudad lejana más lenta).

## 5. Audio (pendiente)
- Golpes tipo cartoon (bofetada, "boing"), silbido al volar, "plop" al caer,
  campanitas + pajaritos para el KO, mecha siseando, explosión seca.
- Música loop tipo circo / ska, sube el tempo cuando quedan 2 jugadores.
- Implementar con Web Audio (osciladores + ruido) para no depender de assets,
  o con archivos .ogg en `assets/sfx/`.

## 6. Interfaz
- Tarjetas por jugador arriba: color, nombre, vidas, KOs.
- Sobre cada monito: nombre, contador de combo `n/4` y anillo de tiempo de KO.
- Menú inicial con controles; pantalla de victoria con revancha.

## 7. Estructura del proyecto

```
monitos-azotea/
├── index.html            → punto de entrada (canvas + carga de módulos)
├── src/
│   ├── core/
│   │   ├── config.js     → todos los números ajustables del juego
│   │   └── world.js      → reglas y física (puro JS, sin canvas, probado)
│   ├── render/
│   │   ├── monito.js     → dibujo y animación procedural de los monitos
│   │   ├── scene.js      → fondo, edificio, barriles
│   │   └── effects.js    → partículas, textos, shake
│   ├── bot.js            → IA sencilla para rellenar jugadores
│   └── game.js           → loop, input, HUD, menús
├── tests/                → pruebas de reglas con `node --test`
└── docs/                 → este documento, LOGICA.md y ROADMAP.md
```

La separación importa: `world.js` no sabe que existe un canvas. Eso permite
probar cada regla en Node, y más adelante correr el mismo `World` en un
servidor para multijugador en línea.
