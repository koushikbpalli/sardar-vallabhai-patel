import React, { useEffect, useRef, useState } from "react";
import { RENDERS } from "../data/content.js";
import { pick, useLang } from "../i18n.jsx";

// ---------------------------------------------------------------------------
// A small dependency-free 360° viewer for equirectangular (2:1) panoramas.
// Drag to look around, scroll / pinch to zoom. Uses plain WebGL.
// ---------------------------------------------------------------------------

const VERT = `
attribute vec2 p;
varying vec2 v;
void main() { v = p; gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D tex;
uniform vec2 rot;      // x = yaw, y = pitch (radians)
uniform float fov;     // vertical field of view (radians)
uniform float aspect;
uniform vec2 span;     // how much of the sphere the picture covers (radians)
void main() {
  float t = tan(fov * 0.5);
  vec3 d = normalize(vec3(v.x * t * aspect, v.y * t, -1.0));
  float cp = cos(rot.y), sp = sin(rot.y);
  d = vec3(d.x, d.y * cp - d.z * sp, d.y * sp + d.z * cp);
  float cy = cos(rot.x), sy = sin(rot.x);
  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);
  float lon = atan(d.x, -d.z);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  float u = lon / span.x + 0.5;
  float w = 0.5 - lat / span.y;
  bool outH = span.x < 6.2 && (u < 0.0 || u > 1.0);
  bool outV = span.y < 3.1 && (w < 0.0 || w > 1.0);
  if (outH || outV) {
    gl_FragColor = vec4(0.04, 0.03, 0.02, 1.0);
  } else {
    gl_FragColor = texture2D(tex, vec2(u, w));
  }
}
`;

const DEG = Math.PI / 180;
const MIN_FOV = 30 * DEG;
const MAX_FOV = 100 * DEG;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || "shader error");
  }
  return sh;
}

// hfov: how many degrees the picture spans horizontally (360 = full panorama).
// The vertical coverage is worked out from the picture's proportions.
function PanoViewer({ src, hfov = 360, labels }) {
  const stageRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  useEffect(() => {
    // A fresh canvas for every run of this effect: a WebGL context that was
    // released in a previous run (React StrictMode, or switching panoramas)
    // can never be reused, so the old canvas must not be touched again.
    const stage = stageRef.current;
    const canvas = document.createElement("canvas");
    canvas.className = "pano-canvas";
    stage.prepend(canvas);
    setStatus("loading");

    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) {
      console.error("360 viewer: WebGL is not available");
      canvas.remove();
      setStatus("error");
      return undefined;
    }

    let raf = 0;
    let disposed = false;
    let program;
    let texture;

    const view = { yaw: 0, pitch: 0, fov: 75 * DEG };
    const span = { h: 2 * Math.PI, v: Math.PI };
    let dir = 1; // auto-turn direction for partial pictures
    const drag = { active: false, x: 0, y: 0, lastMove: 0 };
    const pointers = new Map();
    let pinchStart = 0;
    let pinchFov = view.fov;

    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      gl.useProgram(program);
    } catch (err) {
      console.error("360 viewer: shader setup failed", err);
      canvas.remove();
      setStatus("error");
      return undefined;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRot = gl.getUniformLocation(program, "rot");
    const uFov = gl.getUniformLocation(program, "fov");
    const uAspect = gl.getUniformLocation(program, "aspect");
    const uSpan = gl.getUniformLocation(program, "span");

    // ---- load the picture into a texture ----------------------------------
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      const hs = Math.min(360, hfov || 360) * DEG;
      span.h = hs;
      span.v = Math.min(Math.PI, hs / (img.width / img.height));
      let source = img;
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (img.width > max || img.height > max) {
        const k = Math.min(max / img.width, max / img.height);
        const c = document.createElement("canvas");
        c.width = Math.floor(img.width * k);
        c.height = Math.floor(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        source = c;
      }
      try {
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        setStatus("ready");
      } catch (err) {
        console.error("360 viewer: texture upload failed", err);
        texture = undefined;
        setStatus("error");
      }
    };
    img.onerror = () => {
      if (disposed) return;
      console.error("360 viewer: could not load image", src);
      setStatus("error");
    };
    img.src = src;

    // ---- render loop ------------------------------------------------------
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    let last = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!texture) return;

      resize();
      const asp = canvas.width / canvas.height;
      const partialH = span.h < 2 * Math.PI - 0.01;
      const partialV = span.v < Math.PI - 0.01;

      // keep the view inside the picture when it does not cover the full sphere
      let maxFov = MAX_FOV;
      if (partialV) maxFov = Math.min(maxFov, span.v);
      if (partialH) {
        maxFov = Math.min(maxFov, 2 * Math.atan(Math.tan(span.h / 2) / asp));
      }
      view.fov = Math.min(view.fov, Math.max(maxFov, 10 * DEG));
      const pLim = partialV ? Math.max(0, span.v / 2 - view.fov / 2) : 89 * DEG;
      const halfH = Math.atan(Math.tan(view.fov / 2) * asp);
      const yLim = partialH ? Math.max(0, span.h / 2 - halfH) : Infinity;

      // gentle auto-rotation when the visitor is not interacting
      if (!drag.active && now - drag.lastMove > 2500) {
        if (partialH) {
          view.yaw += dir * dt * 0.06; // sweep back and forth across the picture
          if (view.yaw >= yLim) dir = -1;
          if (view.yaw <= -yLim) dir = 1;
        } else {
          view.yaw -= dt * 0.06;
        }
      }
      view.yaw = Math.max(-yLim, Math.min(yLim, view.yaw));
      view.pitch = Math.max(-pLim, Math.min(pLim, view.pitch));

      gl.uniform2f(uRot, view.yaw, view.pitch);
      gl.uniform1f(uFov, view.fov);
      gl.uniform1f(uAspect, asp);
      gl.uniform2f(uSpan, span.h, span.v);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(frame);

    // ---- interaction ------------------------------------------------------
    const clampPitch = () => {
      const lim = 89 * DEG;
      view.pitch = Math.max(-lim, Math.min(lim, view.pitch));
    };
    const clampFov = () => {
      view.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, view.fov));
    };
    const pinchDistance = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const onDown = (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        pinchStart = pinchDistance();
        pinchFov = view.fov;
        drag.active = false;
      } else {
        drag.active = true;
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
      drag.lastMove = performance.now();
    };
    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      drag.lastMove = performance.now();
      if (pointers.size === 2) {
        if (pinchStart > 0) {
          view.fov = pinchFov * (pinchStart / pinchDistance());
          clampFov();
        }
        return;
      }
      if (!drag.active) return;
      const perPixel = view.fov / canvas.clientHeight; // drag follows the finger
      view.yaw += (e.clientX - drag.x) * perPixel;
      view.pitch += (e.clientY - drag.y) * perPixel;
      drag.x = e.clientX;
      drag.y = e.clientY;
      clampPitch();
    };
    const onUp = (e) => {
      pointers.delete(e.pointerId);
      drag.active = false;
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        drag.active = true;
        drag.x = p.x;
        drag.y = p.y;
      }
      drag.lastMove = performance.now();
    };
    const onWheel = (e) => {
      e.preventDefault();
      view.fov *= Math.exp(e.deltaY * 0.001);
      clampFov();
      drag.lastMove = performance.now();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      if (texture) gl.deleteTexture(texture);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [src, hfov]);

  return (
    <div className="pano-stage" ref={stageRef}>
      {status === "loading" && <p className="pano-msg">{labels.loading}</p>}
      {status === "error" && <p className="pano-msg">{labels.error}</p>}
      {status === "ready" && <p className="pano-hint">{labels.hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The "360° Renders" overlay: a grid of panoramas; click one to look around.
// ---------------------------------------------------------------------------
export default function Renders({ onClose }) {
  const { lang, t } = useLang();
  const [index, setIndex] = useState(null);
  const current = index === null ? null : RENDERS[index];

  // Escape: leave the viewer first, then close the overlay.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (index !== null) setIndex(null);
      else onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose]);

  return (
    <div className="overlay" role="dialog" aria-label={t("renders")}>
      <div className="overlay-box">
        <header>
          <h2>
            {current ? pick(current.caption, lang) : t("renders")}
          </h2>
          <div className="renders-actions">
            {current && (
              <button className="renders-back" onClick={() => setIndex(null)}>
                ← {t("rendersBack")}
              </button>
            )}
            <button
              className="overlay-close"
              onClick={onClose}
              aria-label={t("close")}
            >
              ×
            </button>
          </div>
        </header>

        <div className="overlay-body">
          {current ? (
            <PanoViewer
              key={current.src}
              src={current.src}
              hfov={current.hfov}
              labels={{
                loading: t("rendersLoading"),
                error: t("rendersError"),
                hint: t("rendersHint"),
              }}
            />
          ) : (
            <div className="renders-grid">
              {RENDERS.map((r, i) => (
                <button
                  key={r.src}
                  className="render-card"
                  onClick={() => setIndex(i)}
                  aria-label={`${t("rendersOpen")}: ${pick(r.caption, lang)}`}
                >
                  <img
                    src={r.thumbnail || r.src}
                    alt={pick(r.caption, lang)}
                    loading="lazy"
                  />
                  <span className="render-badge">360°</span>
                  <span className="render-caption">
                    {pick(r.caption, lang)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
