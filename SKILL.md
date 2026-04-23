---
name: soffy-project
description: Soffy — plataforma LATAM de descubrimiento de descuentos con UI de swipe (Tinder-style), matches con timer 24h, freemium + LATAM Pass. Stack Vercel/Next + Node/Express + Supabase. Usar cuando se trabaje en frontend (Jocebra), backend (Gonzorro), scraping, algoritmo de afinidad o contrato de API de Soffy.
type: project
---

# Soffy — Swipe-for-less LATAM

## 1. Visión
Plataforma IA de descubrimiento de descuentos con interfaz swipe estilo Tinder. Intermediario directo: usuario "matchea" ofertas curadas vía scraping. Ahorro lúdico + retención por ventanas de urgencia.

## 2. Roles & Stack
- **Jocebra (FE)**: UI/UX en Vercel. Componentes Claude Design, gestos swipe, estado cliente. Comando de Claude Design define diseño base (pegar cuando se solicite).
- **Gonzorro (BE)**: API Node.js/Express + Supabase (DB/auth). Motor scraping + algoritmo afinidad.

## 3. Modelo de Negocio

### Free
- Cap diario de swipes/likes (Hinge/Tinder style)
- Gating geográfico: solo zona de registro (ej. Chile)
- Ads no agresivos entre mazo

### Premium — LATAM Pass
- Matches ilimitados
- Passport: match con descuentos de toda LATAM
- Sin ads

## 4. Lógica Match & Algoritmo
- **Afinidad**: IA prioriza por categorías elegidas + historial
- **Expiración Bumble-style**: match dura 24h. Si no guarda/usa cupón → desaparece
- **Intermediario directo**: WebViews / deep links para usar código sin salir de Soffy (mantener métrica retención)

## 5. Contrato de API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET    | `/api/v1/offers/deck`   | Mazo de ofertas según perfil + IA |
| POST   | `/api/v1/offers/swipe`  | Registra Like/Pass. Like inicia timer 24h |
| GET    | `/api/v1/user/matches`  | Matches activos con tiempo restante |
| GET    | `/api/v1/user/profile`  | Suscripción, zona, preferencias |
| POST   | `/api/v1/auth/signup`   | Registro con validación de zona |

## 6. Scraping & Curaduría
Inspiración: CouponDunia, UNiDAYS.
- **Verificación**: solo ofertas con código confirmado o link directo
- **Atribución**: mantener fuente del descuento (transparencia legal)

## 7. Instrucciones por Rol

### Jocebra (FE)
- Leer diseño Claude Design al iniciar
- Vincular gestos swipe a `/api/v1/offers/swipe`
- Tailwind para estados del timer 24h
- Mobile-first

### Gonzorro (BE)
- Schema PostgreSQL en Supabase: `users`, `offers`, `matches`, `subscriptions`
- Middleware: verificar zona geográfica si user no es Premium
- Motor de scraping con verificación + atribución

## 8. Tablas mínimas Supabase
- `users` (id, email, zona, plan, categorías preferidas)
- `offers` (id, título, código/link, categoría, zona, fuente, verificada)
- `matches` (id, user_id, offer_id, created_at, expires_at, used)
- `subscriptions` (id, user_id, tipo, activa, renovación)

## 9. Activos
- `soffy.logo.png`, `soffy_brand.png` en raíz del proyecto

## 10. Handoff Backend
Ver [BACKEND.md](BACKEND.md) — contrato API, schema Postgres, reglas de negocio, prioridad y plan de cutover para Gonzorro. El contrato literal (shapes de request/response) vive en [lib/api.js](lib/api.js).
