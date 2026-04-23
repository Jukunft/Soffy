'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';

export const DEFAULT_FILTERS = {
  minDiscount: 0,
  distance: null,    // null = any, 'online' = only online, number = km
  sort: 'affinity',
};

const DISCOUNTS = [0, 20, 40, 60];
const DISTANCES = [
  { id: null,       label: 'filter_any' },
  { id: 1,          label: 'filter_km', vars: { n: 1 } },
  { id: 5,          label: 'filter_km', vars: { n: 5 } },
  { id: 'online',   label: 'filter_online' },
];
const SORTS = [
  { id: 'affinity', label: 'sort_affinity' },
  { id: 'ending',   label: 'sort_ending' },
  { id: 'discount', label: 'sort_discount' },
];

export default function FilterDrawer({ open, onClose, onApply, lang, initial = DEFAULT_FILTERS }) {
  const t = useT(lang);
  const [filters, setFilters] = useState(initial);

  useEffect(() => { if (open) setFilters(initial); }, [open, initial]);

  // lock scroll + esc to close
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

  const apply = () => { onApply(filters); onClose(); };
  const reset = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="drawer-handle" />
        <div className="drawer-header">
          <h3 className="drawer-title">{t('filter_title')}</h3>
          <button className="drawer-reset" onClick={reset}>{t('filter_reset')}</button>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} stroke={2.2} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-section">
            <p className="pref-label">{t('filter_discount')}</p>
            <div className="drawer-chips">
              {DISCOUNTS.map(d => (
                <button
                  key={d}
                  className={`chip ${filters.minDiscount === d ? 'selected' : ''}`}
                  onClick={() => setFilters({ ...filters, minDiscount: d })}>
                  {d === 0 ? t('filter_any') : `${d}%+`}
                </button>
              ))}
            </div>
          </div>

          <div className="drawer-section">
            <p className="pref-label">{t('filter_distance')}</p>
            <div className="drawer-chips">
              {DISTANCES.map(opt => (
                <button
                  key={String(opt.id)}
                  className={`chip ${filters.distance === opt.id ? 'selected' : ''}`}
                  onClick={() => setFilters({ ...filters, distance: opt.id })}>
                  {t(opt.label, opt.vars)}
                </button>
              ))}
            </div>
          </div>

          <div className="drawer-section">
            <p className="pref-label">{t('filter_sort')}</p>
            <div className="radio-row">
              {SORTS.map(s => (
                <div
                  key={s.id}
                  className={`radio-item ${filters.sort === s.id ? 'selected' : ''}`}
                  onClick={() => setFilters({ ...filters, sort: s.id })}>
                  <div className="radio-dot" />
                  <div className="radio-label">{t(s.label)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn btn-primary btn-lg btn-block" onClick={apply}>
            {t('filter_apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
