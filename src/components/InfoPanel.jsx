import React, { useRef } from 'react';
import { markerIndex } from '../data/nodes.js';
import { pick, useLang } from '../i18n.jsx';

// Slide-in card with details of the stall/pin the visitor clicked.
export default function InfoPanel({ markerId, onClose }) {
  const { lang, t } = useLang();
  const marker = markerId ? markerIndex[markerId] : null;

  // Keep the last content on screen while the card slides out.
  const lastRef = useRef(null);
  if (marker) lastRef.current = marker;
  const shown = marker || lastRef.current;

  return (
    <aside className={`info-card${marker ? ' open' : ''}`} aria-hidden={!marker}>
      {shown && (
        <>
          <p className="tag">{pick(shown.tag, lang)}</p>
          <h2>{pick(shown.title, lang)}</h2>
          <p className="desc">{pick(shown.description, lang)}</p>
          <button onClick={onClose}>{t('close')}</button>
        </>
      )}
    </aside>
  );
}
