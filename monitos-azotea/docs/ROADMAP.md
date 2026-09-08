# Roadmap

## v0.1 — Prototipo jugable (hecho)
- [x] Reglas completas en `World` con pruebas (`npm test`, 19 casos).
- [x] Golpes, combo de 4, KO de 3 s con pajaritos.
- [x] Cargar / aventar desmayados; cancelación por golpe; zafarse al despertar.
- [x] Barriles: aviso, caída, explosión, KO por golpe en la cabeza, cargar y
      aventar, reacción en cadena.
- [x] Monitos vectoriales con animación procedural y caras por estado.
- [x] Escenario tipo boceto, efectos, HUD, menú, bot de prueba, gamepad básico.

## v0.2 — Sensación (game feel)
- [ ] Ajustar números jugando con gente (`docs/LOGICA.md` §11).
- [ ] Hit-stop (congelar 2–3 frames al conectar el 4.º golpe).
- [ ] Animación de reaparición (paracaídas) y de "levantarse" tras KO.
- [ ] Arrastre de la víctima al aventarla (estela) y rebote en el pretil.
- [ ] Sonidos con Web Audio (sin assets externos).
- [ ] Controles táctiles en pantalla para jugar en celular (2 jugadores, mitad y mitad).

## v0.3 — Contenido
- [ ] 2 o 3 azoteas más: con desnivel, con tinaco que sirve de plataforma,
      con anuncio que se cae.
- [ ] Objetos extra: maceta (golpe fuerte), tanque de gas (explosión grande y
      rueda), paraguas (planear).
- [ ] Skins / accesorios seleccionables.
- [ ] Modos: tiempo límite, equipos 2v2, "rey de la azotea".

## v0.4 — En línea (opcional)
- [ ] Como `World` es determinista y sin DOM, se puede correr en servidor.
      Plan: WebSocket + inputs con marca de tick (lockstep) o servidor
      autoritativo enviando snapshots. Supabase Realtime sirve para lobby;
      para el juego en sí hace falta un servidor pequeño (Node) por latencia.

## Ideas sueltas
- Que el KO se pueda acortar aporreando botones (mash) y se alargue si te
  aventaron desde alto.
- Paloma que se roba un barril.
- Repetición en cámara lenta del último "¡ADIÓS!".
