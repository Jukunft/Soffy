'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';
import { CATEGORIES, TASTES, DEALS } from '@/lib/data';
import { track, EVENTS } from '@/lib/analytics';

export default function OnboardingFlow({ onComplete, onBack, lang, prefs, setPrefs, mode = 'signup' }) {
  const [step, setStep] = useState(1);
  const t = useT(lang);
  const TOTAL = 4;
  const isEdit = mode === 'edit';

  const next = () => {
    track(EVENTS.ONBOARDING_STEP, { step, cats: prefs.cats.length, tastes: prefs.tastes.length });
    if (step < TOTAL) {
      setStep(step + 1);
    } else {
      track(EVENTS.ONBOARDING_DONE, { cats: prefs.cats.length, tastes: prefs.tastes.length, loc: prefs.loc, budget: prefs.budget });
      onComplete();
    }
  };
  const prev = () => {
    if (step > 1) setStep(step - 1);
    else onBack();
  };

  const canContinue = () => {
    if (step === 1) return prefs.cats.length >= 3;
    if (step === 2) return prefs.tastes.length >= 2;
    return true;
  };

  return (
    <div className="onb">
      <div className="onb-top">
        <button className="onb-back" onClick={prev} aria-label={t('back')}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(step / TOTAL) * 100}%` }} />
          </div>
        </div>
        <div className="onb-step">{t('step_of', { n: step, t: TOTAL })}</div>
      </div>

      {step === 1 && <Step1Categories prefs={prefs} setPrefs={setPrefs} lang={lang} />}
      {step === 2 && <Step2Tastes prefs={prefs} setPrefs={setPrefs} lang={lang} />}
      {step === 3 && <Step3LocBudget prefs={prefs} setPrefs={setPrefs} lang={lang} />}
      {step === 4 && <Step4Ready prefs={prefs} lang={lang} />}

      <div className="onb-footer">
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={next}
          disabled={!canContinue()}
          style={{ opacity: canContinue() ? 1 : 0.4, cursor: canContinue() ? 'pointer' : 'not-allowed' }}>
          {step === TOTAL
            ? (isEdit ? t('save_prefs') : t('finish'))
            : t('continue')} <Icon name="arrowRight" size={16} />
        </button>
      </div>
    </div>
  );
}

function Step1Categories({ prefs, setPrefs, lang }) {
  const t = useT(lang);
  const toggle = (id) => {
    const next = prefs.cats.includes(id)
      ? prefs.cats.filter(c => c !== id)
      : [...prefs.cats, id];
    let nextTastes = prefs.tastes;
    if (!next.includes(id)) {
      const catTasteIds = (TASTES[id] || []).map(tt => tt.id);
      nextTastes = prefs.tastes.filter(tid => !catTasteIds.includes(tid));
    }
    setPrefs({ ...prefs, cats: next, tastes: nextTastes });
  };
  return (
    <>
      <div className="onb-header">
        <p className="eyebrow">01 / CATEGORIES</p>
        <h2 className="onb-title">{t('onb1_title')}</h2>
        <p className="onb-sub">{t('onb1_sub')}</p>
      </div>
      <div className="onb-body">
        <div className="cat-grid">
          {CATEGORIES.map(c => (
            <div
              key={c.id}
              className={`cat-tile ${prefs.cats.includes(c.id) ? 'selected' : ''}`}
              onClick={() => toggle(c.id)}>
              <div className="emoji-placeholder">{c.emoji}</div>
              <div>
                <div className="cat-name">{c.name[lang]}</div>
                <div className="cat-count">{c.count} {lang === 'es' ? 'ofertas' : 'deals'}</div>
              </div>
              <div className="cat-check"><Icon name="check" size={14} stroke={3} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="onb-counter">
        {prefs.cats.length}/{CATEGORIES.length} {lang === 'es' ? 'seleccionadas' : 'selected'}
      </div>
    </>
  );
}

function Step2Tastes({ prefs, setPrefs, lang }) {
  const t = useT(lang);
  const toggleTaste = (tid) => {
    const next = prefs.tastes.includes(tid)
      ? prefs.tastes.filter(x => x !== tid)
      : [...prefs.tastes, tid];
    setPrefs({ ...prefs, tastes: next });
  };
  const selectedCats = CATEGORIES.filter(c => prefs.cats.includes(c.id));
  return (
    <>
      <div className="onb-header">
        <p className="eyebrow">02 / TASTES</p>
        <h2 className="onb-title">{t('onb2_title')}</h2>
        <p className="onb-sub">{t('onb2_sub')}</p>
      </div>
      <div className="onb-body">
        {selectedCats.map(cat => {
          const tastes = TASTES[cat.id] || [];
          const selectedInCat = tastes.filter(x => prefs.tastes.includes(x.id)).length;
          return (
            <div className="taste-group" key={cat.id}>
              <div className="taste-group-header">
                <div className="taste-group-icon">{cat.emoji}</div>
                <div className="taste-group-name">{cat.name[lang]}</div>
                <div className="taste-group-count">{selectedInCat}/{tastes.length}</div>
              </div>
              <div className="taste-chips">
                {tastes.map(tst => (
                  <span
                    key={tst.id}
                    className={`chip ${prefs.tastes.includes(tst.id) ? 'selected' : ''}`}
                    onClick={() => toggleTaste(tst.id)}>
                    {tst.name[lang]}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="onb-counter">
        {prefs.tastes.length} {lang === 'es' ? 'gustos elegidos' : 'tastes picked'}
      </div>
    </>
  );
}

function Step3LocBudget({ prefs, setPrefs, lang }) {
  const t = useT(lang);
  const locs = [
    { id: 'cdmx', label: t('loc_cdmx') },
    { id: 'gdl', label: t('loc_gdl') },
    { id: 'mty', label: t('loc_mty') },
    { id: 'all', label: t('loc_all') },
  ];
  const budgets = [
    { id: 'low', label: t('budget_low'), hint: t('budget_low_hint') },
    { id: 'med', label: t('budget_med'), hint: t('budget_med_hint') },
    { id: 'high', label: t('budget_high'), hint: t('budget_high_hint') },
  ];
  return (
    <>
      <div className="onb-header">
        <p className="eyebrow">03 / PREFERENCES</p>
        <h2 className="onb-title">{t('onb3_title')}</h2>
        <p className="onb-sub">{t('onb3_sub')}</p>
      </div>
      <div className="onb-body">
        <div className="pref-section">
          <p className="pref-label">{t('loc_label')}</p>
          <div className="radio-row">
            {locs.map(l => (
              <div
                key={l.id}
                className={`radio-item ${prefs.loc === l.id ? 'selected' : ''}`}
                onClick={() => setPrefs({ ...prefs, loc: l.id })}>
                <div className="radio-dot" />
                <Icon name="mapPin" size={18} />
                <div>
                  <div className="radio-label">{l.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="pref-section">
          <p className="pref-label">{t('budget_label')}</p>
          <div className="radio-row">
            {budgets.map(b => (
              <div
                key={b.id}
                className={`radio-item ${prefs.budget === b.id ? 'selected' : ''}`}
                onClick={() => setPrefs({ ...prefs, budget: b.id })}>
                <div className="radio-dot" />
                <div>
                  <div className="radio-label">{b.label}</div>
                  <div className="radio-hint">{b.hint}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Step4Ready({ prefs, lang }) {
  const t = useT(lang);
  const matching = DEALS.filter(d =>
    prefs.cats.includes(d.cat) &&
    d.tastes.some(tid => prefs.tastes.includes(tid))
  );
  return (
    <>
      <div className="onb-header">
        <p className="eyebrow">04 / READY</p>
        <h2 className="onb-title">{t('onb4_title')}</h2>
        <p className="onb-sub">{t('onb4_sub')}</p>
      </div>
      <div className="onb-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 44, color: '#fff',
          boxShadow: '0 20px 40px -12px color-mix(in srgb, var(--accent) 60%, transparent)',
          marginBottom: 20,
        }}>
          {matching.length}
        </div>
        <div className="display display-md" style={{ marginBottom: 6 }}>
          {t('deals_waiting', { n: matching.length })}
        </div>
        <div style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{t('based_on')}</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 18, maxWidth: 280 }}>
          {prefs.tastes.slice(0, 8).map(tid => {
            const taste = Object.values(TASTES).flat().find(tt => tt.id === tid);
            if (!taste) return null;
            return <span key={tid} className="chip selected-blue">{taste.name[lang]}</span>;
          })}
          {prefs.tastes.length > 8 && <span className="chip">+{prefs.tastes.length - 8}</span>}
        </div>
      </div>
    </>
  );
}
