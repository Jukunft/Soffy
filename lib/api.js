// Soffy API client — contrato v1 del SKILL.md
// Modo mock por default (BASE_URL = null) sobre localStorage + DEALS.
// Swap a backend real: set SoffyAPI.BASE_URL = 'https://api.soffy.app/api/v1'

import { DEALS } from '@/lib/data';

const LS = {
  swipes:   'soffy_api_swipes',
  matches:  'soffy_api_matches',
  profile:  'soffy_api_profile',
  session:  'soffy_api_session',
};

const MATCH_TTL_MS = 24 * 60 * 60 * 1000;
const NET_DELAY_MS = 120;
const FREE_DAILY_SWIPE_CAP = 20; // BE: reflejar en /offers/deck del backend

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const now = () => Date.now();

const isClient = () => typeof window !== 'undefined';
const read = (k, fb) => {
  if (!isClient()) return fb;
  try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; }
};
const write = (k, v) => {
  if (!isClient()) return;
  localStorage.setItem(k, JSON.stringify(v));
};

function _dealById(id) {
  return DEALS.find(d => d.id === id) || null;
}
function _purgeExpiredMatches(matches) {
  const t = now();
  return matches.filter(m => m.expiresAt > t && !m.deleted);
}
function _affinityScore(deal, prefs) {
  if (!prefs) return deal.match || 0;
  const catBoost   = prefs.cats?.includes(deal.cat) ? 40 : 0;
  const tasteBoost = deal.tastes.filter(t => prefs.tastes?.includes(t)).length * 15;
  const base       = deal.match || 0;
  return Math.min(100, base * 0.5 + catBoost + tasteBoost);
}

async function _http(path, opts = {}) {
  const url = SoffyAPI.BASE_URL + path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`[api] ${res.status} ${path}`);
  return res.json();
}

export const SoffyAPI = {
  BASE_URL: null,

  async getDeck({ prefs, cat = 'all', limit = 30, filters = null } = {}) {
    if (SoffyAPI.BASE_URL) {
      const q = new URLSearchParams({ cat, limit, ...(filters || {}) });
      return _http(`/offers/deck?${q}`);
    }
    await delay(NET_DELAY_MS);
    const profile = read(LS.profile, null);
    const isPremium = profile?.plan === 'premium';

    // Cap diario free (SKILL §3)
    const since = now() - MATCH_TTL_MS;
    const swipesToday = read(LS.swipes, []).filter(s => s.ts >= since).length;
    if (!isPremium && swipesToday >= FREE_DAILY_SWIPE_CAP) {
      return {
        deck: [],
        capped: true,
        cappedReason: 'daily_cap',
        cap: FREE_DAILY_SWIPE_CAP,
        resetsAt: since + MATCH_TTL_MS + MATCH_TTL_MS, // aprox 24h desde hoy
      };
    }

    const swiped = new Set(read(LS.swipes, []).map(s => s.dealId));
    let deals = DEALS.filter(d => !swiped.has(d.id));
    if (prefs) {
      deals = deals.filter(d =>
        prefs.cats?.includes(d.cat) &&
        d.tastes.some(t => prefs.tastes?.includes(t))
      );
    }
    if (cat && cat !== 'all') deals = deals.filter(d => d.cat === cat);

    // filtros opcionales del drawer
    if (filters) {
      if (filters.minDiscount > 0) {
        deals = deals.filter(d => parseInt(d.discount, 10) >= filters.minDiscount);
      }
      if (filters.distance === 'online') {
        deals = deals.filter(d => d.distance === 0);
      } else if (typeof filters.distance === 'number' && filters.distance > 0) {
        deals = deals.filter(d => d.distance <= filters.distance);
      }
    }

    deals = deals.map(d => ({ ...d, affinity: Math.round(_affinityScore(d, prefs)) }));

    const sort = filters?.sort || 'affinity';
    const endsInMs = (s) => {
      const n = parseInt(s, 10) || 0;
      if (/h/.test(s)) return n * 3600e3;
      if (/d/.test(s)) return n * 86400e3;
      if (/m/.test(s)) return n * 60e3;
      return 0;
    };
    if (sort === 'ending')   deals.sort((a, b) => endsInMs(a.endsIn) - endsInMs(b.endsIn));
    else if (sort === 'discount') deals.sort((a, b) => parseInt(b.discount, 10) - parseInt(a.discount, 10));
    else                     deals.sort((a, b) => b.affinity - a.affinity);

    deals = deals.slice(0, limit);
    return { deck: deals, capped: false, swipesToday, cap: isPremium ? null : FREE_DAILY_SWIPE_CAP };
  },

  /** GET /offers/:id — detalle público de una oferta (para share / deep link) */
  async getDeal({ id }) {
    if (SoffyAPI.BASE_URL) return _http(`/offers/${encodeURIComponent(id)}`);
    // mock: no delay ni localStorage — sirve para SSR
    return { deal: _dealById(id) };
  },

  /** GET /offers/boost — devuelve la mejor oferta cross-categoría (ignora cat filter) */
  async getBoost({ prefs } = {}) {
    if (SoffyAPI.BASE_URL) return _http('/offers/boost');
    await delay(NET_DELAY_MS);
    const swiped = new Set(read(LS.swipes, []).map(s => s.dealId));
    const candidates = DEALS.filter(d =>
      !swiped.has(d.id) &&
      (prefs ? prefs.cats?.includes(d.cat) : true)
    ).map(d => ({ ...d, affinity: Math.round(_affinityScore(d, prefs)), boosted: true }));
    candidates.sort((a, b) => b.affinity - a.affinity);
    return { deal: candidates[0] || null };
  },

  async postSwipe({ dealId, dir }) {
    if (SoffyAPI.BASE_URL) {
      return _http('/offers/swipe', { method: 'POST', body: { dealId, dir } });
    }
    await delay(NET_DELAY_MS);
    const deal = _dealById(dealId);
    if (!deal) throw new Error(`[api] deal not found: ${dealId}`);

    const swipes = read(LS.swipes, []);
    swipes.push({ dealId, dir, ts: now() });
    write(LS.swipes, swipes);

    let match = null;
    if (dir === 'right') {
      const matches = _purgeExpiredMatches(read(LS.matches, []));
      if (!matches.some(m => m.dealId === dealId)) {
        match = {
          id: `m_${dealId}_${now()}`,
          dealId,
          createdAt: now(),
          expiresAt: now() + MATCH_TTL_MS,
          used: false,
        };
        matches.push(match);
        write(LS.matches, matches);
      }
    }
    return { ok: true, match };
  },

  async undoLastSwipe() {
    if (SoffyAPI.BASE_URL) return _http('/offers/swipe/undo', { method: 'POST' });
    await delay(NET_DELAY_MS);
    const swipes = read(LS.swipes, []);
    const last = swipes.pop();
    write(LS.swipes, swipes);
    if (last?.dir === 'right') {
      const matches = read(LS.matches, []).filter(m => m.dealId !== last.dealId);
      write(LS.matches, matches);
    }
    return { ok: true, undone: last };
  },

  /** Reset historial de swipes (deja matches intactos) — "Ver de nuevo" del empty deck */
  async resetSwipes() {
    if (SoffyAPI.BASE_URL) return _http('/offers/swipes', { method: 'DELETE' });
    await delay(NET_DELAY_MS);
    write(LS.swipes, []);
    return { ok: true };
  },

  async getMatches() {
    if (SoffyAPI.BASE_URL) return _http('/user/matches');
    await delay(NET_DELAY_MS);
    const kept = _purgeExpiredMatches(read(LS.matches, []));
    write(LS.matches, kept);
    const t = now();
    const matches = kept
      .map(m => ({
        ...m,
        deal: _dealById(m.dealId),
        msLeft: Math.max(0, m.expiresAt - t),
      }))
      .filter(m => m.deal)
      .sort((a, b) => a.msLeft - b.msLeft);
    return { matches };
  },

  async markMatchUsed(matchId) {
    if (SoffyAPI.BASE_URL) return _http(`/user/matches/${matchId}/used`, { method: 'POST' });
    await delay(NET_DELAY_MS);
    const matches = read(LS.matches, []).map(m =>
      m.id === matchId ? { ...m, used: true, usedAt: now() } : m
    );
    write(LS.matches, matches);
    return { ok: true };
  },

  async deleteMatch(matchId) {
    if (SoffyAPI.BASE_URL) return _http(`/user/matches/${matchId}`, { method: 'DELETE' });
    await delay(NET_DELAY_MS);
    const matches = read(LS.matches, []).filter(m => m.id !== matchId);
    write(LS.matches, matches);
    return { ok: true };
  },

  async getProfile() {
    if (SoffyAPI.BASE_URL) return _http('/user/profile');
    await delay(NET_DELAY_MS);
    const profile = read(LS.profile, null) || {
      email: null,
      zone: 'cl-scl',
      plan: 'free',
      prefs: null,
      createdAt: now(),
    };
    return { profile };
  },

  async updateProfile(patch) {
    if (SoffyAPI.BASE_URL) return _http('/user/profile', { method: 'PATCH', body: patch });
    await delay(NET_DELAY_MS);
    const { profile } = await SoffyAPI.getProfile();
    const next = { ...profile, ...patch };
    write(LS.profile, next);
    return { profile: next };
  },

  async signup({ email, phone, password, zone = 'cl-scl', method = 'email' }) {
    if (SoffyAPI.BASE_URL) {
      return _http('/auth/signup', { method: 'POST', body: { email, phone, password, zone, method } });
    }
    await delay(NET_DELAY_MS);
    const profile = {
      email: email || null,
      phone: phone || null,
      zone,
      plan: 'free',
      prefs: null,
      authMethod: method,        // 'google' | 'email' | 'phone'
      createdAt: now(),
    };
    write(LS.profile, profile);
    write(LS.session, { token: `mock_${now()}`, email: email || phone });
    return { profile };
  },

  /** Devuelve true si hay un profile en localStorage (mock; futuro: cookie de sesión) */
  hasSession() {
    if (!isClient()) return false;
    const profile = read(LS.profile, null);
    return !!(profile && (profile.email || profile.phone));
  },

  _reset() {
    if (!isClient()) return;
    Object.values(LS).forEach(k => localStorage.removeItem(k));
  },
};

if (isClient()) window.SoffyAPI = SoffyAPI; // dev convenience para inspeccionar en DevTools
