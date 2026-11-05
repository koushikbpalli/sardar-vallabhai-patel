import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { nodes, START_NODE, getNode } from "../data/nodes.js";
import { pick } from "../i18n.jsx";

// ---- settings --------------------------------------------------------------
const MODEL_URL = "/models/market.glb"; // put your exported model in public/models/
const MODEL_SCALE = 1; // change if your model is exported in the wrong units
const EYE_HEIGHT = 1.7; // metres above the floor
const MOVE_SPEED = 4; // metres per second (W/A/S/D, arrow keys)
const TURN_SPEED = 1.6; // radians per second (left/right arrows)
const FOV_DEFAULT = 68;
const FOV_MIN = 25;
const FOV_MAX = 90;
const ZOOM_STEP = 12; // degrees of field of view per button press
const PIN_RANGE = 25; // stall pins show within this distance (m)
const ARROW_RANGE = 20; // walking arrows show within this distance (m)
const DEG = Math.PI / 180;

const easeInOut = (k) =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

// ---- Poorna Market fallback scene ------------------------------------------
// Mirrors the illustrative market layout in poorna_market_walkthrough_arrows.html.
function buildTempStreet() {
  const group = new THREE.Group();
  const meshes = [];
  const groundMeshes = [];
  const roofLights = [];
  const festoonLights = [];
  const matCache = new Map();
  const mat = (color, roughness = 0.82) => {
    const key = `${color}_${roughness}`;
    if (!matCache.has(key))
      matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness }));
    return matCache.get(key);
  };
  const add = (mesh) => {
    group.add(mesh);
    meshes.push(mesh);
    return mesh;
  };
  const box = (w, h, d, x, y, z, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    return add(m);
  };
  const detailBox = (parent, w, h, d, x, y, z, color, roughness = 0.82) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat(color, roughness),
    );
    m.position.set(x, y, z);
    parent.add(m);
    meshes.push(m);
    return m;
  };
  const cylinder = (parent, rt, rb, h, x, y, z, color, segments = 12) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rt, rb, h, segments),
      mat(color),
    );
    m.position.set(x, y, z);
    parent.add(m);
    meshes.push(m);
    return m;
  };
  const sphere = (parent, r, x, y, z, color) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(color));
    m.position.set(x, y, z);
    parent.add(m);
    meshes.push(m);
    return m;
  };
  const makeSign = (parent, label, x, y, z, w = 3.8, side = "left") => {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 160;
    const q = c.getContext("2d");
    q.fillStyle = "#f2dcb5";
    q.fillRect(0, 0, 768, 160);
    q.strokeStyle = "#765638";
    q.lineWidth = 10;
    q.strokeRect(5, 5, 758, 150);
    q.fillStyle = "#3c2c20";
    q.font = "bold 62px Arial";
    q.textAlign = "center";
    q.textBaseline = "middle";
    q.fillText(label.toUpperCase(), 384, 82, 720);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.8),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    m.rotation.y = side === "left" ? Math.PI / 2 : -Math.PI / 2;
    m.position.set(x, y, z);
    parent.add(m);
    meshes.push(m);
  };
  const crate = (x, z, color = 0x9b7048) => {
    detailBox(group, 0.8, 0.55, 0.8, x, 0.3, z, color);
    detailBox(group, 0.82, 0.07, 0.08, x, 0.48, z - 0.36, 0x6d4d32);
  };

  // Street, paved shopfront walkways and two long rows of market stalls.
  groundMeshes.push(box(13, 0.12, 75, 0, -0.08, -27, 0x9c9a96));
  for (const side of [-1, 1]) {
    const pavement = new THREE.Mesh(
      new THREE.BoxGeometry(2.25, 0.1, 75),
      mat(0xb9b2a5, 0.95),
    );
    pavement.position.set(side * 5.35, 0.015, -27);
    add(pavement);
    groundMeshes.push(pavement);
    for (let z = -63; z <= 9; z += 2.4)
      box(2.2, 0.012, 0.025, side * 5.35, 0.073, z, 0x817d75);
  }
  const stallZs = [];
  for (let z = -62; z < 9; z += 8) {
    stallZs.push(z);
    box(0.18, 2.8, 6, -10.91, 1.45, z, 0x287e79);
    box(4.8, 2.8, 0.18, -8.6, 1.45, z - 2.91, 0x348f88);
    box(4.8, 2.8, 0.18, -8.6, 1.45, z + 2.91, 0x348f88);
    box(4.8, 0.18, 6, -8.6, 2.95, z, 0xeeeeea);
    box(0.18, 2.8, 6, 10.91, 1.45, z, 0xa96d16);
    box(4.8, 2.8, 0.18, 8.6, 1.45, z - 2.91, 0xb87b1e);
    box(4.8, 2.8, 0.18, 8.6, 1.45, z + 2.91, 0xb87b1e);
    box(4.8, 0.18, 6, 8.6, 2.95, z, 0xe9e5df);
  }
  const leftKinds = [
    ["VEGETABLES", [0x5b9d37, 0x78ad42, 0xd88b28, 0xc74432, 0xe5bd43]],
    ["FRESH FRUITS", [0xe77b22, 0xc83e2e, 0xe9c13c, 0x8cbd42, 0x9c4d9c]],
    ["FLOWER SHOP", [0xe66a91, 0xf2c84b, 0xb36ab0, 0xffffff, 0xe58a45]],
    ["GREENS & HERBS", [0x477d3b, 0x689b43, 0x8ab65b, 0x3d713b, 0x9abf55]],
    ["FISH MARKET", [0x9eb7bf, 0x6d9ca9, 0xc5d2d4, 0x7b9aa2, 0xb4c6c9]],
  ];
  const rightKinds = [
    ["MEAT SHOP", [0xc87969, 0xb94e43, 0xd88c79]],
    ["CHICKEN & POULTRY", [0xd49b78, 0xc87969, 0xe1b89a]],
    ["DAIRY & EGGS", [0xf2e8cf, 0xe3d8bd, 0xd9c9a6]],
    ["SPICES & GROCERIES", [0xd5a044, 0x9f4e2f, 0x6c9b4c, 0xc7a76a]],
  ];
  stallZs.forEach((z, i) => {
    const L = leftKinds[i % leftKinds.length],
      R = rightKinds[i % rightKinds.length];
    detailBox(group, 1.05, 0.95, 4.65, -7.45, 0.62, z, 0x76543a);
    detailBox(group, 0.12, 0.12, 4.7, -7.45, 1.13, z, 0x4b3325);
    detailBox(group, 0.18, 1.45, 4.5, -9.25, 1.05, z, 0x9a7047);
    detailBox(group, 3.1, 0.12, 0.55, -7.55, 1.75, z - 2.05, 0x8b6748);
    detailBox(group, 3.1, 0.12, 0.55, -7.55, 2.15, z - 2.05, 0x8b6748);
    detailBox(group, 4.25, 0.12, 1.25, -8.55, 2.55, z, 0xc66d42);
    makeSign(group, L[0], -6.12, 2.48, z, 3.8, "left");
    crate(-9.1, z + 1.65);
    crate(-8.15, z + 1.65, 0x85613f);
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 5; col++) {
        const color = L[1][(col + row + i) % L[1].length],
          x = -7.85 + col * 0.19,
          zz = z - 0.95 + row * 1.9;
        if (i % 5 === 2) {
          cylinder(group, 0.035, 0.045, 0.38, x, 1.35, zz, 0x43804a, 8);
          sphere(group, 0.17, x, 1.58, zz, color);
        } else {
          sphere(group, 0.21, x, 1.3, zz, color);
          sphere(
            group,
            0.17,
            x - 0.27,
            1.32,
            zz + 0.35,
            L[1][(col + row + 2) % L[1].length],
          );
        }
      }
    detailBox(group, 1.05, 0.95, 4.65, 7.45, 0.62, z, 0x76513d);
    detailBox(group, 0.12, 0.12, 4.7, 7.45, 1.13, z, 0x4b3325);
    detailBox(group, 0.18, 1.45, 4.5, 9.25, 1.05, z, 0x98714f);
    detailBox(group, 3, 0.12, 0.55, 7.55, 1.75, z - 2.05, 0x8b6748);
    detailBox(group, 3, 0.12, 0.55, 7.55, 2.15, z - 2.05, 0x8b6748);
    detailBox(group, 4.25, 0.12, 1.25, 8.55, 2.55, z, 0x3f8b83);
    makeSign(group, R[0], 6.12, 2.48, z, 3.8, "right");
    crate(8.15, z + 1.65);
    crate(9.1, z + 1.65, 0x85613f);
    for (let col = 0; col < 5; col++) {
      const zz = z - 1.55 + col * 0.75,
        color = R[1][col % R[1].length];
      detailBox(group, 0.55, 0.16, 0.62, 7.2, 1.22, zz, color);
    }
  });

  // Canopy-mounted shop fixtures.
  for (const z of stallZs)
    for (const side of [-1, 1])
      for (const dz of [-2, 0, 2]) {
        const x = side * 8.55,
          zz = z + dz;
        detailBox(group, 0.58, 0.08, 0.58, x, 2.86, zz, 0x554f46, 0.55);
        cylinder(group, 0.045, 0.045, 0.28, x, 2.68, zz, 0x62594d, 12);
        cylinder(group, 0.25, 0.34, 0.16, x, 2.42, zz, 0x81786a, 20);
        const diffuser = new THREE.Mesh(
          new THREE.CircleGeometry(0.205, 20),
          new THREE.MeshStandardMaterial({
            color: 0xffe0a1,
            emissive: 0xffb84d,
            emissiveIntensity: 0,
            side: THREE.DoubleSide,
            roughness: 0.4,
          }),
        );
        diffuser.rotation.x = -Math.PI / 2;
        diffuser.position.set(x, 2.33, zz);
        add(diffuser);
        roofLights.push(diffuser);
      }
  // Central produce tables.
  for (let j = 0; j < 6; j++) {
    const z = -54 + j * 10;
    detailBox(group, 1.7, 0.82, 2.8, 0, 0.42, z, 0x8b6748);
    detailBox(group, 1.85, 0.1, 2.95, 0, 0.88, z, 0x5b422f);
    for (let k = 0; k < 6; k++)
      sphere(
        group,
        0.2,
        -0.55 + (k % 3) * 0.5,
        1.12,
        z - 0.7 + Math.floor(k / 3) * 0.9,
        [0x5b9d37, 0xd88b28, 0xc74432, 0xe5bd43, 0x78ad42, 0xe77b22][k],
      );
    crate(-1.45, z + 1.2);
    crate(1.45, z + 1.2, 0x85613f);
  }
  // Neighbourhood buildings and shopfronts on both sides.
  const makeContextBuilding = (
    x,
    z,
    w,
    d,
    h,
    wall,
    accent,
    name = "LOCAL SHOP",
  ) => {
    detailBox(group, w, h, d, x, h / 2, z, wall);
    detailBox(group, w + 0.25, 0.28, d + 0.25, x, h + 0.14, z, accent);
    const fx = x < 0 ? x + w / 2 + 0.02 : x - w / 2 - 0.02;
    for (let k = -1; k <= 1; k++) {
      detailBox(
        group,
        0.12,
        1.35,
        1.15,
        fx,
        h * 0.68,
        z + k * d * 0.27,
        0x83b6c2,
      );
      detailBox(
        group,
        0.16,
        0.12,
        1.22,
        fx,
        h * 0.68 + 0.72,
        z + k * d * 0.27,
        0xf0dfbd,
      );
    }
    detailBox(group, 0.2, 2, 2, fx, h * 0.19, z, 0x4a392d);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 120;
    const q = c.getContext("2d");
    q.fillStyle = "#f0d7a7";
    q.fillRect(0, 0, 512, 120);
    q.fillStyle = "#3d2c20";
    q.font = "bold 42px Arial";
    q.textAlign = "center";
    q.textBaseline = "middle";
    q.fillText(name, 256, 62, 490);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 0.42),
      new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide }),
    );
    sign.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    sign.position.set(fx + (x < 0 ? 0.33 : -0.33), h * 0.43, z);
    group.add(sign);
    meshes.push(sign);
  };
  const names = [
    "GENERAL STORE",
    "TEA & TIFFIN",
    "TAILORING",
    "HARDWARE",
    "KIRANA STORE",
    "FLOWER DEPOT",
    "FISH & SEAFOOD",
    "SNACKS",
  ];
  for (let j = 0; j < 12; j++) {
    const z = -62 + j * 7.9;
    makeContextBuilding(
      -19.2,
      z,
      6.4,
      7,
      5.8 + (j % 4) * 0.9,
      [0xd7c3a1, 0xc9b6a0, 0xe0d2b9, 0xd9c9ad][j % 4],
      0x8c7155,
      names[j % 8],
    );
    makeContextBuilding(
      19.2,
      z,
      6.4,
      7,
      6.2 + ((j + 2) % 4) * 0.8,
      [0xd7bda0, 0xc8b2a0, 0xe2d0b7, 0xd4c2a7][j % 4],
      0x87694f,
      names[(j + 3) % 8],
    );
  }
  for (let j = 0; j < 8; j++) {
    const z = -57 + j * 12.5;
    makeContextBuilding(
      -27.5,
      z,
      7,
      9,
      8.5 + (j % 3),
      0xcbbba6,
      0x806c55,
      "RESIDENCE",
    );
    makeContextBuilding(
      27.5,
      z,
      7,
      9,
      8 + ((j + 1) % 3),
      0xd8c8b0,
      0x806c55,
      "COMMERCIAL",
    );
  }
  // Heritage arches across the street.
  const addArch = (z) => {
    const span = 13.2,
      opening = 11.8,
      spring = 3.35,
      outer = opening / 2 + 0.42,
      inner = opening / 2,
      depth = 0.48;
    const sh = new THREE.Shape();
    sh.moveTo(-outer, 0);
    sh.lineTo(-outer, spring);
    sh.absarc(0, spring, outer, Math.PI, 0, true);
    sh.lineTo(outer, 0);
    sh.lineTo(inner, 0);
    sh.lineTo(inner, spring);
    sh.absarc(0, spring, inner, 0, Math.PI, false);
    sh.lineTo(-inner, 0);
    sh.closePath();
    const ring = new THREE.Mesh(
      new THREE.ExtrudeGeometry(sh, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 2,
        curveSegments: 36,
      }),
      mat(0xc8b79c, 0.88),
    );
    ring.position.set(0, 0, z - depth / 2);
    add(ring);
    for (const x of [-span / 2, span / 2]) {
      detailBox(group, 0.72, 3.45, 0.72, x, 1.725, z, 0xb5a184);
      detailBox(group, 0.94, 0.22, 0.94, x, 3.42, z, 0xd8c8ae);
    }
  };
  [-58, -46, -34, -22, -10, 10].forEach(addArch);
  // Festoon cable runs and warm bulbs.
  for (let z = -55; z <= 7; z += 4.65) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(
        new THREE.Vector3(
          -6.35 + 12.7 * t,
          6.15 - 0.62 * Math.sin(Math.PI * t),
          z,
        ),
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, 0.018, 6, false),
        new THREE.MeshStandardMaterial({ color: 0x28231e, roughness: 0.9 }),
      ),
    );
    for (let i = 0; i <= 12; i++) {
      const t = (i + 0.35) / 12.7,
        x = -6.35 + 12.7 * t,
        y = 6.15 - 0.62 * Math.sin(Math.PI * t);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.105, 12, 10),
        new THREE.MeshStandardMaterial({
          color: 0xffd28a,
          emissive: 0xffa52f,
          emissiveIntensity: 0,
          roughness: 0.28,
        }),
      );
      bulb.position.set(x, y - 0.215, z);
      add(bulb);
      festoonLights.push(bulb);
    }
  }
  // Open entrance gateway: the centre remains unobstructed.
  const gateZ = -2,
    gateW = 7.2,
    gateH = 7.2,
    openingW = 4.2,
    springH = 3.7,
    depth = 1,
    pierW = (gateW - openingW) / 2;
  const stone = mat(0xb9a58b, 0.9),
    trim = mat(0xd3c2a5, 0.82);
  const lp = new THREE.Mesh(new THREE.BoxGeometry(pierW, gateH, depth), stone);
  lp.position.set(-(openingW / 2 + pierW / 2), gateH / 2, gateZ);
  add(lp);
  const rp = lp.clone();
  rp.position.x = openingW / 2 + pierW / 2;
  add(rp);
  const outer = openingW / 2 + 0.38,
    inner = openingW / 2,
    shape = new THREE.Shape();
  shape.moveTo(-outer, 0);
  shape.lineTo(-outer, springH);
  shape.absarc(0, springH, outer, Math.PI, 0, true);
  shape.lineTo(outer, 0);
  shape.lineTo(inner, 0);
  shape.lineTo(inner, springH);
  shape.absarc(0, springH, inner, 0, Math.PI, false);
  shape.lineTo(-inner, 0);
  shape.closePath();
  const gateArch = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
      curveSegments: 36,
    }),
    trim,
  );
  gateArch.position.set(0, 0, gateZ - depth / 2);
  add(gateArch);
  box(gateW + 0.45, 0.32, depth + 0.25, 0, gateH - 0.16, gateZ, 0x8d7961);
  box(gateW + 0.7, 0.18, depth + 0.4, 0, gateH + 0.12, gateZ, 0xd3c2a5);
  box(
    openingW + 0.5,
    0.5,
    0.12,
    0,
    gateH - 0.72,
    gateZ - depth / 2 - 0.08,
    0x9b8668,
  );
  return { group, meshes, roofLights, festoonLights, groundMeshes };
}

// ---- component -------------------------------------------------------------
// Same interface as the old panorama Tour, so App.jsx needs no changes.
const Tour = forwardRef(function Tour(
  { lang, onMarkerSelect, onSceneChange, onReady },
  ref,
) {
  const containerRef = useRef(null);
  const apiRef = useRef({});
  const labelsRef = useRef({ pins: [], arrows: [] });

  const callbacks = useRef({});
  callbacks.current = { onMarkerSelect, onSceneChange, onReady };
  const langRef = useRef(lang);
  langRef.current = lang;
  const [timeOfDay, setTimeOfDay] = useState("day");
  const [walkMode, setWalkMode] = useState(true);
  const walkModeRef = useRef(true);
  const [selectedShop, setSelectedShop] = useState(null);

  useImperativeHandle(
    ref,
    () => ({
      goTo: (id) => apiRef.current.goTo?.(id),
      zoomIn: () => apiRef.current.zoomBy?.(-ZOOM_STEP),
      zoomOut: () => apiRef.current.zoomBy?.(ZOOM_STEP),
      recenter: () => apiRef.current.recenter?.(),
    }),
    [],
  );

  // Language change: only relabel the tooltips, the 3D scene stays untouched.
  useEffect(() => {
    labelsRef.current.pins.forEach(({ el, marker }) => {
      el.title = pick(marker.title, lang);
    });
    labelsRef.current.arrows.forEach(({ el, nodeId }) => {
      const target = getNode(nodeId);
      if (target) el.title = pick(target.name, lang);
    });
  }, [lang]);

  useEffect(() => {
    const container = containerRef.current;
    let disposed = false;

    // Fall back to the window size if the container has no size yet.
    const getSize = () => ({
      w: container.clientWidth || window.innerWidth,
      h: container.clientHeight || window.innerHeight,
    });
    const initial = getSize();

    // --- renderers, scene, camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb9d0df);
    scene.fog = new THREE.Fog(0xb9d0df, 55, 180);

    const camera = new THREE.PerspectiveCamera(
      FOV_DEFAULT,
      initial.w / initial.h,
      0.1,
      500,
    );
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initial.w, initial.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";
    container.appendChild(renderer.domElement);
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enabled = false;
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.07;
    orbitControls.maxPolarAngle = Math.PI * 0.49;
    orbitControls.minDistance = 1.2;
    orbitControls.maxDistance = 42;
    orbitControls.target.set(0, 2.2, -18);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(initial.w, initial.h);
    Object.assign(labelRenderer.domElement.style, {
      position: "absolute",
      top: "0",
      left: "0",
      pointerEvents: "none",
    });
    container.appendChild(labelRenderer.domElement);

    scene.add(new THREE.HemisphereLight(0xeaf5ff, 0x64533d, 2.0));
    const sun = new THREE.DirectionalLight(0xffe2b4, 2.2);
    sun.position.set(-12, 24, 8);
    scene.add(sun);
    const nightFill = new THREE.AmbientLight(0x8ba7d8, 0);
    scene.add(nightFill);
    let roofLights = [];
    let festoonLights = [];
    let activeTime = "day";
    const applyTimeOfDay = (mode) => {
      const presets = {
        day: {
          sky: 0xb9d0df,
          fog: 0xb9d0df,
          hemi: 2,
          sun: 2.2,
          sunColor: 0xffe2b4,
          fill: 0,
          exposure: 1,
        },
        evening: {
          sky: 0xd58d69,
          fog: 0xd58d69,
          hemi: 1.05,
          sun: 1.15,
          sunColor: 0xffa15c,
          fill: 0.12,
          exposure: 1.05,
        },
        night: {
          sky: 0x101a2b,
          fog: 0x172337,
          hemi: 0.42,
          sun: 0.12,
          sunColor: 0x9bb8ff,
          fill: 0.42,
          exposure: 1.25,
        },
      };
      const p = presets[mode] || presets.day;
      activeTime = mode;
      scene.background.setHex(p.sky);
      scene.fog.color.setHex(p.fog);
      scene.children.find((o) => o.isHemisphereLight).intensity = p.hemi;
      sun.intensity = p.sun;
      sun.color.setHex(p.sunColor);
      nightFill.intensity = p.fill;
      renderer.toneMappingExposure = p.exposure;
      roofLights.forEach((m) => {
        m.material.emissiveIntensity =
          mode === "day" ? 0 : mode === "evening" ? 0.65 : 1.8;
      });
      festoonLights.forEach((m) => {
        m.material.emissiveIntensity =
          mode === "day" ? 0 : mode === "evening" ? 0.85 : 2.1;
      });
    };

    // --- view state
    let yaw = 0; // radians, 0 = looking towards -Z, positive = turn left
    let pitch = 0;
    let currentNodeId = START_NODE;
    let floorMeshes = [];
    const tweens = [];

    const applyView = () => {
      camera.rotation.set(pitch, yaw, 0);
    };

    const setPose = (pose) => {
      camera.position.set(...pose.position);
      yaw = (pose.yaw || 0) * DEG;
      pitch = (pose.pitch || 0) * DEG;
      applyView();
    };

    const addTween = (dur, update, done) => {
      tweens.push({ t: 0, dur, update, done });
    };

    const nodeYaw = (id) => (getNode(id)?.camera.yaw || 0) * DEG;

    const flyTo = (pose, ms, done) => {
      tweens.length = 0;
      const from = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        yaw,
        pitch,
        fov: camera.fov,
      };
      // turn the short way round
      const d =
        ((((pose.yaw - yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI)) -
        Math.PI;
      const to = { ...pose, yaw: yaw + d };
      addTween(
        ms / 1000,
        (k) => {
          camera.position.set(
            from.x + (to.x - from.x) * k,
            from.y + (to.y - from.y) * k,
            from.z + (to.z - from.z) * k,
          );
          yaw = from.yaw + (to.yaw - from.yaw) * k;
          pitch = from.pitch + (to.pitch - from.pitch) * k;
          if (to.fov != null) {
            camera.fov = from.fov + (to.fov - from.fov) * k;
            camera.updateProjectionMatrix();
          }
          applyView();
        },
        done,
      );
    };

    const setCurrent = (id) => {
      if (id === currentNodeId) return;
      currentNodeId = id;
      callbacks.current.onSceneChange?.(id);
    };

    // --- API used by App / ViewControls
    apiRef.current = {
      goTo(id) {
        const n = getNode(id);
        if (!n) return;
        const [x, y, z] = n.camera.position;
        container.classList.add("walking");
        flyTo(
          {
            x,
            y,
            z,
            yaw: (n.camera.yaw || 0) * DEG,
            pitch: (n.camera.pitch || 0) * DEG,
            fov: FOV_DEFAULT,
          },
          1800,
          () => {
            container.classList.remove("walking");
            setCurrent(id);
          },
        );
      },
      zoomBy(delta) {
        const from = camera.fov;
        const to = Math.min(FOV_MAX, Math.max(FOV_MIN, from + delta));
        addTween(0.4, (k) => {
          camera.fov = from + (to - from) * k;
          camera.updateProjectionMatrix();
        });
      },
      setTimeOfDay(mode) {
        applyTimeOfDay(mode);
      },
      setWalkMode(on) {
        walkModeRef.current = !!on;
        orbitControls.enabled = !on;
        groundArrows.forEach((arrow) => {
          arrow.visible = !!on;
        });
        if (!on) {
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          direction.y = 0;
          direction.normalize();
          const px = camera.position.x,
            pz = camera.position.z;
          camera.position.set(px - direction.x * 10, 7, pz - direction.z * 10);
          orbitControls.target.set(
            px + direction.x * 10,
            1.5,
            pz + direction.z * 10,
          );
        } else {
          camera.position.y = EYE_HEIGHT;
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          direction.y = 0;
          direction.normalize();
          yaw = Math.atan2(-direction.x, -direction.z);
          pitch = 0;
          applyView();
        }
      },
      recenter() {
        flyTo(
          {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
            yaw: nodeYaw(currentNodeId),
            pitch: (getNode(currentNodeId)?.camera.pitch || 0) * DEG,
            fov: FOV_DEFAULT,
          },
          700,
        );
      },
    };

    // --- pins (stall info) and arrows (walk to another spot)
    labelsRef.current = { pins: [], arrows: [] };
    const labelObjects = [];

    nodes.forEach((n) => {
      (n.markers || []).forEach((m) => {
        const el = document.createElement("div");
        el.className = "stall-pin";
        el.textContent = "🛒";
        el.title = pick(m.title, langRef.current);
        el.style.pointerEvents = "auto";
        el.style.cursor = "pointer";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          callbacks.current.onMarkerSelect?.(m.id);
        });
        const obj = new CSS2DObject(el);
        obj.position.set(...m.position);
        scene.add(obj);
        labelObjects.push({ obj, range: PIN_RANGE });
        labelsRef.current.pins.push({ el, marker: m });
      });

      (n.links || []).forEach((l) => {
        const el = document.createElement("button");
        // el.className = "nav-pin";
        el.type = "button";
        // el.textContent = "▲";
        const target = getNode(l.nodeId);
        el.title = target ? pick(target.name, langRef.current) : "";
        el.style.pointerEvents = "auto";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          callbacks.current.onMarkerSelect?.(null);
          apiRef.current.goTo(l.nodeId);
        });
        const obj = new CSS2DObject(el);
        obj.position.set(...l.position);
        scene.add(obj);
        labelObjects.push({ obj, range: ARROW_RANGE });
        labelsRef.current.arrows.push({ el, nodeId: l.nodeId });
      });
    });

    // Eight Street-View style ground arrows, positioned around the visitor.
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 0.95);
    arrowShape.lineTo(0.85, 0.05);
    arrowShape.lineTo(0.45, 0.05);
    arrowShape.lineTo(0, 0.5);
    arrowShape.lineTo(-0.45, 0.05);
    arrowShape.lineTo(-0.85, 0.05);
    arrowShape.closePath();
    const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
    arrowGeometry.rotateX(-Math.PI / 2);
    arrowGeometry.scale(1.5, 1, 1.5);
    const groundArrows = [];
    for (let k = 0; k < 8; k++) {
      const arrow = new THREE.Mesh(
        arrowGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.76,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      arrow.userData.k = k;
      arrow.renderOrder = 5;
      arrow.visible = false;
      scene.add(arrow);
      groundArrows.push(arrow);
    }
    const clampX = (v) => THREE.MathUtils.clamp(v, -12.2, 12.2);
    const clampZ = (v) => THREE.MathUtils.clamp(v, -66, 13);
    const arrowDirection = (k) => {
      const a = yaw + (k * Math.PI) / 4;
      return { a, x: -Math.sin(a), z: -Math.cos(a) };
    };
    const updateWalkArrows = () =>
      groundArrows.forEach((arrow, k) => {
        const d = arrowDirection(k);
        arrow.position.set(
          camera.position.x + d.x * 4.2,
          0.16,
          camera.position.z + d.z * 4.2,
        );
        arrow.rotation.y = d.a;
        const tx = camera.position.x + d.x * 5.5,
          tz = camera.position.z + d.z * 5.5;
        arrow.visible =
          walkModeRef.current &&
          Math.abs(clampX(tx) - tx) < 1 &&
          Math.abs(clampZ(tz) - tz) < 1;
      });

    // --- input: drag to look, wheel to zoom, tap floor/arrows to walk, keys to move
    const canvas = renderer.domElement;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    const raycaster = new THREE.Raycaster();

    const onPointerDown = (e) => {
      if (!walkModeRef.current) return;
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onPointerMove = (e) => {
      if (!walkModeRef.current || !dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 5) tweens.length = 0;
      const k = 0.0035 * (camera.fov / FOV_DEFAULT);
      yaw += dx * k;
      pitch = Math.max(-80 * DEG, Math.min(80 * DEG, pitch + dy * k));
      applyView();
    };
    const onPointerUp = (e) => {
      if (!walkModeRef.current || !dragging) return;
      dragging = false;
      canvas.style.cursor = "grab";
      if (moved > 5) return;

      // a tap: close the info card, and walk to the tapped spot if it is floor
      callbacks.current.onMarkerSelect?.(null);
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const arrowHit = raycaster.intersectObjects(
        groundArrows.filter((a) => a.visible),
        false,
      )[0];
      if (arrowHit) {
        const d = arrowDirection(arrowHit.object.userData.k);
        flyTo(
          {
            x: clampX(camera.position.x + d.x * 5.5),
            y: EYE_HEIGHT,
            z: clampZ(camera.position.z + d.z * 5.5),
            yaw,
            pitch,
          },
          700,
        );
        return;
      }
      const hit = raycaster.intersectObjects(floorMeshes, false)[0];
      if (!hit || !hit.face || hit.distance > 40) return;
      const normal = hit.face.normal
        .clone()
        .transformDirection(hit.object.matrixWorld);
      if (normal.y < 0.7) return; // wall or ceiling: do not walk through it
      flyTo(
        {
          x: hit.point.x,
          y: hit.point.y + EYE_HEIGHT,
          z: hit.point.z,
          yaw,
          pitch,
        },
        900,
      );
    };
    const onWheel = (e) => {
      e.preventDefault();
      camera.fov = Math.min(
        FOV_MAX,
        Math.max(FOV_MIN, camera.fov + Math.sign(e.deltaY) * 3),
      );
      camera.updateProjectionMatrix();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const keys = {};
    const onKeyDown = (e) => {
      keys[e.key.toLowerCase()] = true;
      // Press P to print the current camera pose: handy for placing spots in nodes.js
      if (e.key.toLowerCase() === "p") {
        const p = camera.position;
        console.log(
          `camera: { position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}], yaw: ${Math.round(yaw / DEG)}, pitch: ${Math.round(pitch / DEG)} }`,
        );
      }
    };
    const onKeyUp = (e) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // --- resize
    const resize = () => {
      const { w, h } = getSize();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // --- render loop
    const clock = new THREE.Clock();
    let frame = 0;
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();

    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.1);

      if (!walkModeRef.current) {
        orbitControls.update();
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -42, 42);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -78, 28);
      }

      // tweens
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        tw.t += dt;
        const k = Math.min(1, tw.t / tw.dur);
        tw.update(easeInOut(k));
        if (k >= 1) {
          tweens.splice(i, 1);
          tw.done?.();
        }
      }

      // keyboard movement
      const forward =
        (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
      const strafe = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      const turn = (keys.arrowleft ? 1 : 0) - (keys.arrowright ? 1 : 0);
      if (walkModeRef.current && (forward || strafe || turn)) {
        tweens.length = 0;
        container.classList.remove("walking");
        yaw += turn * TURN_SPEED * dt;
        fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        right.set(Math.cos(yaw), 0, -Math.sin(yaw));
        camera.position.addScaledVector(fwd, forward * MOVE_SPEED * dt);
        camera.position.addScaledVector(right, strafe * MOVE_SPEED * dt);
        camera.position.x = THREE.MathUtils.clamp(
          camera.position.x,
          -12.2,
          12.2,
        );
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -66, 13);
        camera.position.y = EYE_HEIGHT;
        applyView();
      }

      updateWalkArrows();
      // show only nearby pins/arrows
      labelObjects.forEach(({ obj, range }) => {
        obj.visible = obj.position.distanceTo(camera.position) < range;
      });

      // keep "You are at" correct while walking freely
      if (++frame % 15 === 0 && !tweens.length) {
        let best = currentNodeId;
        let bestD = Infinity;
        nodes.forEach((n) => {
          const d = camera.position.distanceTo(
            new THREE.Vector3(...n.camera.position),
          );
          if (d < bestD) {
            bestD = d;
            best = n.id;
          }
        });
        setCurrent(best);
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    });

    // --- load the 3D model (falls back to the temporary street)
    const init = async () => {
      let world;
      try {
        const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
        if (disposed) return;
        world = gltf.scene;
        world.scale.setScalar(MODEL_SCALE);
        // centre on X/Z and put the lowest point on y = 0
        const box = new THREE.Box3().setFromObject(world);
        const c = box.getCenter(new THREE.Vector3());
        world.position.set(-c.x, -box.min.y, -c.z);
        const meshes = [];
        world.traverse((o) => {
          if (o.isMesh) meshes.push(o);
        });
        floorMeshes = meshes;
      } catch (err) {
        if (disposed) return;
        console.warn(
          `Could not load ${MODEL_URL}; showing the temporary street.`,
          err,
        );
        const temp = buildTempStreet();
        world = temp.group;
        floorMeshes = temp.groundMeshes || temp.meshes;
        roofLights = temp.roofLights || [];
        festoonLights = temp.festoonLights || [];
      }
      scene.add(world);
      setPose({ position: [0, EYE_HEIGHT, 11], yaw: 0, pitch: 0 });
      applyTimeOfDay(activeTime);
      requestAnimationFrame(() => {
        if (!disposed) callbacks.current.onReady?.();
      });
    };
    setPose({ position: [0, EYE_HEIGHT, 11], yaw: 0, pitch: 0 });
    init();

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      groundArrows.forEach((arrow) => {
        arrow.geometry.dispose();
        arrow.material.dispose();
      });
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material)
          ? o.material
          : o.material
            ? [o.material]
            : [];
        mats.forEach((m) => {
          Object.values(m).forEach((v) => v?.isTexture && v.dispose());
          m.dispose();
        });
      });
      orbitControls.dispose();
      renderer.dispose();
      canvas.remove();
      labelRenderer.domElement.remove();
      container.classList.remove("walking");
      apiRef.current = {};
      labelsRef.current = { pins: [], arrows: [] };
    };
  }, []);

  const shops = [
    ["Vegetable Market", "🥬", "Greens, tomatoes and gourds"],
    ["Fresh Fruit Market", "🍊", "Bananas, mangoes and citrus"],
    ["Flower Shop", "🌼", "Jasmine, marigold and roses"],
    ["Meat Shop", "🥩", "Fresh meat counter"],
    ["Chicken & Poultry", "🍗", "Poultry display"],
    ["Fish Market", "🐟", "Seafood display"],
    ["Dairy & Eggs", "🥚", "Milk, curd and eggs"],
    ["Spices & Groceries", "🌶️", "Pulses, spices and grains"],
  ];
  const changeTime = (mode) => {
    setTimeOfDay(mode);
    apiRef.current.setTimeOfDay?.(mode);
  };
  const toggleWalk = () => {
    const next = !walkMode;
    setWalkMode(next);
    apiRef.current.setWalkMode?.(next);
  };

  return (
    <div
      className="tour"
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#20252b",
      }}
    >
      <div className="tour-topbar">
        <div className="tour-brand">
          POORNA MARKET <small>VIRTUAL WALKTHROUGH</small>
        </div>
        <div className="tour-controls">
          <button type="button" onClick={toggleWalk}>
            {walkMode ? "Orbit view" : "Walk mode"}
          </button>
          {["day", "evening", "night"].map((mode) => (
            <button
              type="button"
              key={mode}
              className={timeOfDay === mode ? "active" : ""}
              onClick={() => changeTime(mode)}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <aside className="tour-side">
        <h3>Explore the market</h3>
        <p>Explore the market stalls and surrounding Poorna Market streets.</p>
        {shops.map(([name, emoji, description]) => (
          <button
            type="button"
            key={name}
            className={selectedShop === name ? "shop active" : "shop"}
            onClick={() => {
              setSelectedShop(name);
              callbacks.current.onMarkerSelect?.(null);
            }}
          >
            <span>
              {emoji} {name}
            </span>
            <small>{description}</small>
          </button>
        ))}
        <p className="tour-hint">
          Drag to look around · W/A/S/D or arrow keys to move · ←/→ to turn ·
          Select a shop for details.
        </p>
      </aside>
      {selectedShop && (
        <section className="tour-info">
          <button
            type="button"
            className="tour-close"
            onClick={() => setSelectedShop(null)}
          >
            ×
          </button>
          <h3>{selectedShop}</h3>
          <p>
            Market stall with category signage, counters, shelves, storage
            crates and displayed products. This is an illustrative layout;
            adjust positions to match your final site plan.
          </p>
        </section>
      )}
      <style>{`
        .tour-topbar{position:absolute;z-index:5;top:16px;left:16px;right:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;pointer-events:none;font-family:Inter,Arial,sans-serif;color:#fff}
        .tour-brand,.tour-controls,.tour-side,.tour-info{background:rgba(18,22,28,.84);border:1px solid #ffffff25;backdrop-filter:blur(10px);border-radius:12px;box-shadow:0 8px 24px #0003}
        .tour-brand{padding:12px 16px;font-weight:700;letter-spacing:.02em}.tour-brand small{display:block;margin-top:4px;color:#d6d9dd;font-size:10px;font-weight:400;letter-spacing:.1em}
        .tour-controls{padding:8px;display:flex;gap:7px;pointer-events:auto}.tour-controls button,.tour-side button,.tour-close{border:1px solid #ffffff30;border-radius:8px;padding:9px 12px;color:white;background:#ffffff12;cursor:pointer;font-size:13px}.tour-controls button.active,.tour-side button.active{background:#e9a34b35;border-color:#e9a34b}
        .tour-side{position:absolute;z-index:5;top:100px;left:16px;width:240px;padding:14px;color:#fff;font-family:Inter,Arial,sans-serif}.tour-side h3,.tour-info h3{margin:0 0 9px;font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#f4c17e}.tour-side p,.tour-info p{margin:0 0 10px;color:#d6d9dd;font-size:12px;line-height:1.45}.tour-side .shop{display:block;width:100%;text-align:left;margin:6px 0}.tour-side .shop span,.tour-side .shop small{display:block}.tour-side .shop small{margin:4px 0 0 24px;color:#c9cdd2;font-size:10px}.tour-side .tour-hint{margin-top:10px;font-size:10px}.tour-info{position:absolute;z-index:6;right:16px;bottom:16px;width:min(300px,calc(100vw - 32px));padding:15px;color:#fff;font-family:Inter,Arial,sans-serif}.tour-close{float:right;padding:2px 9px;font-size:20px}
        @media(max-width:650px){.tour-topbar{top:8px;left:8px;right:8px;align-items:flex-start}.tour-brand{font-size:11px;padding:9px}.tour-controls{max-width:65vw;flex-wrap:wrap;justify-content:flex-end}.tour-controls button{padding:7px;font-size:11px}.tour-side{top:82px;left:8px;width:185px;padding:9px}.tour-side .shop{padding:7px;font-size:11px}.tour-side .shop small{font-size:9px}}
      `}</style>
    </div>
  );
});

export default Tour;
