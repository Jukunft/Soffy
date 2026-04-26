'use client';
import { useEffect, useState } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import AuthScreen from '@/components/AuthScreen';
import OnboardingFlow from '@/components/OnboardingFlow';
import FeedScreen from '@/components/FeedScreen';
import MatchesScreen from '@/components/MatchesScreen';
import ProfileScreen from '@/components/ProfileScreen';
import PaywallScreen from '@/components/PaywallScreen';
import { SoffyAPI } from '@/lib/api';

const DEFAULT_PREFS = { cats: [], tastes: [], loc: 'cdmx', budget: 'med' };

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState('welcome');
  const [authMode, setAuthMode] = useState('signup');
  const [onboardingMode, setOnboardingMode] = useState('signup');
  const [paywallReason, setPaywallReason] = useState(null);
  const [lang, setLang] = useState('es');
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  // Auto-routing al montar /app (no pasamos por welcome).
  // Decisión basada en session + prefs + query params, no en último screen guardado.
  useEffect(() => {
    try {
      const l = localStorage.getItem('soffy_lang');
      const p = localStorage.getItem('soffy_prefs');
      if (l) setLang(l);
      const parsedPrefs = p ? JSON.parse(p) : null;
      if (parsedPrefs) setPrefs(parsedPrefs);

      const params = new URLSearchParams(window.location.search);
      const go = params.get('go');
      const mode = params.get('mode');
      const profileRaw = localStorage.getItem('soffy_api_profile');
      const hasSession = !!profileRaw;
      const hasPrefs = (parsedPrefs?.cats?.length || 0) >= 3;

      // Routing matrix:
      //  ?mode=login  → auth login (cambiar de cuenta)
      //  ?mode=signup → auth signup
      //  registered + prefs done → feed (directo)
      //  registered, sin prefs → onboarding
      //  no session → auth signup
      if (mode === 'login')         { setAuthMode('login');  setScreen('auth'); }
      else if (mode === 'signup')   { setAuthMode('signup'); setScreen('auth'); }
      else if (hasSession && hasPrefs) setScreen('feed');
      else if (hasSession)             setScreen('onboarding');
      else                          { setAuthMode('signup'); setScreen('auth'); }

      // limpia query para que un reload no re-trigger
      if (go || mode) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch {}
    setHydrated(true);
  }, []);

  // soffy_screen ya no se persiste — el routing se decide por session+prefs en el useEffect inicial
  useEffect(() => { if (hydrated) localStorage.setItem('soffy_lang', lang); }, [lang, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('soffy_prefs', JSON.stringify(prefs)); }, [prefs, hydrated]);

  const resetAll = () => {
    setPrefs(DEFAULT_PREFS);
    try { localStorage.removeItem('soffy_screen'); } catch {}
    setAuthMode('signup');
    setScreen('auth');
  };

  const startAuth = (mode) => {
    setAuthMode(mode);
    setScreen('auth');
  };

  const handleAuthSuccess = (profile, mode) => {
    // login con prefs guardadas → directo al feed. Resto → onboarding signup.
    setOnboardingMode('signup');
    if (mode === 'login' && profile?.prefs?.cats?.length >= 3) {
      setPrefs(profile.prefs);
      setScreen('feed');
    } else {
      setScreen('onboarding');
    }
  };

  const openPaywall = (reason = null) => {
    setPaywallReason(reason);
    setScreen('paywall');
  };

  return (
    <div className="app-shell">
      <div className="app-root">
        <div className="app-content">
          {/* Welcome screen ya no se usa — routing va directo a auth/onboarding/feed */}
          {screen === 'auth' && (
            <AuthScreen
              lang={lang}
              initialMode={authMode}
              onSuccess={handleAuthSuccess}
              onBack={() => {
                if (window.history.length > 1) window.history.back();
                else window.location.href = '/';
              }}
            />
          )}
          {screen === 'onboarding' && (
            <OnboardingFlow
              mode={onboardingMode}
              onComplete={() => {
                // Persistir prefs en el profile (edit) o signup (primer flow)
                SoffyAPI.updateProfile({ prefs }).catch(() => {});
                setScreen(onboardingMode === 'edit' ? 'profile' : 'feed');
              }}
              onBack={() => setScreen(onboardingMode === 'edit' ? 'profile' : 'auth')}
              lang={lang}
              prefs={prefs}
              setPrefs={setPrefs}
            />
          )}
          {screen === 'feed' && (
            <FeedScreen
              prefs={prefs}
              lang={lang}
              onRestart={resetAll}
              onOpenProfile={() => setScreen('profile')}
              onOpenMatches={() => setScreen('matches')}
              onOpenPaywall={openPaywall}
            />
          )}
          {screen === 'matches' && (
            <MatchesScreen
              lang={lang}
              onBack={() => setScreen('feed')}
            />
          )}
          {screen === 'profile' && (
            <ProfileScreen
              lang={lang}
              setLang={setLang}
              prefs={prefs}
              onBack={() => setScreen('feed')}
              onEditPrefs={() => { setOnboardingMode('edit'); setScreen('onboarding'); }}
              onOpenPaywall={() => openPaywall()}
              onLogout={resetAll}
            />
          )}
          {screen === 'paywall' && (
            <PaywallScreen
              lang={lang}
              reason={paywallReason}
              onClose={() => setScreen(paywallReason === 'daily_cap' ? 'feed' : 'profile')}
              onActivated={() => setScreen('feed')}
            />
          )}
        </div>

        {screen === 'auth' && (
          <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
            <div className="lang-toggle" role="group" aria-label="Language">
              <button aria-pressed={lang === 'es'} className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
              <button aria-pressed={lang === 'en'} className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
