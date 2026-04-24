# CLAUDE.md — contexto compartido del proyecto

Claude Code auto-carga este archivo al abrir el repo. Acá vive lo que cualquier agente (y cualquier dev) debería saber antes de tocar código. Para el detalle de negocio ver [SKILL.md](SKILL.md); para el handoff del backend ver [BACKEND.md](BACKEND.md).

---

## Resumen

**Soffy — Swipe to save.** Plataforma LATAM de descubrimiento de descuentos con UI de swipe estilo Tinder. Intermediario directo: usuario matchea ofertas curadas vía scraping, con timer de 24h (Bumble-style). Monetización freemium + LATAM Pass (passport regional + swipes ilimitados + sin ads).

## Roles (fijos)

- **Jocebra** → Frontend. Next.js 14 (App Router, JS) en Vercel. Gestos swipe, onboarding, feed, matches, auth, profile, paywall, landing SSR.
- **Gonzorro** → Backend. Node.js/Express + Supabase (Postgres + Auth + RLS). Scraping, scoring de afinidad, middleware de zona.

> Al asignar tareas: si mencionan swipe/UI/route/componente → contexto Jocebra. Si mencionan DB/endpoint/scraping/auth/zone gating → contexto Gonzorro.

## Stack actual

- Next.js 14.2 (App Router) · React 18 · CSS modules globales (`app/globals.css`)
- Vercel (prod): https://soffy.vercel.app · deploy automático en push a `main`
- Repo: https://github.com/Jukunft/Soffy
- Backend (futuro): Node/Express + Supabase — ver [BACKEND.md](BACKEND.md)

## Estructura

```
app/
  layout.jsx          metadata, viewport, globals.css
  page.jsx            landing SSR (/)
  app/page.jsx        app shell client (/app): welcome → auth → onboarding → feed ⇄ matches ⇄ profile ⇄ paywall
  globals.css
components/
  Icon.jsx            lucide-like inline SVG set
  WelcomeScreen.jsx   AuthScreen.jsx   OnboardingFlow.jsx
  FeedScreen.jsx      (+ SwipeCard, EmptyDeck, MatchOverlay, CapHit, DeckSkeleton)
  FilterDrawer.jsx    MatchesScreen.jsx  ProfileScreen.jsx  PaywallScreen.jsx
lib/
  api.js              SoffyAPI mock — contrato literal con el backend (BASE_URL=null = localStorage)
  data.js             DEALS, CATEGORIES, TASTES (reemplazar por fetch cuando BE publique)
  i18n.js             I18N es/en + useT
public/assets/        soffy-logo.png, soffy-brand.png (RGBA transparente)
legacy/               prototipo HTML/CSS/JS pre-Next (referencia, no tocar)
```

## Contrato API

La fuente de verdad es [lib/api.js](lib/api.js). Shapes de request/response están en código, no en docs. Gonzorro replica esas funciones como endpoints HTTP; cuando publique:

```js
// lib/api.js → primera línea del export
SoffyAPI.BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // e.g. https://api.soffy.app/v1
```

Cada método tiene su rama `_http(...)` lista. Cero cambios de UI al cutover.

**Endpoints v1:** `/offers/deck`, `/offers/swipe`, `/offers/swipe/undo`, `/offers/swipes (DELETE)`, `/offers/boost`, `/user/matches`, `/user/matches/:id/used (POST)`, `/user/matches/:id (DELETE)`, `/user/profile`, `/auth/signup`.

## Reglas de negocio

- **Match TTL**: 24h exactas. `expiresAt = createdAt + 86400000`. Expirados se purgan al leer.
- **Cap diario free**: 20 swipes/día. Al tope, `/offers/deck` retorna `{ capped: true }` → FE muestra CapHit + CTA al paywall.
- **Gating geográfico**: free ve solo su zona; premium ve toda LATAM (passport). BE filtra por `offers.zone = user.zone` si plan=free.
- **Scoring afinidad**: `min(100, base_match*0.5 + catBoost(40) + tastesMatched*15)`. Mock en `_affinityScore`.

## Convenciones firmes

### Branding: logo SIEMPRE con fondo transparente
PNG RGBA o SVG, nunca fondo blanco/sólido. La app tiene bg oscuro (`--bg: #16294a`) y gradients — cualquier asset con background plano rompe el layout. Verificar modo RGBA antes de commitear en `public/assets/` o `assets/`. Vale para favicon, apple-touch-icon, imagen OG, mockups.

### i18n bilingüe ES/EN
Todo string visible pasa por `useT(lang)`. Agregar clave a **ambos** idiomas en `lib/i18n.js` o el build muestra el key crudo.

### Tono caveman
Default del repo: sin preámbulos, tool-first, respuestas cortas. Cualquier agente que trabaje acá debería responder tirando a terse. Para explicaciones largas, el usuario lo pide explícito.

### Safe-area + mobile-first
Topbars y action bar usan `max(X, env(safe-area-inset-*))` — iPhone con notch y home indicator ya respetados. Mantener el patrón al agregar pantallas nuevas.

### No tocar `legacy/`
Es el prototipo HTML/CSS/JS pre-migración. Sirve como referencia histórica. Cualquier cambio de UI va en `app/` y `components/`.

## Desarrollo

```bash
npm install
npm run dev    # → http://localhost:3001 (0.0.0.0 para cel en LAN)
npm run build  # verificación pre-deploy
```

Deploy: `git push` a `main` (Vercel toma el hook). Para forzar redeploy: `npx vercel --prod`.

## Testing en cel

- LAN misma WiFi: http://<LAN-IP>:3001
- Red externa (compartir con otro dev): `cloudflared tunnel --url http://localhost:3001`
- Prod siempre: https://soffy.vercel.app
