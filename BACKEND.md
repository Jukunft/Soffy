# Soffy Backend — Handoff para Gonzorro

Documento de alcance y contrato. Leer junto a [SKILL.md](SKILL.md) (negocio) y [lib/api.js](lib/api.js) (contrato literal).

> **Versión actualizada 2026-04-25** — refleja cambios recientes: planes Free/Pro renovados, signup con país (no ciudad), 3 métodos de auth (Google/email/teléfono), endpoints nuevos `/offers/:id`, `/offers/boost`, `/offers/swipes (DELETE)`.

---

## TL;DR

1. El FE (Next.js 14) ya está operativo con un **mock API en el cliente** ([lib/api.js](lib/api.js)). Ese archivo es el **contrato literal**: shapes de request/response, nombres de campos, códigos de retorno.
2. Tu trabajo BE: reemplazar cada función mock por un endpoint HTTP real que devuelva el mismo shape.
3. Cuando despliegues, el FE se cutovers con **1 línea**:
   ```js
   SoffyAPI.BASE_URL = 'https://api.soffy.app/v1'
   ```
   Cada método ya tiene su rama `fetch()` lista.

---

## Stack esperado

- **Node.js + Express** (o Fastify si preferís)
- **Supabase** (Postgres + Auth + RLS) — hosted en la región LATAM más cercana
- **Scrapers**: worker separado (Node + Playwright o Puppeteer), cron de refresh
- Deploy: Railway / Fly / Render — lo que ya uses

---

## Endpoints v1 (prefix `/api/v1`)

Shapes exactos → [lib/api.js](lib/api.js). Resumen:

| Método | Path                        | Auth  | Body / Query                                | Response                                |
|--------|-----------------------------|-------|---------------------------------------------|-----------------------------------------|
| GET    | `/offers/deck`              | opt   | `?cat=all&limit=30` + filters + prefs       | `{ deck: Deal[], capped?, swipesToday? }` |
| GET    | `/offers/:id`               | opt   | —                                           | `{ deal: Deal }` (público, para `/deal/[id]` y OG) |
| GET    | `/offers/boost`             | req   | —                                           | `{ deal: Deal & { boosted: true } }` |
| POST   | `/offers/swipe`             | req   | `{ dealId, dir: 'left'\|'right' }`          | `{ ok, match: Match \| null }`          |
| POST   | `/offers/swipe/undo`        | req   | —                                           | `{ ok, undone }`                        |
| DELETE | `/offers/swipes`            | req   | —                                           | `{ ok }` ("Ver de nuevo" — borra historial swipes, mantiene matches) |
| GET    | `/user/matches`             | req   | —                                           | `{ matches: MatchWithDeal[] }`          |
| POST   | `/user/matches/:id/used`    | req   | —                                           | `{ ok }`                                |
| DELETE | `/user/matches/:id`         | req   | —                                           | `{ ok }`                                |
| GET    | `/user/profile`             | req   | —                                           | `{ profile }`                           |
| PATCH  | `/user/profile`             | req   | partial `{ prefs?, zone?, plan?, planBilling?, lang? }` | `{ profile }`                           |
| POST   | `/auth/signup`              | —     | `{ email?, phone?, password?, zone, method }` | `{ profile }`                           |

### Filtros opcionales en `/offers/deck`

```ts
?minDiscount=20         // % mínimo
?distance=1             // km máximo (number) o "online" (string) o null
?sort=affinity          // 'affinity' | 'ending' | 'discount'
?cat=food               // category id, 'all' o ausente para no filtrar
?limit=30
```

### Shapes clave

```ts
type Deal = {
  id: string;
  cat: string;                    // category id (food, fashion, tech, …)
  tastes: string[];               // taste ids (pizza, sneakers, audio, …)
  brand: string;
  title: { es: string; en: string };
  discount: string;               // "50%"
  oldPrice: string;               // "$480"  — pre-formateado para display
  newPrice: string;
  distance: number;               // km, 0 = online
  endsIn: string;                 // "4h" | "2d" — texto display
  match: number;                  // 0-100, score base del deal (catálogo)
  grad: [string, string];         // gradient fallback ["#ff6b1f","#e85a10"]
  affinity?: number;              // 0-100, score personalizado server-side
  boosted?: boolean;              // true cuando viene de /offers/boost
  isOnline?: boolean;             // true = online (cualquier país); false = local (solo país del user)
  source_url?: string;            // atribución (no se renderiza, transparencia legal)
}

type Match = {
  id: string;                     // ej. "m_d1_1728390000000" o UUID
  dealId: string;
  createdAt: number;              // ms epoch
  expiresAt: number;              // ms epoch — free: createdAt + 24h ; premium: null o lejos
  used: boolean;
  usedAt?: number;
  noTimer?: boolean;              // true si el plan del user al crearlo era premium
}

type MatchWithDeal = Match & {
  deal: Deal;
  msLeft: number;                 // expiresAt - now (0 si expiró). null si noTimer.
}

type Profile = {
  email: string | null;
  phone: string | null;           // ej. "+56912345678"
  zone: string;                   // ISO 3166-1 alpha-2 lowercase: "cl","mx","ar","co",…
  plan: 'free' | 'premium';
  planBilling?: 'month' | 'year';
  authMethod: 'google' | 'email' | 'phone';
  prefs: {
    cats: string[];
    tastes: string[];
    loc: string;
    budget: 'low' | 'med' | 'high';
  } | null;
  lang?: 'es' | 'en';
  createdAt: number;
}

type DeckResponse = {
  deck: Deal[];
  capped: boolean;
  cappedReason?: 'daily_cap';
  cap?: number | null;            // null = sin cap (premium)
  swipesToday?: number;
  resetsAt?: number;              // ms epoch (cuando se resetea el cap)
}
```

---

## Esquema Postgres (sugerido)

```sql
-- users: auth lo maneja Supabase Auth, esta tabla es el profile extendido
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  phone text unique,
  zone text not null default 'cl',                 -- ISO 3166-1 alpha-2 lowercase
  plan text not null default 'free' check (plan in ('free','premium')),
  plan_billing text check (plan_billing in ('month','year')),
  auth_method text check (auth_method in ('google','email','phone')),
  prefs jsonb,
  lang text default 'es',
  created_at timestamptz not null default now()
);

create table offers (
  id text primary key,                              -- "d1", "d2", … o UUID
  cat text not null,
  tastes text[] not null,
  brand text not null,
  title jsonb not null,                             -- { es, en }
  discount text not null,
  old_price text,
  new_price text,
  distance numeric,
  ends_in text,
  base_match int not null default 0,
  grad text[] not null,
  zone text not null,                               -- país de la oferta (gating gratuita)
  is_online boolean not null default false,         -- true = visible en todos los países (premium o no)
  source_url text not null,                         -- atribución (SKILL §6)
  verified_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on offers (cat, active, zone);
create index on offers (is_online, active);

create table matches (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  offer_id text not null references offers(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,                           -- nullable: premium = NULL (sin timer)
  no_timer boolean not null default false,
  used boolean not null default false,
  used_at timestamptz,
  unique (user_id, offer_id)
);
create index on matches (user_id, expires_at);
create index on matches (user_id, used);

create table swipes (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  offer_id text not null references offers(id) on delete cascade,
  dir text not null check (dir in ('left','right')),
  ts timestamptz not null default now()
);
create index on swipes (user_id, ts desc);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,                               -- 'soffy_pro'
  billing text not null check (billing in ('month','year')),
  active boolean not null default true,
  renewed_at timestamptz,
  expires_at timestamptz,
  stripe_subscription_id text                       -- futuro
);

-- Tablas de gamificación (planes mencionan "recompensas"):
create table rewards_events (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  type text not null,                               -- 'coupon_used' | 'shared_deal'
  match_id text references matches(id),
  points int not null,                              -- free: x1 ; premium: x2 (super recompensas)
  ts timestamptz not null default now()
);

create table rewards_balance (
  user_id uuid primary key references users(id) on delete cascade,
  total_points int not null default 0,
  updated_at timestamptz not null default now()
);
```

**RLS obligatoria** sobre `users`, `matches`, `swipes`, `subscriptions`, `rewards_*` — cada user solo ve lo suyo.

---

## Reglas de negocio actualizadas

### Planes (UI muestra)

**Free** ($0):
- Swipes diarios **limitados** (cap configurable, hoy mock = 20/día)
- Descuentos en tiendas/locales **del país** del user **+** descuentos online (de cualquier país)
- Match con **timer 24h**
- Recompensas por usar/compartir descuentos (x1)

**Pro** (Soffy Pro · $2.50/mes anual o $3.99/mes mensual):
- Swipes **ilimitados**
- Passport: **todo el mundo** (no gating geográfico)
- Match **sin timer** (`expires_at = NULL`, no expira)
- **Súper recompensas** (x2 puntos por evento)
- **Cero ads**

### Reglas en server

1. **TTL match**:
   - Si `user.plan = 'free'` → `expires_at = created_at + interval '24 hours'`, `no_timer = false`
   - Si `user.plan = 'premium'` → `expires_at = NULL`, `no_timer = true`. Job de purga ignora.

2. **Gating geográfico** (`/offers/deck`):
   - Si free → `WHERE offers.zone = user.zone OR offers.is_online = true`
   - Si premium → sin filtro de zone (toda LATAM/mundo)

3. **Cap diario**:
   - Free: contar swipes de últimas 24h. Si ≥ `FREE_DAILY_CAP` (mock=20) → retornar `{ deck: [], capped: true, cappedReason: 'daily_cap', cap, resetsAt }`
   - Premium: nunca capeado.

4. **Scoring de afinidad** (mock formula en `_affinityScore`, replicar en SQL o serverside):
   ```
   affinity = min(100, base_match * 0.5 + catBoost(40 si user.cats incluye d.cat) + tastesMatched * 15)
   ```

5. **Atribución legal**: cada `Deal` retornado debe llevar `source_url` (no se renderiza pero queda log).

6. **Intermediario directo (deep link al cupón)**: futuro endpoint `GET /offers/:id/coupon` (auth req) que devuelva `{ code, partnerUrl }`. Hoy el FE genera código mock client-side con `couponCode(deal)`.

7. **Recompensas**:
   - Cuando un match marca `used=true` (POST `/user/matches/:id/used`) → emitir evento `rewards_events` con type=`coupon_used`, points = (premium ? 2 : 1)
   - Cuando user comparte un deal (POST `/offers/:id/share`, futuro) → type=`shared_deal`, mismo factor
   - `rewards_balance.total_points += points`

---

## Auth

Usar Supabase Auth con 3 providers:

1. **Google OAuth** — `supabase.auth.signInWithOAuth({ provider: 'google' })`. FE hoy tiene mock account picker.
2. **Email + password** — `supabase.auth.signUp({ email, password })`.
3. **Phone + password** — `supabase.auth.signUp({ phone, password })` (puede requerir SMS gateway según plan Supabase).

`POST /auth/signup` recibe `{ email?, phone?, password?, zone, method }`:
- `method === 'google'` → email obligatorio (devuelto por OAuth), password ignorado, password se omite
- `method === 'email'`  → email + password obligatorios, validar password ≥ 6 chars
- `method === 'phone'`  → phone + password obligatorios, validar phone (regex E.164 o similar)

Crea row en `auth.users` (Supabase) y `public.users` (perfil extendido), devuelve `{ profile }` con session JWT en cookie/header.

Middleware Express valida JWT de Supabase en endpoints `req`.

---

## Países soportados (signup zone)

13 LATAM (lista en [lib/countries.js](lib/countries.js)):
- ar Argentina · bo Bolivia · br Brasil · cl Chile · co Colombia · cr Costa Rica · ec Ecuador · mx México · pa Panamá · pe Perú · py Paraguay · uy Uruguay · ve Venezuela

**Default:** `cl` (Chile). Free user solo ve offers donde `offers.zone = user.zone OR offers.is_online = true`.

---

## Motor de scraping

Worker separado. Fuentes inspiración: CouponDunia, UNiDAYS, RetailMeNot.

- Targets iniciales por país: cadenas locales (supermercados, retail, restaurantes) + e-commerce con cupones online (Falabella, Mercado Libre, Rappi, Cornershop, Cinépolis, etc.)
- Validación: solo insertar `offers` con `source_url` accesible y código/link confirmado (`verified_at` no-null).
- Refresh cron: 3-6 h. Ofertas expiradas → `active = false`.
- Anti-dupes: hash por `brand + title.es + discount + zone`.
- Marcar `is_online = true` para cupones que aplican en e-commerce sin restricción de país (ej. Steam, Booking online, etc.).

---

## Prioridad sugerida

1. Supabase setup + schema + RLS (1 día)
2. `/auth/signup` con 3 métodos + middleware JWT (1 día)
3. `/offers/deck` con gating zone + filtros + scoring + cap diario (1.5 días)
4. `/offers/:id`, `/offers/boost`, `/offers/swipe(s)` (½ día)
5. `/user/matches` + `markUsed` + `delete` con TTL conditional al plan (½ día)
6. `/user/profile` GET/PATCH (½ día)
7. Tabla `rewards_*` + lógica básica de puntos (½ día)
8. Seed de ~100 offers iniciales (Chile + México + online) (1-2 días scraping)
9. Deploy + darle a Jocebra la `BASE_URL` pública

Total estimado: **~1 semana MVP**.

---

## Cutover

Cuando tu API esté viva:

1. CORS habilitado para `soffy.vercel.app` y `localhost:3001`
2. Darle a Jocebra la URL base
3. Jocebra setea `NEXT_PUBLIC_API_BASE_URL` en Vercel + lee en [lib/api.js](lib/api.js)
4. `SoffyAPI.BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL`
5. Testeo paralelo: mock (localStorage vacío) vs real (DB). Shapes idénticos → ningún cambio de UI.

---

## Cambios desde la primera versión de este doc

| Cambio | Impacto |
|--------|---------|
| `zone` ahora es país (ISO alpha-2) en vez de city-code (`cl-scl` → `cl`) | Schema simplificado, dropdown UI con 13 países |
| Profile añade `phone`, `authMethod`, `lang`, `planBilling` | Nuevos campos en tabla users |
| Premium: `match.expires_at = NULL` (no timer) | Lógica condicional en TTL |
| Plan free: ofertas online globales + ofertas locales del país | Campo `offers.is_online` |
| Sistema de recompensas (puntos x1 free / x2 premium) | Nuevas tablas `rewards_*` |
| Endpoint nuevo `GET /offers/:id` (público, para deep links + OG cards) | Sin auth, paginación de cache CDN |
| Endpoint nuevo `GET /offers/boost` (mejor match cross-cat) | Lógica server-side |
| Endpoint nuevo `DELETE /offers/swipes` (reset historial) | Borra `swipes` del user, mantiene `matches` |
| Auth con 3 providers (Google/email/teléfono) | Supabase Auth con OAuth + magic link / SMS |

---

## Dudas frecuentes

- **¿Por qué `id` string y no UUID en offers?** Viene del scraping, hasheado del source. Si preferís UUID, mapealo server-side y no rompas el shape del response.
- **¿`endsIn` como texto?** El FE lo pinta crudo. Si preferís devolver `endsAt: timestamp` y que el FE formatee, avísale a Jocebra.
- **¿Quién calcula `msLeft` en matches?** Server al serializar. `msLeft = max(0, expires_at - now())`. Si `no_timer=true`, `msLeft = null`.
- **¿Qué pasa si un user free hace upgrade a premium después de matches activos?** Los matches existentes mantienen su `expires_at` original. Solo los **futuros** matches del premium tendrán `no_timer=true`. (Decisión de producto: confirmar si querés migrar los existentes.)
- **¿Qué pasa si un user hace swipe offline?** Hoy el mock acepta. Para real: `POST /offers/swipe` con `idempotency-key` en header; FE guarda cola si falla.
- **¿Cap diario aplica a swipes left + right o solo right?** Mock cuenta todos. Producto: confirmar si "swipe limitado" es solo likes o cualquier swipe.

---

## Contacto

Jocebra (FE) — dudas de shape, campos nuevos, CORS.
Contrato vive en [lib/api.js](lib/api.js) — si cambiás algo, coordinar ahí primero.
