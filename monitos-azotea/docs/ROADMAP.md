# Roadmap

## v0.1 — Prototipo jugable (hecho)
- [x] Reglas completas en `World` con pruebas (`npm test`, 19 casos).
- [x] Golpes, combo de 4, KO de 3 s con pajaritos.
- [x] Cargar / aventar desmayados; cancelación por golpe; zafarse al despertar.
- [x] Barriles: aviso, caída, explosión, KO por golpe en la cabeza, cargar y
      aventar, reacción en cadena.
- [x] Monitos vectoriales con animación procedural y caras por estado.
- [x] Escenario tipo boceto, efectos, HUD, menú, bot de prueba, gamepad básico.
- [x] Controles táctiles: joystick flotante + 4 botones (salto, golpe,
      agarrar, pedo); 2 jugadores en la misma pantalla; pantalla completa.
- [x] Frijoles que caen, se comen al pisarlos y cargan pedos que desmayan.
- [x] Arte según referencias: ocho animales con cabezas distintas, torre
      morada y amarilla, HUD con avatares. Lienzo de diseño en `design/`.
- [x] Elegir tu animal y tu nombre (se recuerdan en el teléfono).
- [x] Jet pack en paracaídas: mantener salto para volar, 1.4 s de gasolina,
      rescata a los aventados. Machacar golpe para despertar antes.
- [x] Mazo que cae del cielo: barrido por abajo que manda a volar a varios,
      se salta como cuerda, 3 usos. Palomas que aturden ligeramente.
- [x] Combo que baja de uno en uno en vez de reiniciarse.
- [x] Tamaño de pantalla robusto en iOS (teclado, barra), loop protegido
      contra errores, canal sin orden y aviso de señal en línea.
- [x] Resaltado "TÚ" sobre tu monito, animales únicos por sala y arreglo de
      los botones de invitados tras una revancha.

## v0.2 — Sensación (game feel)
- [ ] Ajustar números jugando con gente (`docs/LOGICA.md` §11).
- [ ] Hit-stop (congelar 2–3 frames al conectar el 4.º golpe).
- [ ] Animación de reaparición (paracaídas) y de "levantarse" tras KO.
- [ ] Arrastre de la víctima al aventarla (estela) y rebote en el pretil.
- [ ] Sonidos con Web Audio (sin assets externos).
- [ ] Vibración (`navigator.vibrate`) al golpear y al explotar, en Android.
- [ ] Probar el joystick con gente: tamaño de zona muerta y umbral de salto.
- [ ] Manifest PWA para instalar en el teléfono y jugar sin barra del navegador.

## v0.3 — Contenido
- [ ] 2 o 3 azoteas más: con desnivel, con tinaco que sirve de plataforma,
      con anuncio que se cae.
- [ ] Objetos extra: maceta (golpe fuerte), tanque de gas (explosión grande y
      rueda), paraguas (planear).
- [ ] Skins / accesorios seleccionables.
- [ ] Modos: tiempo límite, equipos 2v2, "rey de la azotea".

## v0.4 — En línea
- [x] Sala con código, hasta 8 jugadores, anfitrión autoritativo con fotos a
      20 Hz, invitados con interpolación, bots de relleno, revancha.
- [ ] Publicar en un hosting con https para que funcione fuera de local.
- [ ] Reconexión de un invitado que perdió la señal (hoy pasa a bot).
- [ ] Indicador de latencia y aviso cuando la conexión va mal.
- [ ] Transporte alterno por Supabase Realtime si el servidor público de
      PeerJS da problemas.

## Ideas sueltas
- Que el KO se pueda acortar aporreando botones (mash) y se alargue si te
  aventaron desde alto.
- Paloma que se roba un barril.
- Repetición en cámara lenta del último "¡ADIÓS!".
