import React, { useCallback, useEffect, useState } from 'react';
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

// Works in Chrome, Edge, Firefox and Safari on desktop.
const fullscreenElement = () =>
  document.fullscreenElement || document.webkitFullscreenElement;

// Small helper bar at the bottom of the tour: zoom out, recenter, zoom in, fullscreen.
export default function ViewControls({ onZoomIn, onZoomOut, onRecenter }) {
  const { t } = useLang();
  const [isFullscreen, setIsFullscreen] = useState(!!fullscreenElement());
  // iPhone Safari cannot show a web page fullscreen: hide the button there.
  const canFullscreen = !!(
    document.fullscreenEnabled || document.webkitFullscreenEnabled
  );

  useEffect(() => {
    const update = () => setIsFullscreen(!!fullscreenElement());
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (fullscreenElement()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      exit?.call(document)?.catch?.(() => {});
    } else {
      const el = document.documentElement;
      const enter = el.requestFullscreen || el.webkitRequestFullscreen;
      enter?.call(el)?.catch?.(() => {});
    }
  }, []);

  // Press F to switch fullscreen on or off.
  useEffect(() => {
    if (!canFullscreen) return undefined;
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'f' || e.ctrlKey || e.metaKey || e.altKey) return;
      toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canFullscreen, toggleFullscreen]);

  const fsLabel = isFullscreen ? t('exitFullscreen') : t('fullscreen');

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
      {canFullscreen && (
        <button
          className="fullscreen-btn"
          onClick={toggleFullscreen}
          aria-label={fsLabel}
          aria-pressed={isFullscreen}
          title={`${fsLabel} (F)`}
        >
          <Icon>
            {isFullscreen ? (
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            ) : (
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            )}
          </Icon>
        </button>
      )}
    </div>
  );
}
