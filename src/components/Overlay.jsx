import React, { useEffect } from 'react';
import { useLang } from '../i18n.jsx';

// Shared page-like popup used by History, Plans and Gallery.
export default function Overlay({ title, onClose, children }) {
  const { t } = useLang();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="overlay-box" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="overlay-close" onClick={onClose} aria-label={t('close')}>
            ×
          </button>
        </header>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}
