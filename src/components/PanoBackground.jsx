import React, { useEffect, useRef, useState } from "react";

// A non-interactive 360° background: the equirectangular panorama is projected
// onto the screen like a virtual-tour camera (narrow field of view) and slowly
// turns around. Falls back to the CSS cover image if WebGL is unavailable.

const PANORAMA = "/images/home-bg.png";
const FOV_DEG = 72; // vertical field of view: smaller = more zoomed in
const TURN_SECONDS = 140; // time for one full 360° turn
const PITCH_DEG = 0; // look slightly up (+) or down (-)

const VERT = `
attribute vec2 p;
varying vec2 v;
void main() { v = p; gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D tex;
uniform vec2 rot;
uniform float fov;
uniform float aspect;
void main() {
  float t = tan(fov * 0.5);
  vec3 d = normalize(vec3(v.x * t * aspect, v.y * t, -1.0));
  float cp = cos(rot.y), sp = sin(rot.y);
  d = vec3(d.x, d.y * cp - d.z * sp, d.y * sp + d.z * cp);
  float cy = cos(rot.x), sy = sin(rot.x);
  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);
  float lon = atan(d.x, -d.z);
  float lat = asin(clamp(d.y, -1.0, 1.0));
  gl_FragColor = texture2D(tex, vec2(lon / 6.2831853 + 0.5, 0.5 - lat / 3.1415927));
}
`;

const DEG = Math.PI / 180;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || "shader error");
  }
  return sh;
}

// paused : stop drawing (e.g. while the home page is hidden behind the tour)
export default function PanoBackground({ paused = false }) {
  const stageRef = useRef(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Fresh canvas per run (safe under React StrictMode).
    const stage = stageRef.current;
    const canvas = document.createElement("canvas");
    canvas.className = "pano-bg-canvas";
    stage.appendChild(canvas);

    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) {
      canvas.remove();
      return undefined;
    }

    let raf = 0;
    let disposed = false;
    let program;
    let texture;
    let buf;

    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      gl.useProgram(program);
    } catch (err) {
      console.error("Home panorama: shader setup failed", err);
      canvas.remove();
      return undefined;
    }

    buf = gl.createBuffer();
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

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (disposed) return;
      try {
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
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        setReady(true);
      } catch (err) {
        console.error("Home panorama: texture upload failed", err);
        texture = undefined;
      }
    };
    img.onerror = () => console.error("Home panorama: could not load", PANORAMA);
    img.src = PANORAMA;

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let yaw = 0;
    let last = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!texture || pausedRef.current) return;

      if (!reduceMotion) yaw -= (dt * 2 * Math.PI) / TURN_SECONDS;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRot, yaw, PITCH_DEG * DEG);
      gl.uniform1f(uFov, FOV_DEG * DEG);
      gl.uniform1f(uAspect, w / h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (texture) gl.deleteTexture(texture);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
      setReady(false);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={`pano-bg${ready ? " ready" : ""}`}
      aria-hidden="true"
    />
  );
}
