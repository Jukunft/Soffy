'use client';
import { useEffect, useState } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import OnboardingFlow from '@/components/OnboardingFlow';
import FeedScreen from '@/components/FeedScreen';
import MatchesScreen from '@/components/MatchesScreen';

const DEFAULT_PREFS = { cats: [], tastes: [], loc: 'cdmx', budget: 'med' };

export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState('welcome');
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

  return (
    <div className="app-shell">
      <div className="app-root">
        <div className="app-content">
          {screen === 'welcome' && (
            <WelcomeScreen onStart={() => setScreen('onboarding')} lang={lang} />
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
              onOpenMenu={resetAll}
              onOpenMatches={() => setScreen('matches')}
            />
          )}
          {screen === 'matches' && (
            <MatchesScreen
              lang={lang}
              onBack={() => setScreen('feed')}
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
