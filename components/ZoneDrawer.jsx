'use client';
import { useEffect } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';

export const ZONES = [
  { id: 'cl-scl',  label: { es: 'Santiago',      en: 'Santiago' },      country: 'Chile',       flag: '🇨🇱' },
  { id: 'mx-cdmx', label: { es: 'Ciudad de México', en: 'Mexico City' }, country: 'México',      flag: '🇲🇽' },
  { id: 'mx-gdl',  label: { es: 'Guadalajara',   en: 'Guadalajara' },   country: 'México',      flag: '🇲🇽' },
  { id: 'mx-mty',  label: { es: 'Monterrey',     en: 'Monterrey' },     country: 'México',      flag: '🇲🇽' },
  { id: 'ar-bue',  label: { es: 'Buenos Aires',  en: 'Buenos Aires' },  country: 'Argentina',   flag: '🇦🇷' },
];

export default function ZoneDrawer({ open, current, lang, onPick, onClose, premiumUnlocked = false }) {
  const t = useT(lang);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="drawer-handle" />
        <div className="drawer-header">
          <h3 className="drawer-title">{t('zone_drawer_title')}</h3>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} stroke={2.2} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="zone-list">
            {ZONES.map(z => {
              const selected = z.id === current;
              return (
                <button
                  key={z.id}
                  className={`zone-item ${selected ? 'selected' : ''}`}
                  onClick={() => { onPick(z.id); onClose(); }}>
                  <span className="zone-flag">{z.flag}</span>
                  <div className="zone-label-wrap">
                    <div className="zone-label">{z.label[lang]}</div>
                    <div className="zone-country">{z.country}</div>
                  </div>
                  {selected && <Icon name="check" size={16} stroke={2.4} />}
                </button>
              );
            })}
          </div>
          {!premiumUnlocked && (
            <p className="zone-hint">
              {lang === 'es'
                ? 'Free muestra solo descuentos de tu ciudad. Con LATAM Pass ves toda la región.'
                : 'Free shows deals in your city only. LATAM Pass unlocks all cities.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
