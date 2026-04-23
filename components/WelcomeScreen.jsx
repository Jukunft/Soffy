'use client';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';

export default function WelcomeScreen({ onStart, lang }) {
  const t = useT(lang);
  return (
    <div className="welcome">
      <div className="welcome-bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>

      <div className="welcome-logo-wrap">
        <img src="/assets/soffy-brand.png" alt="Soffy" className="welcome-logo" />
        <p className="welcome-tagline"><span>{t('welcome_tagline')}</span></p>
      </div>

      <div style={{ position: 'relative' }}>
        <h1 className="display display-xl welcome-title">
          {t('welcome_title_a')} <span className="accent">{t('welcome_title_b')}</span> {t('welcome_title_c')}
        </h1>
        <p className="welcome-sub">{t('welcome_sub')}</p>

        <div className="welcome-ctas">
          <button className="btn btn-primary btn-lg btn-block" onClick={onStart}>
            {t('get_started')} <Icon name="arrowRight" size={18} />
          </button>
          <button className="btn btn-ghost btn-block">{t('already_account')}</button>
        </div>
      </div>
    </div>
  );
}
