import React, { useRef } from 'react';
import Overlay from './Overlay.jsx';
import { GALLERY } from '../data/content.js';
import { pick, useLang } from '../i18n.jsx';

export default function Gallery({ onClose }) {
  const { lang, t } = useLang();
  const scroller = useRef(null);

  const scrollBy = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  // Mouse wheel scrolls sideways; touch screens swipe natively.
  const onWheel = (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && scroller.current) {
      scroller.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <Overlay title={t('gallery')} onClose={onClose}>
      <div className="gallery-scroller" ref={scroller} onWheel={onWheel}>
        {GALLERY.map((item) => (
          <figure className="gallery-item" key={item.src}>
            <img src={item.src} alt={pick(item.caption, lang)} draggable="false" />
            <figcaption>{pick(item.caption, lang)}</figcaption>
          </figure>
        ))}
      </div>
      <div className="gallery-controls">
        <button onClick={() => scrollBy(-1)} aria-label={t('prev')}>‹</button>
        <button onClick={() => scrollBy(1)} aria-label={t('next')}>›</button>
      </div>
    </Overlay>
  );
}
