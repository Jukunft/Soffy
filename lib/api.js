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

  async getDeck({ prefs, cat = 'all', limit = 30 } = {}) {
    if (SoffyAPI.BASE_URL) {
      const q = new URLSearchParams({ cat, limit });
      return _http(`/offers/deck?${q}`);
    }
    await delay(NET_DELAY_MS);
    const swiped = new Set(read(LS.swipes, []).map(s => s.dealId));
    let deals = DEALS.filter(d => !swiped.has(d.id));
    if (prefs) {
      deals = deals.filter(d =>
        prefs.cats?.includes(d.cat) &&
        d.tastes.some(t => prefs.tastes?.includes(t))
      );
    }
    if (cat && cat !== 'all') deals = deals.filter(d => d.cat === cat);
    deals = deals
      .map(d => ({ ...d, affinity: Math.round(_affinityScore(d, prefs)) }))
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, limit);
    return { deck: deals };
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

  async signup({ email, zone = 'cl-scl' }) {
    if (SoffyAPI.BASE_URL) return _http('/auth/signup', { method: 'POST', body: { email, zone } });
    await delay(NET_DELAY_MS);
    const profile = { email, zone, plan: 'free', prefs: null, createdAt: now() };
    write(LS.profile, profile);
    write(LS.session, { token: `mock_${now()}`, email });
    return { profile };
  },

  _reset() {
    if (!isClient()) return;
    Object.values(LS).forEach(k => localStorage.removeItem(k));
  },
};

if (isClient()) window.SoffyAPI = SoffyAPI; // dev convenience para inspeccionar en DevTools
