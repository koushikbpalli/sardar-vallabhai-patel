import React, { useCallback, useEffect, useState } from "react";
import { useLang } from "../i18n.jsx";
import "./FullscreenButton.css";

// Works in Chrome, Edge, Firefox and Safari on desktop.
const fullscreenElement = () =>
  document.fullscreenElement || document.webkitFullscreenElement;

// Round fullscreen button that stays on screen on every page (home, tour and
// every popup). Press F to switch fullscreen on or off.
// place : where the visitor is, so the button never covers anything:
//   'home'       home page (inside the gold frame)
//   'tour'       tour page (below the tour's top bar)
//   'popup-home' History / Plans / Gallery / Renders opened over the home page
//   'popup-tour' the same, opened over the tour
export default function FullscreenButton({ place = "home" }) {
  const { t } = useLang();
  const [isFullscreen, setIsFullscreen] = useState(!!fullscreenElement());
  // iPhone Safari cannot show a web page fullscreen: hide the button there.
  const canFullscreen = !!(
    document.fullscreenEnabled || document.webkitFullscreenEnabled
  );

  useEffect(() => {
    const update = () => setIsFullscreen(!!fullscreenElement());
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
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

  useEffect(() => {
    if (!canFullscreen) return undefined;
    const onKey = (e) => {
      if (e.key.toLowerCase() !== "f" || e.ctrlKey || e.metaKey || e.altKey) return;
      toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canFullscreen, toggleFullscreen]);

  if (!canFullscreen) return null;

  const label = isFullscreen ? t("exitFullscreen") : t("fullscreen");

  return (
    <button
      type="button"
      className={`fullscreen-fab fs-${place}`}
      onClick={toggleFullscreen}
      aria-label={label}
      aria-pressed={isFullscreen}
      title={`${label} (F)`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isFullscreen ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
    </button>
  );
}
