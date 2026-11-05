import React from "react";
import { LANGUAGES, useLang } from "../i18n.jsx";

export default function Home({ leaving, hidden, onEnter }) {
  const { lang, setLang, t } = useLang();

  return (
    <section
      className={`home${leaving ? " leaving" : ""}${hidden ? " hidden" : ""}`}
      aria-hidden={hidden}
    >
      <div className="home-bg" />
      <div className="home-shade" />

      <div className="home-center">
        <h1 className="home-title">{t("title")}</h1>

        <p className="home-description">{t("description")}</p>

        <button className="enter-btn" onClick={onEnter} disabled={leaving}>
          {leaving ? t("entering") : t("enter")}
        </button>
      </div>

      <div className="lang-bar" role="group" aria-label={t("language")}>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            className={`lang-btn${l.code === lang ? " active" : ""}`}
            onClick={() => setLang(l.code)}
            aria-pressed={l.code === lang}
          >
            {l.label}
          </button>
        ))}
      </div>
    </section>
  );
}
