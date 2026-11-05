import React, { useState } from 'react';
import Overlay from './Overlay.jsx';
import { HISTORY_VIDEO } from '../data/content.js';
import { useLang } from '../i18n.jsx';

export default function HistoryVideo({ onClose }) {
  const { t } = useLang();
  const [failed, setFailed] = useState(false);

  return (
    <Overlay title={t('history')} onClose={onClose}>
      {failed ? (
        <p className="media-error">{t('videoError')}</p>
      ) : (
        <video
          className="history-video"
          src={HISTORY_VIDEO.src}
          poster={HISTORY_VIDEO.poster}
          controls
          autoPlay
          playsInline
          onError={() => setFailed(true)}
        />
      )}
    </Overlay>
  );
}
