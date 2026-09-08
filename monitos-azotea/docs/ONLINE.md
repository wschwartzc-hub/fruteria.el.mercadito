# Juego en línea

## Cómo se juega
1. Uno crea la sala ("Jugar en línea con amigos" → "Crear sala"). Recibe un
   código de 4 letras.
2. Los demás escriben el código y se unen. Cada quien elige su animal tocando
   el avatar. Caben **8 jugadores** (una especie por jugador); el anfitrión
   puede rellenar con bots.
3. El anfitrión presiona "Empezar". Al terminar, sólo el anfitrión pide
   revancha; los demás esperan.

Si alguien se desconecta a media partida, su monito pasa a ser bot y se le
marca "(se fue)". Si el anfitrión cierra, la sala termina para todos.

## Cómo funciona por dentro
- **Sin servidor propio.** Usa WebRTC con [PeerJS](https://peerjs.com): el
  servidor público de PeerJS sólo sirve para "presentar" a los jugadores;
  después los datos viajan directo entre los teléfonos. Para redes muy
  cerradas se incluyen servidores STUN de Google y TURN públicos de
  metered.ca.
- **El anfitrión manda.** Es el único que corre `World`. Los invitados
  mandan sus botones y reciben "fotos" del estado 20 veces por segundo
  (`SNAP_INTERVAL = 0.05`). Un invitado dibuja interpolando entre las dos
  últimas fotos (`Replica.interpolate`), así se ve fluido aunque lleguen
  con retraso; el monito cargado se pega a su cargador sin retraso.
- **Botones como contadores.** Un invitado no manda "presioné golpe" (se
  puede perder), manda contadores que sólo suben: `{l, r, j, p, g, f}`. El
  anfitrión convierte cada incremento en un flanco de un tick
  (`RemoteInputs.read`), así ningún toque se pierde ni se duplica.
- **Mensajes** (`src/net/session.js`):

  | De → a | `t` | Contenido |
  |---|---|---|
  | invitado → anfitrión | `hello` | nombre, especie |
  | invitado → anfitrión | `species` | cambio de animal en la sala |
  | invitado → anfitrión | `in` | contadores de botones |
  | anfitrión → invitado | `lobby` | lista de jugadores, tu lugar (`you`) |
  | anfitrión → invitado | `start` | lista final y tu lugar |
  | anfitrión → todos | `snap` | foto del mundo + eventos para efectos |
  | anfitrión → todos | `lobbyBack` | volver a la sala |
  | anfitrión → invitado | `kick` | sala llena o partida ya empezada |

- **Identidad de la sala:** el anfitrión se registra en PeerJS como
  `monitos-azotea-CODIGO`. El código usa letras y números sin
  ambigüedad (sin 0/O ni 1/I).

## Dónde está publicado
- Sitio en Netlify: **https://monitos-azotea.netlify.app** (proyecto
  `monitos-azotea`, id `36de83c4-0c51-4349-b136-fd8601f37eb3`).
- Se publica solo con el workflow `.github/workflows/deploy-monitos.yml`
  cuando cambia `monitos-azotea/` en `main` o en la rama del juego. Para que
  funcione hay que guardar en GitHub el secreto `NETLIFY_AUTH_TOKEN` (token
  personal de Netlify).
- A mano: en app.netlify.com → proyecto monitos-azotea → Deploys, arrastrar
  la carpeta `monitos-azotea/dist`. O "Link repository" con base directory
  `monitos-azotea` (el `netlify.toml` ya trae el comando y la carpeta).

## Requisitos
- El juego debe abrirse desde una **página publicada con https** (Netlify,
  GitHub Pages, cualquier hosting estático). La versión embebida como
  artifact de Claude no puede abrir conexiones de red, así que ahí el modo
  en línea muestra un error de conexión.
- Todos deben abrir la **misma versión** del juego (mismo archivo).

## Para usar tu propio PeerServer
Si el servidor público falla, se puede correr uno propio
(`npx peer --port 9000 --path /peerjs`) y apuntar el juego con:

```html
<script>window.MONITOS_PEER = { host: 'tu-servidor', port: 443, path: '/peerjs', secure: true };</script>
```

Con eso se probó el flujo completo en este repo (sala, 2 invitados + bot,
movimiento sincronizado, fin de partida y revancha).

## Alternativa: Supabase Realtime
`src/net/peer.js` es el único archivo que sabe de PeerJS. Cambiar a
Supabase Realtime (broadcast por canal `monitos:CODIGO`) es reemplazar
`HostNet` y `ClientNet` con la misma interfaz (`open/connect`, `send`,
`broadcast`, `onMessage`, `onJoin`, `onLeave`). Ventaja: pasa por un servidor
y funciona en cualquier red; desventaja: latencia mayor y cuota mensual.
