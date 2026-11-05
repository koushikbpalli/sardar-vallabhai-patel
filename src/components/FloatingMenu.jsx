import React, { useEffect, useState } from "react";
import { LANGUAGES, pick, useLang } from "../i18n.jsx";
import { getNode } from "../data/nodes.js";

// ---- icons (simple inline SVG, inherit the button colour) -----------------
const Svg = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ICONS = {
  home: (
    <Svg>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </Svg>
  ),
  tour: (
    <Svg>
      <path d="M12 2.5a4.5 4.5 0 014.5 4.5c0 3.4-4.5 7-4.5 7S7.5 10.4 7.5 7A4.5 4.5 0 0112 2.5z" />
      <circle cx="12" cy="7" r="1.5" />
      <ellipse cx="12" cy="18.5" rx="9" ry="3" />
    </Svg>
  ),
  history: (
    <Svg>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M10 9.5v5l4.5-2.5z" />
    </Svg>
  ),
  plans: (
    <Svg>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </Svg>
  ),
  gallery: (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M3 17l5-4 4 3 3-2 6 4" />
    </Svg>
  ),
  language: (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c3 3.2 3 14.8 0 18" />
      <path d="M12 3c-3 3.2-3 14.8 0 18" />
    </Svg>
  ),
  menu: (
    <Svg>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  ),
  close: (
    <Svg>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
};

const DATE_LOCALES = { en: "en-IN", hi: "hi-IN", te: "te-IN" };
const STEP_DEG = 21; // angle between two items on the ring

function useViewportHeight() {
  const [h, setH] = useState(window.innerHeight);
  useEffect(() => {
    const onResize = () => setH(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return h;
}

// view    : 'home' | 'tour'                 (which page is behind the menu)
// overlay : null | 'history' | 'plans' | 'gallery'
export default function FloatingMenu({
  view,
  overlay,
  currentNode,
  onHome,
  onTour,
  onOpen,
}) {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null); // 'language' | null
  const vh = useViewportHeight();

  const closeAll = () => {
    setPanel(null);
    setOpen(false);
  };

  // Escape closes the panel / menu.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPanel(null);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));
  const openOverlay = (name) => () => {
    closeAll();
    onOpen(name);
  };

  const items = [
    {
      id: "home",
      icon: ICONS.home,
      label: t("home"),
      active: view === "home" && !overlay,
      run: () => {
        closeAll();
        onHome();
      },
    },
    {
      id: "tour",
      icon: ICONS.tour,
      label: t("virtualTour"),
      active: view === "tour" && !overlay,
      run: () => {
        closeAll();
        onTour();
      },
    },
    {
      id: "history",
      icon: ICONS.history,
      label: t("history"),
      active: overlay === "history",
      run: openOverlay("history"),
    },
    // {
    //   id: "plans",
    //   icon: ICONS.plans,
    //   label: t("plans"),
    //   active: overlay === "plans",
    //   run: openOverlay("plans"),
    // },
    {
      id: "gallery",
      icon: ICONS.gallery,
      label: t("gallery"),
      active: overlay === "gallery",
      run: openOverlay("gallery"),
    },
    {
      id: "language",
      icon: ICONS.language,
      label: t("language"),
      active: panel === "language",
      run: () => togglePanel("language"),
    },
  ];

  // Sizes scale with the window height so the menu fits on any monitor.
  const rImg = Math.round(Math.min(Math.max(vh * 0.34, 190), 330)); // image circle radius
  const rRing = rImg + 66; // radius of the ring the items sit on
  const itemSize = Math.round(Math.min(Math.max(vh * 0.095, 58), 80));

  // The circles are centred on the left edge of the screen; items sit on the
  // right half of the ring, spread evenly around the vertical middle.
  const position = (index) => {
    const angle = ((index - (items.length - 1) / 2) * STEP_DEG * Math.PI) / 180;
    return { x: Math.cos(angle) * rRing, y: Math.sin(angle) * rRing };
  };

  // The circle shows the current tour spot, or the home picture otherwise.
  const node = view === "tour" ? getNode(currentNode) : null;
  const heading = overlay
    ? t(overlay)
    : node
      ? pick(node.name, lang)
      : view === "tour"
        ? t("virtualTour")
        : t("home");
  const dateText = new Date().toLocaleDateString(
    DATE_LOCALES[lang] || "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  const panelTitle = panel ? t(panel) : "";
  const panelLeft = rRing + itemSize / 2 + 210;

  return (
    <>
      <div
        className={`radial${open ? " open" : ""}`}
        style={{
          "--rimg": `${rImg}px`,
          "--rring": `${rRing}px`,
          "--item": `${itemSize}px`,
        }}
      >
        <div className="radial-backdrop" onClick={closeAll} />

        <div className="radial-ring" style={{ "--rad": `${rRing}px` }} />
        <div
          className="radial-ring inner"
          style={{ "--rad": `${rImg + 10}px` }}
        />

        <div
          className="radial-image"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.65)), url(${node?.thumbnail ?? "/images/home-bg.png"})`,
          }}
        >
          <div className="radial-text">
            <p className="small">{t("youAreAt")}</p>
            <h2 className="big">{heading}</h2>
            <div className="rule" />
            <p className="date">{dateText}</p>
          </div>
        </div>

        <nav aria-label={t("menu")}>
          {items.map((item, i) => {
            const { x, y } = position(i);
            return (
              <button
                key={item.id}
                className={`fab-item${item.active ? " active" : ""}`}
                style={{
                  "--x": `${x}px`,
                  "--y": `${y}px`,
                  "--delay": `${80 + i * 55}ms`,
                }}
                onClick={item.run}
                aria-label={item.label}
                tabIndex={open ? 0 : -1}
              >
                {item.icon}
                <span className="fab-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {panel === "language" && (
        <section
          className="menu-panel radial-panel"
          role="dialog"
          aria-label={panelTitle}
          style={{
            left: panelLeft,
            width: `min(320px, calc(100vw - ${panelLeft + 24}px))`,
          }}
        >
          <header>
            <h3>{panelTitle}</h3>
            <button
              className="panel-close"
              onClick={() => setPanel(null)}
              aria-label={t("close")}
            >
              ×
            </button>
          </header>

          <div className="panel-langs">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={l.code === lang ? "active" : ""}
                onClick={() => setLang(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <button
        className="fab"
        onClick={() => {
          if (open) setPanel(null);
          setOpen((o) => !o);
        }}
        aria-label={t("menu")}
        aria-expanded={open}
      >
        {open ? ICONS.close : ICONS.menu}
      </button>
    </>
  );
}
