'use client';
import { useEffect, useState } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import AuthScreen from '@/components/AuthScreen';
import OnboardingFlow from '@/components/OnboardingFlow';
import FeedScreen from '@/components/FeedScreen';
import MatchesScreen from '@/components/MatchesScreen';
import ProfileScreen from '@/components/ProfileScreen';
import PaywallScreen from '@/components/PaywallScreen';

const DEFAULT_PREFS = { cats: [], tastes: [], loc: 'cdmx', budget: 'med' };

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState('welcome');
  const [authMode, setAuthMode] = useState('signup');
  const [paywallReason, setPaywallReason] = useState(null);
  const [lang, setLang] = useState('es');
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  // Rehidratar desde localStorage solo en cliente (SSR-safe)
  useEffect(() => {
    try {
      const s = localStorage.getItem('soffy_screen');
      const l = localStorage.getItem('soffy_lang');
      const p = localStorage.getItem('soffy_prefs');
      if (s) setScreen(s);
      if (l) setLang(l);
      if (p) setPrefs(JSON.parse(p));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem('soffy_screen', screen); }, [screen, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('soffy_lang', lang); }, [lang, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem('soffy_prefs', JSON.stringify(prefs)); }, [prefs, hydrated]);

  const resetAll = () => {
    setPrefs(DEFAULT_PREFS);
    setScreen('welcome');
  };

  const startAuth = (mode) => {
    setAuthMode(mode);
    setScreen('auth');
  };

  const handleAuthSuccess = (profile, mode) => {
    // login con prefs guardadas → directo al feed. Resto → onboarding.
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
          {screen === 'welcome' && (
            <WelcomeScreen
              lang={lang}
              onStart={() => startAuth('signup')}
              onLogin={() => startAuth('login')}
            />
          )}
          {screen === 'auth' && (
            <AuthScreen
              lang={lang}
              initialMode={authMode}
              onSuccess={handleAuthSuccess}
              onBack={() => setScreen('welcome')}
            />
          )}
          {screen === 'onboarding' && (
            <OnboardingFlow
              onComplete={() => setScreen('feed')}
              onBack={() => setScreen('welcome')}
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
              onEditPrefs={() => setScreen('onboarding')}
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

        {screen === 'welcome' && (
          <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
            <div className="lang-toggle">
              <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
