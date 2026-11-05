import React, { useState } from 'react';
import Overlay from './Overlay.jsx';
import { PLAN } from '../data/content.js';
import { pick, useLang } from '../i18n.jsx';

export default function Plans({ onClose }) {
  const { lang, t } = useLang();
  const [selected, setSelected] = useState(null);
  const pin = PLAN.pins.find((p) => p.id === selected);

  return (
    <Overlay title={t('plans')} onClose={onClose}>
      <div className="plans">
        <div className="plan-stage" style={{ '--ratio': PLAN.ratio }}>
          <img
            src={PLAN.image}
            alt=""
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
          />
          {PLAN.pins.map((p, i) => (
            <button
              key={p.id}
              className={`plan-pin${p.id === selected ? ' active' : ''}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={() => setSelected(p.id === selected ? null : p.id)}
              aria-label={pick(p.title, lang)}
              aria-pressed={p.id === selected}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <aside className="plan-info" aria-live="polite">
          {pin ? (
            <>
              {pin.image && <img src={pin.image} alt="" />}
              <p className="tag">{pick(pin.tag, lang)}</p>
              <h3>{pick(pin.title, lang)}</h3>
              <p className="desc">{pick(pin.description, lang)}</p>
            </>
          ) : (
            <p className="plan-hint">{t('planHint')}</p>
          )}
        </aside>
      </div>
    </Overlay>
  );
}
