// Soffy analytics — stub que hoy solo loguea a console.
// Cuando decidamos proveedor (PostHog / Plausible / Mixpanel / GA4), se
// cablea en `_dispatch` sin tocar ningún otro archivo.
//
// Uso:
//   import { track } from '@/lib/analytics';
//   track('swipe', { dealId: 'd1', dir: 'right', affinity: 92 });

const PROVIDER = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || null; // 'posthog' | 'plausible' | null
const DEBUG = process.env.NODE_ENV !== 'production';

const isClient = () => typeof window !== 'undefined';

// Eventos canónicos — mantener el vocabulario estable entre FE y dashboards.
export const EVENTS = {
  // onboarding / auth
  LANDING_VIEW:      'landing_view',
  SIGNUP_START:      'signup_start',
  SIGNUP_COMPLETE:   'signup_complete',
  LOGIN:             'login',
  ONBOARDING_STEP:   'onboarding_step',
  ONBOARDING_DONE:   'onboarding_done',

  // feed / swipe
  FEED_VIEW:         'feed_view',
  SWIPE:             'swipe',             // { dealId, dir, affinity }
  MATCH:             'match',             // { dealId, affinity }
  MATCH_HIGH:        'match_high',        // ≥ 85% — se muestra overlay
  BOOST_USED:        'boost_used',
  UNDO_SWIPE:        'undo_swipe',
  FILTER_APPLY:      'filter_apply',
  CAP_HIT:           'cap_hit',

  // matches / coupon
  MATCHES_VIEW:      'matches_view',
  COUPON_VIEW:       'coupon_view',       // click en "Ver cupón"
  COUPON_USED:       'coupon_used',
  MATCH_DELETED:     'match_deleted',
  MATCH_EXPIRED:     'match_expired',     // se descubrió al re-fetch

  // profile / monetization
  PROFILE_VIEW:      'profile_view',
  PAYWALL_VIEW:      'paywall_view',      // { reason }
  PAYWALL_ACTIVATE:  'paywall_activate',  // { billing }
  PAYWALL_DISMISS:   'paywall_dismiss',
  LANG_SWITCH:       'lang_switch',
  LOGOUT:            'logout',
};

function _dispatch(event, props) {
  if (!isClient()) return;

  // DEV: consola
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(`📊 [analytics] ${event}`, props || '');
  }

  // PROD wire-up futuro — cuando elijamos proveedor, activar una rama:
  //
  // if (PROVIDER === 'posthog' && window.posthog) {
  //   window.posthog.capture(event, props);
  // }
  // if (PROVIDER === 'plausible' && window.plausible) {
  //   window.plausible(event, { props });
  // }
}

export function track(event, props) {
  try { _dispatch(event, props); } catch { /* nunca romper UI por analytics */ }
}

export function identify(userId, traits = {}) {
  if (!isClient() || DEBUG) {
    // eslint-disable-next-line no-console
    if (DEBUG) console.log(`📊 [analytics] identify`, { userId, ...traits });
  }
  // Hook futuro: posthog.identify, plausible no lo usa (anon).
}

export function reset() {
  if (!isClient()) return;
  // Hook futuro para logout: posthog.reset().
}
