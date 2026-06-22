# 🍉 Frutería El Mercadito — Control de Negocio

App de administración para **Frutería El Mercadito**, desarrollada por [Altavex](https://altavex.io).

---

## ¿Qué hace?

Control completo de negocio para una frutería:

- **Punto de venta** — cobra por kilo, pieza, manojo o cualquier unidad en 3 toques
- **Inventario** — valor en vivo, alertas de stock bajo y riesgo de merma
- **Compras** — registra entradas y recalcula el costo promedio ponderado automáticamente
- **Merma** — registra pérdidas con su costo real, ajusta el inventario
- **Caja** — apertura, corte, entradas y salidas con efectivo esperado
- **Clientes recurrentes** — registra clientes y envía tickets por WhatsApp
- **Inteligencia** — ganancia real, ticket promedio, top productos por margen, rotación
- **Historial** — consulta y edita tickets anteriores, anula ventas

---

## Tecnología

| Capa | Detalle |
|---|---|
| Frontend | HTML + CSS + Vanilla JS — un solo archivo `index.html` |
| Hosting | GitHub Pages / Netlify |
| Base de datos | Supabase (PostgreSQL + Auth + Realtime) |
| Modo offline | localStorage — funciona sin internet |
| Sincronización | Tiempo real via Supabase Realtime + smart-merge por `updated_at` |

---

## Estructura del repo

```
index.html          → App completa (único archivo)
supabase_schema.sql → Schema de base de datos (correr una vez en Supabase)
README.md           → Este archivo
.nojekyll           → Evita que GitHub Pages use Jekyll
```

---

## Setup (una sola vez)

1. Correr `supabase_schema.sql` en **Supabase → SQL Editor**
2. Habilitar **Authentication → Email**
3. Crear cuenta del dueño: **Authentication → Users → Add user**
4. Pegar `SUPABASE_URL` y `SUPABASE_ANON` en el bloque CONFIG de `index.html`
5. Publicar en GitHub Pages o Netlify

---

*Desarrollado por Altavex · Monterrey, México*
