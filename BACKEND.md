# Soffy Backend — Handoff para Gonzorro

Documento de alcance y contrato. Leer junto a [SKILL.md](SKILL.md) (negocio) y [lib/api.js](lib/api.js) (contrato).

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
| GET    | `/offers/deck`              | opt   | `?cat=all&limit=30` + prefs del usuario     | `{ deck: Deal[] }`                      |
| POST   | `/offers/swipe`             | req   | `{ dealId, dir: 'left'\|'right' }`          | `{ ok, match: Match \| null }`          |
| POST   | `/offers/swipe/undo`        | req   | —                                           | `{ ok, undone }`                        |
| GET    | `/user/matches`             | req   | —                                           | `{ matches: MatchWithDeal[] }`          |
| POST   | `/user/matches/:id/used`    | req   | —                                           | `{ ok }`                                |
| DELETE | `/user/matches/:id`         | req   | —                                           | `{ ok }`                                |
| GET    | `/user/profile`             | req   | —                                           | `{ profile }`                           |
| PATCH  | `/user/profile`             | req   | partial `{ prefs?, zone?, plan? }`          | `{ profile }`                           |
| POST   | `/auth/signup`              | —     | `{ email, zone }`                           | `{ profile }`                           |

### Shapes clave

```ts
// Deal — el FE usa estos campos tal cual
type Deal = {
  id: string;
  cat: string;                    // category id (food, fashion, tech, …)
  tastes: string[];               // taste ids (pizza, sneakers, audio, …)
  brand: string;
  title: { es: string; en: string };
  discount: string;               // "50%"
  oldPrice: string;               // "$480"  — pre-formateado para display
  newPrice: string;
  distance: number;               // km, 0 si es online
  endsIn: string;                 // "4h" | "2d" | "10d" — texto display
  match: number;                  // 0-100, score base del deal
  grad: [string, string];         // gradient fallback del card ["#ff6b1f","#e85a10"]
  affinity?: number;              // 0-100, score personalizado (lo calculás vos)
}

type Match = {
  id: string;                     // ej. "m_d1_1728390000000"
  dealId: string;
  createdAt: number;              // ms epoch
  expiresAt: number;              // ms epoch, createdAt + 24h (TTL Bumble-style)
  used: boolean;
  usedAt?: number;
}

type MatchWithDeal = Match & {
  deal: Deal;
  msLeft: number;                 // expiresAt - now, o 0
}

type Profile = {
  email: string | null;
  zone: string;                   // ISO-like: "cl-scl", "mx-cdmx", "ar-bue"
  plan: 'free' | 'premium';
  prefs: {
    cats: string[];
    tastes: string[];
    loc: string;
    budget: 'low' | 'med' | 'high';
  } | null;
  createdAt: number;
}
```

---

## Esquema Postgres (sugerido)

```sql
-- users: auth lo maneja Supabase Auth, esta tabla es el profile extendido
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  zone text not null default 'cl-scl',
  plan text not null default 'free' check (plan in ('free','premium')),
  prefs jsonb,
  created_at timestamptz not null default now()
);

create table offers (
  id text primary key,              -- "d1", "d2", …  o UUID
  cat text not null,
  tastes text[] not null,
  brand text not null,
  title jsonb not null,             -- { es, en }
  discount text not null,
  old_price text,
  new_price text,
  distance numeric,
  ends_in text,
  base_match int not null default 0,
  grad text[] not null,             -- [start, end]
  zone text not null,               -- para gating geográfico
  source_url text not null,         -- atribución (SKILL §6)
  verified_at timestamptz,          -- null = no verificado
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on offers (cat, active, zone);

create table matches (
  id text primary key,              -- generado server-side
  user_id uuid not null references users(id) on delete cascade,
  offer_id text not null references offers(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,  -- created_at + interval '24 hours'
  used boolean not null default false,
  used_at timestamptz,
  unique (user_id, offer_id)        -- no duplicar matches activos
);
create index on matches (user_id, expires_at);

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
  type text not null,               -- 'latam_pass'
  active boolean not null default true,
  renewed_at timestamptz,
  expires_at timestamptz
);
```

**RLS obligatoria** sobre `users`, `matches`, `swipes`, `subscriptions` — cada user solo ve lo suyo.

---

## Reglas de negocio (del SKILL.md)

1. **TTL 24h** — `matches.expires_at = created_at + 24h`. Cron o query filter que oculte expirados.
2. **Gating geográfico** — si `user.plan = 'free'`, `/offers/deck` filtra `offers.zone = user.zone`. Si `plan = 'premium'` (LATAM Pass), devuelve toda LATAM.
3. **Cap diario free** — contar swipes de las últimas 24h. Si `plan = free` y cuenta ≥ 50 (ajustable), retornar deck vacío + flag `{ capped: true }`.
4. **Scoring de afinidad** — no hardcodeado en el deal. Formula sugerida (ya la tiene el mock en `_affinityScore`):
   ```
   affinity = min(100, base_match * 0.5 + catBoost(40) + tastesMatched * 15)
   ```
5. **Atribución** — cada `Deal` debe llevar `source_url` para transparencia legal (SKILL §6).
6. **Intermediario directo** — cuando el FE golpee `/offers/:id/coupon` (endpoint futuro), devolver deep link o WebView URL + código copiable. No redirigir al partner hasta que el user haya hecho click explícito.

---

## Motor de scraping

Worker separado. Fuentes inspiración: CouponDunia, UNiDAYS, RetailMeNot.

- Targets iniciales Chile: Cornershop, Uber Eats, Rappi, Falabella, Paris, Ripley, Jumbo, Cinépolis, VivoCorp.
- Validación: solo insertar `offers` con `source_url` accesible y código/link confirmado (`verified_at` no-null).
- Refresh cron: 3-6 h. Ofertas expiradas → `active = false`.
- Anti-dupes: hash por `brand + title.es + discount`.

---

## Auth

Usar Supabase Auth (email magic link o Google OAuth). El FE hoy mockea con `signup({ email, zone })` → issue un `session.token`. En real:

- `POST /auth/signup` → crea row en `auth.users` y `public.users`, devuelve `{ profile, session }`.
- Middleware Express valida JWT de Supabase en endpoints `req`.

---

## Prioridad sugerida

1. Supabase setup + schema + RLS (1 día)
2. `/auth/signup` + middleware JWT (½ día)
3. `/offers/deck` con gating zona + scoring + filtro swipes (1 día)
4. `/offers/swipe` + `/offers/swipe/undo` + crear `matches` con TTL (½ día)
5. `/user/matches` + `markUsed` + `delete` (½ día)
6. `/user/profile` GET/PATCH (½ día)
7. Seed de ~100 offers reales para Chile (1-2 días scraping)
8. Deploy + darle a Jocebra la `BASE_URL` pública

Total estimado: ~1 semana MVP.

---

## Cutover

Cuando tu API esté viva:

1. CORS habilitado para `soffy.vercel.app` y `localhost:3001`
2. Darle a Jocebra la URL base
3. Jocebra setea `NEXT_PUBLIC_API_BASE_URL` en Vercel + lee en [lib/api.js](lib/api.js)
4. `SoffyAPI.BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL`
5. Testeo paralelo: mock (localStorage vacío) vs real (DB). Shapes idénticos → ningún cambio de UI.

---

## Dudas frecuentes

- **¿Por qué `id` string y no UUID en offers?** Viene del scraping, hasheado del source. Si preferís UUID, mapearlo server-side y no romper el shape del response.
- **¿`endsIn` como texto?** El FE lo pinta crudo. Si prefieres devolver `endsAt: timestamp` y que el FE formatee, avísale a Jocebra — cambio chico pero coordinado.
- **¿Quién calcula `msLeft` en matches?** Server al serializar. `msLeft = max(0, expires_at - now())`.
- **¿Qué pasa si el user hace swipe offline?** Hoy el mock acepta. Para real: `POST /offers/swipe` con `idempotency-key` en header; FE guarda cola si falla.

---

## Contacto

Jocebra (FE) — dudas de shape, campos nuevos, CORS.
Contrato vive en [lib/api.js](lib/api.js) — si cambiás algo, coordinar ahí primero.
