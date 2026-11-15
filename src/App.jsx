import React, { useCallback, useEffect, useRef, useState } from "react";
import Home from "./components/Home.jsx";
import Tour from "./components/Tour.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import FloatingMenu from "./components/FloatingMenu.jsx";
import ViewControls from "./components/ViewControls.jsx";
import FullscreenButton from "./components/FullscreenButton.jsx";
import HistoryVideo from "./components/HistoryVideo.jsx";
import Plans from "./components/Plans.jsx";
import Gallery from "./components/Gallery.jsx";
import Renders from "./components/Renders.jsx";
import { START_NODE, getNode } from "./data/nodes.js";
import { pick, useLang } from "./i18n.jsx";
import { useRoute } from "./routes.js";

// Send visitors back to the home page after this much inactivity (kiosk use).
const IDLE_RESET_MS = 2 * 60 * 1000;

export default function App() {
  const { lang } = useLang();
  const tourRef = useRef(null);
  const revealTimer = useRef(null);

  // Which screen we are on comes from the URL (see routes.js), so the browser
  // Back / Forward buttons move between screens instead of leaving the app.
  //   entered : false = home page, true = virtual tour
  //   overlay : null | 'history' | 'plans' | 'gallery' | 'renders'
  const { route, go, closeOverlay } = useRoute();
  const { entered, overlay } = route;
  const routeRef = useRef(route);
  routeRef.current = route;
  const enteredRef = useRef(entered);
  enteredRef.current = entered;
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  const [tourMounted, setTourMounted] = useState(false); // tour is created on first enter
  const [revealed, setRevealed] = useState(false); // tour is ready, home can fade away
  const [currentNode, setCurrentNode] = useState(START_NODE);
  const [markerId, setMarkerId] = useState(null);

  const tourReadyRef = useRef(false);
  const [tourShown, setTourShown] = useState(false); // true after the first "Enter"

  // Build the 3D tour in the background while the home page is showing, so the
  // model is already loaded and drawn once when the visitor presses Enter
  // (loading it on click is what made entering lag).
  // It starts only after the home page has finished loading, so the home page
  // appears first and smoothly.
  useEffect(() => {
    let timerId;
    let idleId;
    const schedule = () => {
      timerId = window.setTimeout(() => {
        if (window.requestIdleCallback) {
          idleId = window.requestIdleCallback(() => setTourMounted(true), {
            timeout: 3000,
          });
        } else {
          setTourMounted(true);
        }
      }, 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      window.clearTimeout(timerId);
      if (idleId && window.cancelIdleCallback) window.cancelIdleCallback(idleId);
    };
  }, []);

  useEffect(() => () => clearTimeout(revealTimer.current), []);

  const reveal = useCallback((delay) => {
    clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setRevealed(true), delay);
  }, []);

  const audioRef = useRef(null);
  const [musicOn, setMusicOn] = useState(false);

  const startMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      await audio.play();
      setMusicOn(true);
    } catch (error) {
      setMusicOn(false);
      console.log("Audio playback was blocked:", error);
    }
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await startMusic();
    } else {
      audio.pause();
      setMusicOn(false);
    }
  };

  // Runs whenever the visitor moves between the home page and the tour: with the
  // buttons, with the browser Back / Forward buttons, or by opening a link.
  useEffect(() => {
    setRevealed(false);
    setMarkerId(null);
    if (entered) {
      setTourShown(true);
      setTourMounted(true); // already mounted if the background build finished
      tourRef.current?.reset?.(); // always start at the entrance
      startMusic(); // may be refused by the browser if there was no click
      if (tourReadyRef.current) {
        reveal(500);
      } else {
        // Still loading: handleReady reveals as soon as the tour is ready.
        // This is only a safety net in case loading takes very long.
        reveal(10000);
      }
    } else {
      clearTimeout(revealTimer.current);
      audioRef.current?.pause();
      setMusicOn(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered]);

  const handleEnter = () => {
    startMusic(); // called here as well: sound is only allowed inside a click
    // From a popup on the home page, swap that history entry instead of adding one.
    go({ entered: true, overlay: null }, { replace: !!routeRef.current.overlay });
  };

  // "Virtual Tour" menu item: enter the tour, or just close any open page if already in it.
  const handleTour = () => {
    if (routeRef.current.entered) closeOverlay();
    else handleEnter();
  };

  const handleHome = useCallback(() => {
    const r = routeRef.current;
    if (!r.entered && r.overlay) closeOverlay(); // popup over the home page
    else go({ entered: false, overlay: null });
  }, [go, closeOverlay]);

  // Open a popup (History, Plans, Gallery, 360° Renders). The first one adds a
  // history entry; switching to another popup replaces it, so one Back press
  // always returns to the page underneath.
  const handleOpen = useCallback(
    (name) => {
      const r = routeRef.current;
      go({ entered: r.entered, overlay: name }, { replace: !!r.overlay });
    },
    [go],
  );

  // Idle timer: any interaction resets it. A playing history video is not interrupted.
  useEffect(() => {
    let timer;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (overlayRef.current === "history") arm();
        else handleHome();
      }, IDLE_RESET_MS);
    };
    const events = ["pointerdown", "pointermove", "wheel", "keydown"];
    events.forEach((e) => window.addEventListener(e, arm));
    arm();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [handleHome]);

  // The tour tells us when the first panorama has loaded.
  const handleReady = useCallback(() => {
    tourReadyRef.current = true;
    if (enteredRef.current) reveal(400);
  }, [reveal]);

  const handleSceneChange = useCallback((id) => {
    setCurrentNode(id);
    setMarkerId(null);
  }, []);

  const node = getNode(currentNode);

  return (
    <div className="app">
      {tourMounted && (
        <div className={`tour-layer${tourShown ? " on" : ""}`}>
          <Tour
            ref={tourRef}
            lang={lang}
            active={entered && !overlay}
            onMarkerSelect={setMarkerId}
            onSceneChange={handleSceneChange}
            onReady={handleReady}
          />
          {node && <div className="scene-title">{pick(node.name, lang)}</div>}
          <InfoPanel markerId={markerId} onClose={() => setMarkerId(null)} />
          <ViewControls
            onZoomIn={() => tourRef.current?.zoomIn()}
            onZoomOut={() => tourRef.current?.zoomOut()}
            onRecenter={() => tourRef.current?.recenter()}
          />
        </div>
      )}

      <Home
        leaving={entered && !revealed}
        hidden={entered && revealed}
        onEnter={handleEnter}
      />

      {overlay === "history" && <HistoryVideo onClose={closeOverlay} />}
      {overlay === "plans" && <Plans onClose={closeOverlay} />}
      {overlay === "gallery" && <Gallery onClose={closeOverlay} />}
      {overlay === "renders" && <Renders onClose={closeOverlay} />}

      <FloatingMenu
        view={entered ? "tour" : "home"}
        overlay={overlay}
        currentNode={currentNode}
        onHome={handleHome}
        onTour={handleTour}
        onOpen={handleOpen}
      />

      {/* Always on screen: home page, tour and every popup. */}
      <FullscreenButton
        place={overlay ? (entered ? "popup-tour" : "popup-home") : entered ? "tour" : "home"}
      />

      {/* Absolute path: a relative one would break on URLs like /tour/gallery. */}
      <audio ref={audioRef} src="/audio/music.mpeg" loop preload="auto" />

      {entered && (
        <button
          className="music-toggle"
          onClick={toggleMusic}
          aria-label={musicOn ? "Turn music off" : "Turn music on"}
          title={musicOn ? "Turn music off" : "Turn music on"}
        >
          {musicOn ? "🔊" : "🔇"}
        </button>
      )}
    </div>
  );
}
