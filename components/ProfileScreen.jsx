'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';
import { SoffyAPI } from '@/lib/api';
import { track, EVENTS } from '@/lib/analytics';
import ZoneDrawer from '@/components/ZoneDrawer';
import { COUNTRY_BY_ID } from '@/lib/countries';

export default function ProfileScreen({ lang, setLang, prefs, onBack, onEditPrefs, onOpenPaywall, onLogout }) {
  const t = useT(lang);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const flashToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1900); };

  useEffect(() => {
    track(EVENTS.PROFILE_VIEW);
    SoffyAPI.getProfile().then(r => {
      setProfile(r.profile);
      setLoading(false);
    });
  }, []);

  const isPremium = profile?.plan === 'premium';
  const zone = profile?.zone || 'cl';
  const zoneInfo = COUNTRY_BY_ID[zone];
  const zoneLabel = zoneInfo ? `${zoneInfo.flag} ${zoneInfo.name}` : zone;
  const initial = (profile?.email || '?')[0].toUpperCase();

  const changeZone = (newZone) => {
    if (newZone === zone) return;
    track(EVENTS.PROFILE_VIEW, { action: 'zone_change', from: zone, to: newZone });
    SoffyAPI.updateProfile({ zone: newZone }).then(r => {
      setProfile(r.profile);
      flashToast(t('zone_saved'));
    });
  };

  const switchLang = (l) => {
    track(EVENTS.LANG_SWITCH, { from: lang, to: l });
    setLang(l);
    SoffyAPI.updateProfile({ lang: l }).catch(() => {});
  };

  const handleLogout = () => {
    track(EVENTS.LOGOUT);
    SoffyAPI._reset();
    onLogout && onLogout();
  };

  return (
    <div className="profile">
      <div className="profile-topbar">
        <button className="onb-back" onClick={onBack} aria-label={t('back')}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <div className="profile-title-wrap">
          <p className="eyebrow">{lang === 'es' ? 'PERFIL' : 'PROFILE'}</p>
          <h2 className="profile-title">{t('profile_title')}</h2>
        </div>
      </div>

      <div className="profile-body">
        <div className="profile-card">
          <div className={`profile-avatar ${isPremium ? 'is-premium' : ''}`}>
            {loading ? '' : initial}
          </div>
          <div className="profile-identity">
            <div className="profile-email">
              {loading ? '…' : (profile?.email || t('profile_guest'))}
            </div>
            <div className={`profile-plan-pill ${isPremium ? 'is-premium' : ''}`}>
              {isPremium
                ? <><Icon name="sparkles" size={11} stroke={2.2} /> {t('profile_plan_premium')}</>
                : t('profile_plan_free')}
            </div>
          </div>
        </div>

        {!isPremium && (
          <div className="profile-upsell">
            <div className="profile-upsell-glow" />
            <div className="profile-upsell-icon"><Icon name="sparkles" size={18} stroke={2} /></div>
            <div className="profile-upsell-body">
              <div className="profile-upsell-title">{t('profile_upsell_title')}</div>
              <div className="profile-upsell-sub">{t('profile_upsell_sub')}</div>
            </div>
            <button className="btn btn-primary profile-upsell-cta" onClick={onOpenPaywall}>
              {t('profile_upsell_cta')}
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
        )}

        <div className="profile-section">
          <p className="pref-label">{t('profile_zone_label')}</p>
          <button className="profile-row profile-row-btn" onClick={() => setZoneOpen(true)}>
            <Icon name="mapPin" size={16} />
            <span className="profile-row-label">{zoneLabel}</span>
            <Icon name="chevronRight" size={16} />
          </button>
        </div>

        <div className="profile-section">
          <p className="pref-label">{t('profile_lang_label')}</p>
          <div className="profile-row">
            <span className="profile-row-label" style={{ flex: 1 }}>
              {lang === 'es' ? 'Español' : 'English'}
            </span>
            <div className="lang-toggle" role="group" aria-label={t('profile_lang_label')}>
              <button aria-pressed={lang === 'es'} className={lang === 'es' ? 'active' : ''} onClick={() => switchLang('es')}>ES</button>
              <button aria-pressed={lang === 'en'} className={lang === 'en' ? 'active' : ''} onClick={() => switchLang('en')}>EN</button>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <p className="pref-label">{t('profile_prefs_label')}</p>
          <div className="profile-row">
            <Icon name="sliders" size={16} />
            <span className="profile-row-label">
              {t('profile_prefs_summary', { c: prefs?.cats?.length || 0, t: prefs?.tastes?.length || 0 })}
            </span>
          </div>
          <button className="btn btn-ghost btn-block profile-edit-btn" onClick={onEditPrefs}>
            <Icon name="refresh" size={14} /> {t('profile_edit_prefs')}
          </button>
        </div>

        <div className="profile-danger">
          <button className="btn btn-ghost btn-block" onClick={handleLogout}>
            {t('profile_reset_all')}
          </button>
        </div>
      </div>

      <ZoneDrawer
        open={zoneOpen}
        current={zone}
        lang={lang}
        premiumUnlocked={isPremium}
        onPick={changeZone}
        onClose={() => setZoneOpen(false)}
      />

      <div className="matches-toast-region" role="status" aria-live="polite" aria-atomic="true">
        {toast && <div className="matches-toast">{toast}</div>}
      </div>
    </div>
  );
}
