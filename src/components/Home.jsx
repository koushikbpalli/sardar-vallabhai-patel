import React from "react";
import { LANGUAGES, useLang } from "../i18n.jsx";
import PanoBackground from "./PanoBackground.jsx";

const ORDER = ["en", "te", "hi"];

function ClockTowerIcon() {
  return (
    <svg
      className="home-icon"
      viewBox="0 0 120 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* tower roof */}
      <path d="M60 3 L50 14 H70 Z" />
      {/* tower body */}
      <rect x="51" y="14" width="18" height="20" />
      {/* clock */}
      <circle cx="60" cy="24" r="5" />
      <path d="M60 21 V24 L62 25.5" />
      {/* main building */}
      <path d="M4 36 H116" />
      <path d="M8 36 V60 M112 36 V60 M4 60 H116" />
      <path d="M2 34 H118" />
      {/* columns */}
      <path d="M20 36 V60 M32 36 V60 M44 36 V60 M76 36 V60 M88 36 V60 M100 36 V60" />
      <path d="M52 60 V44 Q60 38 68 44 V60" />
    </svg>
  );
}

export default function Home({ leaving, hidden, onEnter }) {
  const { lang, setLang, t } = useLang();

  const langs = [...LANGUAGES].sort(
    (a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code),
  );

  return (
    <section
      className={`home${leaving ? " leaving" : ""}${hidden ? " hidden" : ""}`}
      aria-hidden={hidden}
    >
      <div className="home-bg">
        <PanoBackground paused={hidden} />
      </div>
      <div className="home-shade" />
      <div className="home-frame" />

      <div className="home-center">
        <ClockTowerIcon />
        <p className="home-eyebrow">{t("eyebrow")}</p>

        <h1 className="home-title">{t("title")}</h1>
        <p className="home-subtitle">{t("subtitle")}</p>

        <p className="home-description">{t("description")}</p>

        <button
          className="enter-diamond"
          onClick={onEnter}
          disabled={leaving}
          aria-label={t("enter")}
        >
          <span className="enter-diamond-text">{leaving ? t("entering") : t("enter")}</span>
        </button>
      </div>

      <div className="lang-bar" role="group" aria-label={t("language")}>
        {langs.map((l, i) => (
          <React.Fragment key={l.code}>
            {i > 0 && <span className="lang-sep" aria-hidden="true" />}
            <button
              className={`lang-btn${l.code === lang ? " active" : ""}`}
              onClick={() => setLang(l.code)}
              aria-pressed={l.code === lang}
            >
              {l.homeLabel || l.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
