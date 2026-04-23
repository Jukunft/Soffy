/* global React, ReactDOM */
const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = {
  palette: "blue",
  language: "es"
};

function App() {
  const [screen, setScreen] = useStateApp(() => localStorage.getItem('soffy_screen') || 'welcome');
  const [palette, setPalette] = useStateApp(() => localStorage.getItem('soffy_palette') || TWEAK_DEFAULTS.palette);
  const [lang, setLang] = useStateApp(() => localStorage.getItem('soffy_lang') || TWEAK_DEFAULTS.language);
  const [prefs, setPrefs] = useStateApp(() => {
    const saved = localStorage.getItem('soffy_prefs');
    if (saved) return JSON.parse(saved);
    return { cats: [], tastes: [], loc: 'cdmx', budget: 'med' };
  });

  useEffectApp(() => { localStorage.setItem('soffy_screen', screen); }, [screen]);
  useEffectApp(() => { localStorage.setItem('soffy_palette', palette); }, [palette]);
  useEffectApp(() => { localStorage.setItem('soffy_lang', lang); }, [lang]);
  useEffectApp(() => { localStorage.setItem('soffy_prefs', JSON.stringify(prefs)); }, [prefs]);

  const paletteAttr = palette === 'blue' ? null : palette;

  const resetAll = () => {
    setPrefs({ cats: [], tastes: [], loc: 'cdmx', budget: 'med' });
    setScreen('welcome');
  };

  return (
    <div className="app-root" data-palette={paletteAttr}>
      <div className="app-content">
        {screen === 'welcome' && (
          <window.WelcomeScreen onStart={() => setScreen('onboarding')} lang={lang} />
        )}
        {screen === 'onboarding' && (
          <window.OnboardingFlow
            onComplete={() => setScreen('feed')}
            onBack={() => setScreen('welcome')}
            lang={lang}
            prefs={prefs}
            setPrefs={setPrefs}
          />
        )}
        {screen === 'feed' && (
          <window.FeedScreen
            prefs={prefs}
            lang={lang}
            onRestart={resetAll}
            onOpenMenu={resetAll}
            onOpenMatches={() => setScreen('matches')}
          />
        )}
        {screen === 'matches' && (
          <window.MatchesScreen
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
  );
}

function Root() {
  return (
    <div className="app-shell">
      <App />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
