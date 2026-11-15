import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// URLs for each screen, so the browser Back / Forward buttons move between
// screens instead of leaving the app.
//
//   #/                  home page
//   #/tour              virtual tour
//   #/history           History video, opened from the home page
//   #/tour/history      History video, opened from the tour
//   (the same for plans, gallery and renders)
//
// USE_HASH = true  -> URLs look like  https://site/#/tour  and work on any host
//                     with no server setup (recommended).
// USE_HASH = false -> clean URLs like https://site/tour. The host must then
//                     serve index.html for every path (Netlify, Vercel and
//                     GitHub Pages need a small extra setting for this).
// ---------------------------------------------------------------------------
const USE_HASH = true;
const OVERLAYS = ["history", "plans", "gallery", "renders"];
const BASE = (import.meta.env?.BASE_URL || "/").replace(/\/$/, "");

function currentPath() {
  const { hash, pathname } = window.location;
  const raw = USE_HASH
    ? hash.replace(/^#/, "")
    : pathname.startsWith(BASE)
      ? pathname.slice(BASE.length)
      : pathname;
  return raw || "/";
}

export function parseRoute(path) {
  const parts = path.split("?")[0].split("/").filter(Boolean);
  const entered = parts[0] === "tour";
  if (entered) parts.shift();
  if (parts.length === 0) return { entered, overlay: null, valid: true };
  if (parts.length === 1 && OVERLAYS.includes(parts[0])) {
    return { entered, overlay: parts[0], valid: true };
  }
  return { entered: false, overlay: null, valid: false };
}

function toPath({ entered, overlay }) {
  return "/" + [entered && "tour", overlay].filter(Boolean).join("/");
}

const toHref = (route) => (USE_HASH ? "#" + toPath(route) : BASE + toPath(route));

const position = () => {
  const idx = window.history.state?.idx;
  return typeof idx === "number" ? idx : 0;
};

// ---- plain functions (no React), so they can be tested on their own --------

export function readRoute() {
  const r = parseRoute(currentPath());
  return r.valid
    ? { entered: r.entered, overlay: r.overlay }
    : { entered: false, overlay: null };
}

// Called once at start: numbers the first history entry and cleans up an
// unknown URL such as #/abc.
export function initHistory() {
  const parsed = parseRoute(currentPath());
  window.history.replaceState(
    { idx: position() },
    "",
    parsed.valid ? undefined : toHref({ entered: false, overlay: null }),
  );
}

// Go to a screen. push: adds a history entry (Back returns here).
// replace: swaps the current entry. Returns the new route, or null if the
// app is already on that screen.
export function navigate(next, { replace = false } = {}) {
  const target = { entered: !!next.entered, overlay: next.overlay || null };
  const cur = readRoute();
  if (cur.entered === target.entered && cur.overlay === target.overlay) return null;
  if (replace) {
    window.history.replaceState({ idx: position() }, "", toHref(target));
  } else {
    window.history.pushState({ idx: position() + 1 }, "", toHref(target));
  }
  return target;
}

// Close the open popup. If the popup was opened from inside the app, step
// back in history (so Forward re-opens it); otherwise, e.g. after a refresh
// or a typed link, just replace the URL. Returns the new route, or null when
// the route will be updated by the popstate event instead.
export function closeOverlayRoute() {
  const cur = readRoute();
  if (!cur.overlay) return null;
  if (position() > 0) {
    window.history.back();
    return null;
  }
  return navigate({ entered: cur.entered, overlay: null }, { replace: true });
}

// ---- React hook -------------------------------------------------------------

export function useRoute() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    initHistory();
    setRoute(readRoute());
    const onPop = () => {
      const parsed = parseRoute(currentPath());
      if (!parsed.valid) initHistory();
      setRoute(readRoute());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((next, options) => {
    const r = navigate(next, options);
    if (r) setRoute(r);
  }, []);

  const closeOverlay = useCallback(() => {
    const r = closeOverlayRoute();
    if (r) setRoute(r);
  }, []);

  return { route, go, closeOverlay };
}
