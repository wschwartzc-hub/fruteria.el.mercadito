# Vecinos360 · Plan de producto y técnico

> Estado: **propuesta para aprobación**. Nada de esto está construido todavía.
> Cuando se apruebe el plan y la dirección visual, se arranca la Fase 1.

---

## 1. Qué es

App para gestionar la vida diaria de un fraccionamiento residencial. Kolonus se queda
para lo que ya hace bien (acceso, visitas, caseta). Vecinos360 cubre lo que hoy pasa
por WhatsApp y se pierde: reportes, fallas de servicios, encuestas, avisos y la venta
de comida y artículos entre vecinos.

**Usuarios**

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| Residente | Cualquier vecino verificado | Reportar, votar, publicar en el mercadito, comentar, chatear |
| Comité / Admin | Mesa directiva o administrador | Todo lo anterior + verificar vecinos, publicar avisos, crear encuestas, moderar, cerrar reportes |
| Moderador (opcional) | Vecino de confianza | Moderar publicaciones y comentarios, sin acceso a verificación ni avisos oficiales |

Multi-fraccionamiento desde el día uno: cada dato lleva `fraccionamiento_id`, así se
puede ofrecer a otros fraccionamientos sin rehacer nada.

---

## 2. Registro con captura de Kolonus

Flujo propuesto (3 pantallas):

1. **Crear cuenta**: correo o teléfono + contraseña (Supabase Auth). También "Continuar con Google".
2. **Verifica que vives aquí**: el usuario sube la captura de *Mi Perfil* de Kolonus.
   La app le muestra un ejemplo de la captura correcta y qué debe verse (nombre y la
   línea *Extensión (visible por guardias)*, que es la casa, p. ej. `VENECIA 330`).
3. **Confirmar datos**: la app lee la imagen y pre-llena **nombre** y **calle + número**.
   El usuario corrige si algo salió mal y envía. Queda en estado *Pendiente*.

**Lectura de la captura**: una función en el servidor (Supabase Edge Function) manda la
imagen a un modelo de visión y recibe `{ nombre, calle, numero, fecha_nacimiento? }`.
Solo se conserva nombre y casa. Si la lectura falla, el usuario captura los datos a mano.

**Aprobación**: el comité ve una cola con la captura y los datos extraídos, y aprueba o
rechaza con un motivo. Hasta ser aprobado el usuario ve la app en modo lectura
(avisos públicos) y nada más.

**Anti-fraude**

- Una casa puede tener máximo N cuentas (configurable, sugerido 4).
- Si ya existe una cuenta aprobada en esa casa, se le notifica a esa cuenta que alguien más se registró.
- La captura se borra 30 días después de la decisión (privacidad). Solo se conserva nombre y casa.
- Alternativa sin captura: el comité puede generar un **código de invitación por casa**.

---

## 3. Módulos

### 3.1 Reportes de vecinos
- Categorías: seguridad, ruido, mascota perdida, objeto perdido, áreas comunes, alumbrado, basura, sugerencia.
- Fotos (hasta 4), calle, descripción, opción de anónimo ante los vecinos (el comité siempre ve quién).
- Estados: **Abierto → En atención → Resuelto** (solo el comité cambia estado).
- "A mí también me pasa" (+1) y comentarios.
- Filtros por calle y categoría. Historial y búsqueda.

### 3.2 Fallas de servicios (luz, agua, gas, internet, basura)
- Un toque: servicio + calle + desde cuándo. Sin fotos ni texto obligatorio.
- Se agrupan automáticamente: "**18 casas sin luz** en Venecia y Florencia desde las 14:20".
- Vista por calle (mini mapa del fraccionamiento como lista de calles con conteo).
- El comité registra el **folio** de CFE / Agua / Gas y marca *Restablecido*. Se avisa a quienes reportaron.
- Historial mensual: qué servicio falla más y en qué calles (útil para reclamar al proveedor).

### 3.3 Encuestas y votaciones
- Las crea el comité: pregunta, opciones, fecha de cierre, anónima o no.
- **Un voto por casa** (no por persona) para decisiones de asamblea; opción de "un voto por persona" para cosas informales.
- Resultados en vivo o al cierre; exportar a PDF/CSV para el acta.

### 3.4 Mercadito (venta entre vecinos)
- Publicar: fotos, título, precio, categoría (comida, artículos, servicios, gratis/regalo), entrega (recoger en casa / entrega a domicilio), disponibilidad (p. ej. "tamales solo sábados").
- **Chat 1 a 1** dentro de la app para acordar el trato (evita compartir teléfonos).
- Botón **Apartar**: crea un trato con estado *Apartado → Entregado → Calificado*. El vendedor puede aceptar o rechazar.
- Reputación: calificación y número de tratos completados por vecino.
- Reportar publicación; el moderador puede ocultarla.
- Pagos: **fuera de la app** en v1 (efectivo / transferencia). Sin comisiones ni procesamiento de pagos.
- Fase posterior: "pedidos" para comida con horario de entrega y varios artículos por pedido.

### 3.5 Avisos y calendario del comité
- Comunicados oficiales fijados arriba del muro, con acuse de lectura ("Leído por 143 casas").
- Calendario: juntas, fumigación, cortes programados, eventos.
- Documentos: reglamento, minutas, estado financiero (PDF).

### 3.6 Directorio recomendado
- Plomeros, electricistas, jardineros, etc. recomendados por vecinos, con calificación.

### 3.7 Perfil y notificaciones
- Perfil mínimo: nombre, casa, foto, teléfono opcional (visible solo si el usuario quiere).
- Push (PWA) por: falla en mi calle, aviso oficial, respuesta a mi reporte, mensaje en mercadito, encuesta nueva.
- Resumen diario opcional por correo.

### 3.8 Panel del comité
- Cola de verificación, moderación, métricas (reportes abiertos, fallas del mes, participación en encuestas), gestión de calles y casas del fraccionamiento.

### Ideas para después (Fase 3+)
- Cuotas de mantenimiento: estado de cuenta por casa y recordatorios.
- Reserva de áreas comunes (palapa, alberca, salón).
- Botón de pánico a caseta / vecinos cercanos.
- Integración con Kolonus si algún día exponen API.

---

## 4. Tecnología

Se reutiliza lo que ya funciona en Frutería El Mercadito: **Supabase + Netlify + PWA**.
La diferencia es que esta app es mucho más grande, así que no cabe en un solo `index.html`.

| Capa | Propuesta | Por qué |
|---|---|---|
| Frontend | **PWA** con Vite + Preact (o React) + TypeScript | Instalable en iOS/Android sin tiendas, push web, código en módulos mantenibles |
| Backend | **Supabase**: Postgres + Auth + Storage + Realtime + Edge Functions | Ya lo conocen; RLS por `fraccionamiento_id` y rol |
| Lectura de captura | Edge Function → modelo de visión (API de Claude) con salida JSON | Precisión alta con capturas de celular; Tesseract como respaldo sin costo |
| Push | Web Push (VAPID) + tabla `push_subscriptions` | Funciona en iOS 16.4+ cuando la PWA está instalada |
| Hosting | Netlify (o GitHub Pages) | Igual que hoy |
| Imágenes | Supabase Storage con redimensionado en cliente (máx. 1200 px) | Costo bajo, carga rápida |

Tiendas (App Store / Play): no en v1. Si se necesita, la misma PWA se empaqueta con Capacitor.

---

## 5. Modelo de datos (principal)

```
fraccionamientos(id, nombre, config)
calles(id, fraccionamiento_id, nombre)
casas(id, calle_id, numero)                         -- "VENECIA 330"
perfiles(id=auth.uid, fraccionamiento_id, casa_id, nombre, rol, estado_verificacion, telefono_visible)
verificaciones(id, perfil_id, captura_url, datos_extraidos, estado, motivo, revisado_por, expira_en)

reportes(id, autor_id, categoria, titulo, descripcion, calle_id, anonimo, estado, fotos[])
reporte_apoyos(reporte_id, perfil_id)               -- "a mí también"
comentarios(id, reporte_id | publicacion_id, autor_id, texto)

fallas(id, servicio, calle_id, casa_id, autor_id, desde, resuelto_en)
incidentes(id, servicio, inicio, fin, folio, calles[])   -- agrupación hecha por el comité

encuestas(id, pregunta, opciones[], cierra_en, anonima, un_voto_por_casa)
votos(encuesta_id, casa_id | perfil_id, opcion)

publicaciones(id, vendedor_id, titulo, precio, categoria, entrega, fotos[], estado)
tratos(id, publicacion_id, comprador_id, estado, calificacion)
chats(id, trato_id | publicacion_id, participantes[])
mensajes(id, chat_id, autor_id, texto, leido_en)

avisos(id, titulo, cuerpo, fijado, publicado_por)   + avisos_leidos
eventos(id, titulo, inicio, fin, lugar)
directorio(id, oficio, nombre, telefono, recomendado_por) + directorio_calificaciones
push_subscriptions(perfil_id, endpoint, keys)
```

RLS: todo filtrado por `fraccionamiento_id`; escritura de estado de reportes, avisos y
encuestas solo para rol `admin`; verificaciones visibles solo para el propio usuario y el comité.

---

## 6. Fases y entregables

| Fase | Contenido | Estimado |
|---|---|---|
| **0 · Diseño** | Elegir dirección visual, pantallas clave en alta fidelidad | 1 semana |
| **1 · MVP** | Registro con captura + verificación, reportes de vecinos, fallas de servicios, avisos, perfil, panel de comité básico | 3 a 4 semanas |
| **2 · Comunidad** | Mercadito con chat y tratos, encuestas con voto por casa, notificaciones push | 3 semanas |
| **3 · Extras** | Directorio, calendario y documentos, reputación, resumen por correo, métricas | 2 semanas |
| **4 · Después** | Cuotas, reservas, pánico, empaquetado para tiendas | según demanda |

Cada fase termina desplegada y probada con vecinos reales del fraccionamiento (beta cerrada).

---

## 7. Decisiones que necesito de ti

1. **Nombre y dominio**: ¿`vecinos360.app` / `.mx`? ¿Tienes logo o se diseña?
2. **Un fraccionamiento o varios**: se propone multi-fraccionamiento desde el inicio (poco costo extra).
3. **Quién aprueba** los registros: ¿comité, tú, o ambos?
4. **Voto por casa**: ¿confirmas que las encuestas "serias" son un voto por casa?
5. **Mercadito sin pagos** en v1: ¿de acuerdo con acordar y pagar fuera de la app?
6. **Anónimo en reportes**: ¿se permite anonimato frente a vecinos (el comité siempre ve el autor)?
7. **Stack**: ¿Preact/React con Vite, o prefieres seguir en vanilla JS como la frutería?
8. **Dirección visual**: elige una de las tres del lienzo de diseño (o mezcla).

---

## 8. Riesgos

- **Capturas falsas o editadas**: se mitiga con aprobación manual y límite por casa. No es infalible.
- **Cambios en la pantalla de Kolonus**: la extracción usa un modelo de visión, no coordenadas fijas, así que tolera cambios de diseño. Aun así, se mantiene captura manual como respaldo.
- **Push en iOS**: solo funciona con la PWA instalada en pantalla de inicio; hay que guiar al usuario.
- **Moderación**: el mercadito y los reportes necesitan al menos un moderador activo.
