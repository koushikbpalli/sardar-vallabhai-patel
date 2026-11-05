import React from 'react';
import { useLang } from '../i18n.jsx';

const Icon = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

// Small helper bar at the bottom of the tour: zoom out, recenter, zoom in.
export default function ViewControls({ onZoomIn, onZoomOut, onRecenter }) {
  const { t } = useLang();

  return (
    <div className="view-controls" role="group" aria-label={t('virtualTour')}>
      <button onClick={onZoomOut} aria-label={t('zoomOut')} title={t('zoomOut')}>
        <Icon>
          <path d="M5 12h14" />
        </Icon>
      </button>
      <button className="recenter" onClick={onRecenter} aria-label={t('recenter')} title={t('recenter')}>
        <Icon>
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="1.5" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </Icon>
      </button>
      <button onClick={onZoomIn} aria-label={t('zoomIn')} title={t('zoomIn')}>
        <Icon>
          <path d="M12 5v14M5 12h14" />
        </Icon>
      </button>
    </div>
  );
}
