# Soffy

**Swipe to save.** Plataforma LATAM de descubrimiento de descuentos con UI estilo Tinder. Matchea ofertas curadas, ahorra antes de las 24h.

🚀 **Demo:** https://soffy.vercel.app
📦 **Repo:** https://github.com/Jukunft/Soffy

---

## Quick start

```bash
git clone https://github.com/Jukunft/Soffy.git
cd Soffy
npm install
npm run dev
```

→ http://localhost:3001

## Stack

- **Next.js 14** (App Router, JS) · React 18
- **CSS** global modular (sin Tailwind — var-based custom palette)
- **Vercel** deploy (automático en push a `main`)
- **Supabase** + **Node/Express** backend — ver [BACKEND.md](BACKEND.md)

## Arquitectura

```
┌─────────────────────────────┐
│  /  (landing SSR)           │ ← marketing, SEO, OG
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  /app  (client shell)       │
│  ┌───────────────────────┐  │
│  │ welcome  →  auth      │  │
│  │    ↓                   │  │
│  │ onboarding (4 steps)  │  │
│  │    ↓                   │  │
│  │ feed ⇄ matches        │  │
│  │      ⇄ profile        │  │
│  │      ⇄ paywall        │  │
│  └───────────────────────┘  │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  lib/api.js  (SoffyAPI)     │ ← mock hoy · HTTP real mañana
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Backend (Gonzorro)         │
│  Node/Express + Supabase    │
└─────────────────────────────┘
```

## Estructura

```
app/
  layout.jsx          metadata + globals.css
  page.jsx            landing SSR (/)
  app/page.jsx        shell del app (/app)
  globals.css
components/           WelcomeScreen, AuthScreen, OnboardingFlow,
                      FeedScreen, MatchesScreen, ProfileScreen,
                      PaywallScreen, FilterDrawer, Icon
lib/
  api.js              contrato SoffyAPI (mock + rama fetch)
  data.js             DEALS · CATEGORIES · TASTES
  i18n.js             ES/EN
public/assets/        logo RGBA transparente
legacy/               prototipo pre-Next (referencia histórica)
```

## Roles

- **Jocebra** → Frontend (Next.js, Vercel)
- **Gonzorro** → Backend (Node, Supabase, scraping)

## Scripts

| Script          | Qué hace                              |
|-----------------|---------------------------------------|
| `npm run dev`   | Dev server en `0.0.0.0:3001` (LAN-ready) |
| `npm run build` | Build de producción                   |
| `npm start`     | Servir build local                    |
| `npm run lint`  | ESLint                                |
| `npx vercel`    | Deploy preview                        |

## Docs clave

- **[CLAUDE.md](CLAUDE.md)** — contexto compartido para Claude Code (auto-cargado en toda sesión del repo)
- **[SKILL.md](SKILL.md)** — visión de producto, modelo de negocio, reglas
- **[BACKEND.md](BACKEND.md)** — handoff técnico completo para Gonzorro (endpoints, schema, prioridad)
- **[lib/api.js](lib/api.js)** — contrato literal v1 (shapes en código)

## Dev workflow

**Antes de empezar el día:**
```bash
git pull
```

**Al terminar:**
```bash
git add <archivos>
git commit -m "feat/fix/docs: descripción"
git push
```

Vercel detecta el push a `main` y redeploya automáticamente.

**Para agregar reglas al contexto del equipo** (algo que aprendamos y valga para todos):
```bash
# decile a Claude: "agregá a CLAUDE.md: [regla]"
git add CLAUDE.md
git commit -m "docs: regla X"
git push
```

## Estado actual

✅ Landing SSR + OG tags
✅ Onboarding 4 steps + i18n ES/EN
✅ Feed con swipe gestures + drag + stamps
✅ Matches con countdown 24h (urgent / critical states)
✅ Auth skeleton (signup + login flows)
✅ Profile + LATAM Pass paywall
✅ Filtros (discount · distancia · sort) + Boost action
✅ Mobile polish (safe-area, haptics, keyboard shortcuts)
✅ API mock SSR-safe con localStorage persistence
✅ Deploy en Vercel

⏳ Deep links + share API
⏳ PWA manifest (installable)
⏳ Analytics stub (PostHog/Plausible)
⏳ Profile inline edit
⏳ Backend v1 (Gonzorro)

## License

Proprietary. Todos los derechos reservados © 2026.

<!-- ci-test: 2026-04-24 -->

