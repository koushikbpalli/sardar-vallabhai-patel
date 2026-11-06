import React, { useCallback, useEffect, useRef, useState } from "react";
import Home from "./components/Home.jsx";
import Tour from "./components/Tour.jsx";
import InfoPanel from "./components/InfoPanel.jsx";
import FloatingMenu from "./components/FloatingMenu.jsx";
import ViewControls from "./components/ViewControls.jsx";
import HistoryVideo from "./components/HistoryVideo.jsx";
import Plans from "./components/Plans.jsx";
import Gallery from "./components/Gallery.jsx";
import Renders from "./components/Renders.jsx";
import { START_NODE, getNode } from "./data/nodes.js";
import { pick, useLang } from "./i18n.jsx";

// Send visitors back to the home page after this much inactivity (kiosk use).
const IDLE_RESET_MS = 2 * 60 * 1000;

export default function App() {
  const { lang } = useLang();
  const tourRef = useRef(null);
  const revealTimer = useRef(null);
  const enteredRef = useRef(false);

  const [entered, setEntered] = useState(false); // visitor pressed "Enter" / "Virtual Tour"
  const [tourMounted, setTourMounted] = useState(false); // tour is created on first enter
  const [revealed, setRevealed] = useState(false); // tour is ready, home can fade away
  const [currentNode, setCurrentNode] = useState(START_NODE);
  const [markerId, setMarkerId] = useState(null);
  const [overlay, setOverlay] = useState(null); // null | 'history' | 'plans' | 'gallery' | 'renders'

  const overlayRef = useRef(null);
  overlayRef.current = overlay;
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

  const closeOverlay = useCallback(() => setOverlay(null), []);

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

  const handleEnter = () => {
    enteredRef.current = true;
    setOverlay(null);
    setEntered(true);
    setRevealed(false);
    setMarkerId(null);

    startMusic();

    setTourShown(true);
    setTourMounted(true); // already mounted if the background build finished
    tourRef.current?.reset?.(); // always start at the entrance
    if (tourReadyRef.current) {
      reveal(500);
    } else {
      // Still loading: handleReady reveals as soon as the tour is ready.
      // This is only a safety net in case loading takes very long.
      reveal(10000);
    }
  };

  // "Virtual Tour" menu item: enter the tour, or just close any open page if already in it.
  const handleTour = () => {
    if (enteredRef.current) setOverlay(null);
    else handleEnter();
  };

  const handleHome = useCallback(() => {
    clearTimeout(revealTimer.current);
    enteredRef.current = false;
    setOverlay(null);
    setEntered(false);
    setRevealed(false);
    setMarkerId(null);

    audioRef.current?.pause();
    setMusicOn(false);
  }, []);

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
        onOpen={setOverlay}
      />

      <audio ref={audioRef} src="audio/music.mpeg" loop preload="auto" />

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
