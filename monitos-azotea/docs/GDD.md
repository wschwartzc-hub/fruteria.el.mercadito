# Monitos en la Azotea — Documento de diseño (GDD)

> Peleas caóticas en 2D estilo *Gang Beasts*: monitos de gelatina se empujan a
> golpes en la azotea de un edificio. Gana el último que siga arriba.

## 1. Concepto

| | |
|---|---|
| Género | Party fighter / plataformas de empujones, 2D lateral |
| Jugadores | 2 a 8: en línea con código de sala, o 2 locales en la misma pantalla; bots para rellenar |
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
- El combo sigue vivo mientras el contador esté arriba de cero y venga del
  **mismo atacante** (otro atacante reinicia el conteo en 1). Tras **2.2 s**
  sin golpes el contador **baja de uno en uno** cada 0.7 s, visible sobre la
  víctima, en lugar de reiniciarse de golpe.
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

### 2.6 Frijoles y pedos
- A partir del segundo 7 caen **frijoles** del cielo cada 7 a 13 s. Caen
  lento y quedan en la azotea 12 s; si nadie los come, desaparecen.
- Se comen **al pisarlos** (caminando, saltando o incluso cargando algo).
  Cada frijol da una carga; se guardan hasta 3.
- **Pedo:** con carga y en el piso, el botón 💨 agacha al monito 0.45 s y
  suelta una nube de 125 px de radio. **Todos los demás dentro del radio se
  desmayan** (KO de 3 s, igual que un combo). Los que ya estaban KO
  recargan su reloj. El que lo tira es inmune.
- Si te pegan mientras te agachas, el pedo se cancela y **conservas** el frijol.
- Un barril en el piso dentro de la nube se enciende y explota (gas + mecha).
  Es la forma de que el pedo tenga riesgo: la explosión también te alcanza.

**Ritmo:** con el jet pack y el machacar, un combo o un aventón ya no es
sentencia: siempre hay una salida si reaccionas. Eso mantiene a todos
presionando botones en vez de mirar.

### 2.7 Jet pack
- A partir del segundo 12 baja una **mochila jet pack en paracaídas** cada 14
  a 22 s. Se recoge al pisarla (una por monito) y se queda en la espalda.
- **Mantener salto en el aire** enciende la mochila: sube rápido, con control
  total hacia los lados. Tiene **1.4 s de gasolina** en total, usable a ratos;
  al acabarse, la mochila se cae ("¡SIN GAS!"). Sobre la cabeza se ve la
  barra de gasolina.
- **Sirve para salvarse:** un monito aventado, lanzado por un combo o
  cayendo del borde que traiga jet pack puede **presionar salto**: despierta
  en el aire ("¡SALVADO!"), toma el control y puede volar de regreso. Sin
  gasolina no hay rescate. Al perder una vida, la mochila se pierde.

### 2.8 Despertar machacando
- Mientras estás desmayado (en el piso o en brazos de alguien), cada toque
  de **golpe** quita 0.22 s al reloj del KO. Machacando a ~8 toques por
  segundo despiertas en poco más de 1 s en vez de 3, o te zafas antes del
  que te está cargando. Sobre tu monito parpadea "¡MACHACA GOLPE!".
- Esto obliga al que carga a decidir rápido y a los demás a no confiarse.

### 2.9 Mazo
- A partir del segundo 18 cae un **mazo** cada 22 a 36 s. Se recoge solo al
  pisarlo y se lleva al hombro (uno por monito, 3 golpes antes de romperse).
- Con mazo, el botón de golpe hace un **barrido por abajo**: 0.3 s de aviso
  (el mazo se levanta atrás), 0.14 s de golpe con 95 px de alcance que sólo
  pega hasta el 45 % de la altura del cuerpo, y 0.45 s de recuperación.
- Todo el que esté en el barrido **sale volando** (queda KO al caer), también
  los ya desmayados. Pega a varios a la vez. La única defensa es **saltar** a
  tiempo, como con una cuerda. Si te pegan durante el aviso, el golpe se cancela.

### 2.10 Palomas
- Cada 10 a 18 s cruza una paloma. Dos de cada tres van a la altura de los
  monitos; el resto pasan alto, de adorno.
- Si una paloma baja choca contigo, te **aturde ligeramente** (mismo empujón
  que un golpe, pero **no cuenta para el combo**) y sale volando asustada
  soltando plumas. Se esquiva saltando.

### 2.11 En línea
- Sala con código de 4 letras. Hasta **8 jugadores** (uno por animal). El
  anfitrión decide cuándo empezar y puede agregar bots.
- Nadie repite animal dentro de una sala.
- **Encontrarte de un vistazo:** tu monito lleva una flecha amarilla grande
  que rebota con la etiqueta "TÚ" (o "J1"/"J2" en dos jugadores locales),
  un halo amarillo bajo los pies y tu tarjeta del HUD va resaltada.
- Si alguien se desconecta, su monito lo controla un bot. Ver `docs/ONLINE.md`.

### 2.12 Condición de victoria
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
  así no hay que buscarlo. Izquierda/derecha mueve; empujar hacia arriba
  también salta. Zona muerta del 32 % para que caminar sea estable.
- Cuatro botones bajo el pulgar derecho, en dos filas. Abajo los más usados:
  **👊 Golpe** (grande) y **✋ Agarrar / Aventar** (amarillo; levanta, avienta
  y toma barriles). Arriba **⬆️ Salto** (morado) y **💨 Pedo** (verde), que
  se ve apagado hasta que llevas un frijol y muestra cuántos tienes.
- Al elegir modo se pide pantalla completa y orientación horizontal. En
  vertical aparece un aviso de "gira tu teléfono".
- **2 jugadores en el mismo aparato:** la pantalla se parte en mitades. Cada
  jugador tiene su joystick en la esquina exterior y sus cuatro botones en
  una sola fila baja junto a él, para no tapar la azotea. Cómodo en tablet;
  en teléfono funciona pero queda apretado.
- Los controles son elementos HTML encima del canvas (`src/touch.js`), con
  `pointer events` y captura por dedo, para que dos o cuatro pulgares a la vez
  no se estorben.

### 3.2 Teclado y gamepad (escritorio)
| | Jugador 1 | Jugador 2 | Gamepad |
|---|---|---|---|
| Mover | A / D | ← / → | Stick izq. / D-pad |
| Saltar / volar (mantener) | W (o Espacio) | ↑ | A |
| Golpear | F (o J) | , (o O) | X |
| Agarrar / Aventar | G (o K) | . (o P) | B |
| Pedo | H (o L) | / (o I) | Y |

Menú con botones tocables; en teclado también `1`..`4`. `R` = revancha,
`Esc` = menú.

## 4. Dirección de arte

Referencias: avatares de animales estilo *flat* (contorno grueso, cabezas
redondas, ojitos de punto, cachetes rosas, fondos en círculo pastel) y una
torre cartoon morada y amarilla con azotea. El lienzo de diseño con las
láminas de personajes, expresiones, escenario y controles está en `design/`.

- **Monitos vectoriales, no sprites.** Se dibujan con trazos de canvas, así el
  cuerpo se puede deformar (squash & stretch al aterrizar, estirarse al saltar,
  temblar al recibir golpe) y la cara cambia de expresión por estado.
- **Ocho animales, un mismo cuerpo:** Mono, León, Zorro, Panda (jugadores) y
  Elefante, Jirafa, Pingüino, Búho (bots). Cambia la cabeza; el cuerpo de
  gelatina, brazos y pies son iguales. El color del cuerpo es el del animal.
- Estilo: contorno café oscuro `#3a2a25` de 4 px en todo (nunca negro puro),
  colores planos con una mancha clara como luz, panza crema `#f6dfbf`,
  cachetes rosas siempre. Ojos de punto con brillo; panda y búho con ojos grandes.
- **Caras por estado:** normal, feliz (caminando), enojado (golpeando),
  preocupado (saltando), "ouch" (aturdido), esfuerzo (cargando), cachetes
  inflados (pedo), gritando (volando o cayendo), KO (ojos en X, lengua fuera,
  pajaritos).
- **Escenario** según la referencia: piso alto morado `#9a63d6` con toldos
  grises, pisos amarillos `#f2c53d` con balcón de madera, barandal y bandera
  naranja en la azotea, aire acondicionado al fondo, árbol al lado, ciudad
  lavanda `#cbb9ea` y nubes redondas. El barandal va sólo al fondo: los
  bordes siguen libres para caer.
- HUD: avatar de cada animal en círculo pastel, vidas, KOs y frijoles guardados.
- Efectos: onomatopeyas (¡POW!, ¡ZAS!, ¡BOOM!), estrellas, polvo al aterrizar,
  anillo de explosión, tablas del barril volando, screen shake y flash.

### Pendiente de arte
- Animación de aterrizaje de reaparición (paracaídas o globo).
- Que el jugador elija su animal en el menú.
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
