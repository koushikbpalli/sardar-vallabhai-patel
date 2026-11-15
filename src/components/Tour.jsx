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
import { Sky } from "three/addons/objects/Sky.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

import { nodes, START_NODE, getNode } from "../data/nodes.js";
import { pick, useLang } from "../i18n.jsx";
import { SHOPS } from "../data/shops.js";
import { SIGN_TEXT } from "../data/signs.js";

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

// ---- real model (public/models/market.glb) ----------------------------------
// The GLB is already centred on the MAIN ENTRANCE (x = 0, z = 0) and the street
// is at y = 0. The east side (+X) is outside the market, the building is at -X.
const START_POSE = { position: [11, EYE_HEIGHT, 0], yaw: 90, pitch: 0 }; // outside, facing the entrance
const MODEL_BOUNDS = { minX: -140, maxX: 90, minZ: -60, maxZ: 70 }; // walkable area (m)
const COLLIDE = true; // walls stop the visitor (set false to walk through everything)
const BODY_RADIUS = 0.45; // metres kept between the visitor and a wall
const STEP_UP = 0.6; // highest step / kerb the visitor walks up (m)
const RUN_FACTOR = 2;
// ---- look & realism ----------------------------------------------------------
const SHADOWS = true; // soft sun shadows around the visitor (set false on weak computers)
const SHADOW_SIZE = 2048; // shadow sharpness: 1024 (faster) ... 4096 (sharper)
const SHADOW_RADIUS = 60; // metres around the visitor that get shadows
const MAX_ANISOTROPY = 8;
const MAX_PIXEL_RATIO = 1.25; // 1 = fastest, 2 = sharpest (sharp phones/4K screens)
const MIN_PIXEL_RATIO = 0.7; // the page lowers the sharpness by itself if it is slow
const TARGET_FRAME_MS = 24; // slower than this (about 40 fps) -> reduce sharpness
// Press [ and ] in the tour to change the brightness; the console prints the value
// to paste into the presets below ("exposure"). // texture sharpness at a slant (floors seen from far)
// Tune how each material reacts to light, by words in its SketchUp name.
// [words, metalness, roughness, reflection strength]
const MATERIAL_LOOKS = [
  [/chrome/, 1, 0.16, 1.5],
  [/brass|gold|copper/, 0.9, 0.3, 1.3],
  [/aluminum|aluminium/, 0.85, 0.34, 1.1],
  [/steel|metal|iron/, 0.85, 0.4, 1.0],
  [/tiles|marble|granite|polish|ceramic/, 0, 0.32, 0.9],
  [/wood|tauari|cherry|teak/, 0, 0.58, 0.5],
  [/asphalt|road/, 0, 0.96, 0.25],
  [/concrete|stone|brick|cobble|pebble|moss|garnet|plaster/, 0, 0.9, 0.35],
]; // hold Shift to move this much faster
// Fallback street (only used if market.glb cannot be loaded)
const TEMP_START = { position: [0, EYE_HEIGHT, 11], yaw: 0, pitch: 0 };
const TEMP_BOUNDS = { minX: -12.2, maxX: 12.2, minZ: -66, maxZ: 13 };

// Signboards on the temporary street are drawn onto canvases; they are redrawn
// when the language changes. The font list lets Hindi / Telugu text show.
const SIGN_FONT = '"Noto Sans Devanagari","Noto Sans Telugu",Arial,sans-serif';
const signText = (label, lang) =>
  (lang !== "en" && SIGN_TEXT[label]?.[lang]) || label;

const easeInOut = (k) =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

// ---- Poorna Market fallback scene ------------------------------------------
// Mirrors the illustrative market layout in poorna_market_walkthrough_arrows.html.
function buildTempStreet(currentLang = "en") {
  const group = new THREE.Group();
  const signs = [];
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
    const draw = (text) => {
      q.fillStyle = "#f2dcb5";
      q.fillRect(0, 0, 768, 160);
      q.strokeStyle = "#765638";
      q.lineWidth = 10;
      q.strokeRect(5, 5, 758, 150);
      q.fillStyle = "#3c2c20";
      q.font = `bold 62px ${SIGN_FONT}`;
      q.textAlign = "center";
      q.textBaseline = "middle";
      q.fillText(text.toUpperCase(), 384, 82, 720);
    };
    draw(signText(label, currentLang));
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    signs.push({ tex, draw, label });
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
    const draw = (text) => {
      q.fillStyle = "#f0d7a7";
      q.fillRect(0, 0, 512, 120);
      q.fillStyle = "#3d2c20";
      q.font = `bold 42px ${SIGN_FONT}`;
      q.textAlign = "center";
      q.textBaseline = "middle";
      q.fillText(text, 256, 62, 490);
    };
    draw(signText(name, currentLang));
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    signs.push({ tex: tx, draw, label: name });
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
  return { group, meshes, roofLights, festoonLights, groundMeshes, signs };
}

// ---- surroundings: context buildings, people, vehicles, trees, night lights ----
// Everything below is generated in code (no extra files). It is placed AROUND the
// market by scanning the loaded model with rays, so it never sits on top of it.
// Tweak the numbers here to make the neighbourhood busier / quieter.
const SURROUND = {
  enabled: true,
  seed: 11, // change for a different random layout
  buildings: 30, // neighbouring buildings
  buildingMaxHeight: 17, // metres; kept low so the market stays the main building
  trees: 36, // extra green trees between the buildings
  people: 34, // pedestrians (outdoors)
  vehicles: 14, // cars, auto-rickshaws and motorbikes on the roads
  lamps: 30, // street lamps (glow at evening / night)
  realLights: 4, // street lamps that really light the ground at night (costs speed)
  cell: 4, // scan resolution in metres
  area: { minX: -200, maxX: 170, minZ: -120, maxZ: 130 }, // area that is scanned
};
const ROAD_RE = /road|asphalt/i; // material names treated as road
const FOLIAGE_RE = /\btree|deciduous|foliage|\bleaf|leaves|shrub|bush|hedge/i;
const TREE_AUTO_DETECT = true; // also colour un-named, un-textured, tree-shaped meshes green

const makeRng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// The exported tree has no colours at all (plain white). Paint it by shape:
// thin lower part = brown trunk, everything else = layered greens.
function greenTrees(root, register) {
  const scale = new THREE.Vector3();
  const done = new WeakSet();
  const cDark = new THREE.Color(0x2c6a22);
  const cLight = new THREE.Color(0x72b13d);
  const cTrunk = new THREE.Color(0x5b4332);
  const tmp = new THREE.Color();
  let count = 0;
  const names = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.length !== 1) return;
    const m = mats[0];
    let named = false;
    for (let p = o; p; p = p.parent)
      if (FOLIAGE_RE.test(p.name || "")) { named = true; break; }
    const geo = o.geometry;
    const pos = geo.attributes.position;
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    // which local axis points up in the world?
    const e = o.matrixWorld.elements;
    let ax = 1, best = 0;
    for (let i = 0; i < 3; i++) {
      const len = Math.hypot(e[4 * i], e[4 * i + 1], e[4 * i + 2]) || 1;
      const v = Math.abs(e[4 * i + 1]) / len;
      if (v > best) { best = v; ax = i; }
    }
    const sign = e[4 * ax + 1] >= 0 ? 1 : -1;
    const axes = ["x", "y", "z"];
    const h1 = (ax + 1) % 3, h2 = (ax + 2) % 3;
    o.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
    const sc = [scale.x, scale.y, scale.z];
    const size = (a) => (bb.max[axes[a]] - bb.min[axes[a]]) * sc[a];
    const height = size(ax);
    const width = Math.max(size(h1), size(h2));

    if (!named) {
      // un-named candidates must really look like a tree: white default material,
      // no texture, tree-sized, wide crown and mostly round (non-box) surface
      if (!TREE_AUTO_DETECT || m.map || m.vertexColors || m.transparent) return;
      if ((m.name || "") !== "") return;
      if (m.color.r < 0.9 || m.color.g < 0.9 || m.color.b < 0.9) return;
      if (height < 2.5 || height > 25 || width < 0.3 * height) return;
      if (pos.count < 400 || !geo.attributes.normal) return;
      const nr = geo.attributes.normal;
      let round = 0;
      const step = Math.max(1, Math.floor(nr.count / 600));
      let seen = 0;
      for (let i = 0; i < nr.count; i += step) {
        seen++;
        if (Math.max(Math.abs(nr.getX(i)), Math.abs(nr.getY(i)), Math.abs(nr.getZ(i))) < 0.9) round++;
      }
      if (round / seen < 0.55) return;
    }

    if (!done.has(geo)) {
      done.add(geo);
      const get = (i, a) => (a === 0 ? pos.getX(i) : a === 1 ? pos.getY(i) : pos.getZ(i));
      const lo = sign > 0 ? bb.min[axes[ax]] : -bb.max[axes[ax]];
      const ext = bb.max[axes[ax]] - bb.min[axes[ax]] || 1;
      const c1 = (bb.min[axes[h1]] + bb.max[axes[h1]]) / 2;
      const c2 = (bb.min[axes[h2]] + bb.max[axes[h2]]) / 2;
      let maxR = 1e-6;
      for (let i = 0; i < pos.count; i++)
        maxR = Math.max(maxR, Math.hypot(get(i, h1) - c1, get(i, h2) - c2));
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const u = (sign * get(i, ax) - lo) / ext; // 0 bottom .. 1 top
        const r = Math.hypot(get(i, h1) - c1, get(i, h2) - c2) / maxR;
        const n = Math.sin(get(i, 0) * 12.9898 + get(i, 1) * 78.233 + get(i, 2) * 37.719) * 43758.5453;
        const noise = n - Math.floor(n);
        const trunk = (u < 0.34 && r < 0.2) || (u < 0.5 && r < 0.07);
        if (trunk) tmp.copy(cTrunk).multiplyScalar(0.8 + 0.4 * noise);
        else {
          tmp.copy(cDark).lerp(cLight, Math.min(1, Math.max(0, u * 1.1 - 0.1) * 0.7 + noise * 0.35));
        }
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    }
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide,
    });
    register?.(mat);
    o.material = mat;
    count++;
    names.push(o.name || "(unnamed)");
  });
  console.info(`[tour] ${count} tree mesh(es) painted green:`, names);
  return count;
}

function buildSurroundings({ floorMeshes, start, shadows }) {
  const S = SURROUND;
  const rng = makeRng(S.seed);
  const R = (a, b) => a + (b - a) * rng();
  const pickOne = (arr) => arr[Math.floor(rng() * arr.length)];
  const group = new THREE.Group();
  group.name = "surroundings";
  const collidables = [];

  // ---- 1. scan the model from above: what is where? ---------------------------
  // kind: 0 nothing, 1 road, 2 open walkable ground, 3 solid (roof, wall, stall)
  const CELL = S.cell, A = S.area;
  const nx = Math.ceil((A.maxX - A.minX) / CELL);
  const nz = Math.ceil((A.maxZ - A.minZ) / CELL);
  const kind = new Uint8Array(nx * nz);
  const gy = new Float32Array(nx * nz);
  const cellX = (i) => A.minX + (i + 0.5) * CELL;
  const cellZ = (j) => A.minZ + (j + 0.5) * CELL;
  const inGrid = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz;
  const kindAt = (i, j) => (inGrid(i, j) ? kind[j * nx + i] : 0);
  const toI = (x) => Math.floor((x - A.minX) / CELL);
  const toJ = (z) => Math.floor((z - A.minZ) / CELL);
  const ray = new THREE.Raycaster();
  ray.far = 80;
  const org = new THREE.Vector3();
  const DOWN = new THREE.Vector3(0, -1, 0);
  const nrm = new THREE.Vector3();
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      org.set(cellX(i), 40, cellZ(j));
      ray.set(org, DOWN);
      const h = ray.intersectObjects(floorMeshes, false)[0];
      if (!h) continue;
      const mm = Array.isArray(h.object.material)
        ? h.object.material[h.face?.materialIndex ?? 0]
        : h.object.material;
      if (h.face) nrm.copy(h.face.normal).transformDirection(h.object.matrixWorld);
      else nrm.set(0, 1, 0);
      const k = j * nx + i;
      gy[k] = h.point.y;
      if (ROAD_RE.test(mm?.name || "") && nrm.y > 0.7 && h.point.y < 0.8) kind[k] = 1;
      else if (h.point.y > 0.8 || nrm.y < 0.7) kind[k] = 3;
      else kind[k] = 2;
    }
  // distance (in cells) to the nearest road / solid cell
  const dist = new Uint8Array(nx * nz).fill(9);
  const queue = [];
  for (let k = 0; k < kind.length; k++)
    if (kind[k] === 1 || kind[k] === 3) { dist[k] = 0; queue.push(k); }
  for (let qi = 0; qi < queue.length; qi++) {
    const k = queue[qi];
    if (dist[k] >= 6) continue;
    const ci = k % nx, cj = (k - ci) / nx;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const ni = ci + di, nj = cj + dj;
        if (!inGrid(ni, nj)) continue;
        const nk = nj * nx + ni;
        if (dist[nk] > dist[k] + 1) { dist[nk] = dist[k] + 1; queue.push(nk); }
      }
  }
  // centre of the model (centroid of solid cells)
  let cX = 0, cZ = 0, cN = 0;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++)
      if (kind[j * nx + i] === 3) { cX += cellX(i); cZ += cellZ(j); cN++; }
  const centre = cN > 20 ? { x: cX / cN, z: cZ / cN } : { x: -30, z: 5 };
  const sx = start?.[0] ?? 11, sz = start?.[2] ?? 0;

  // ---- shared helpers ---------------------------------------------------------
  const matCache = new Map();
  const M = (color, rough = 0.8, metal = 0, extra = {}) => {
    const key = `${color}_${rough}_${metal}_${JSON.stringify(extra)}`;
    if (!matCache.has(key))
      matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
    return matCache.get(key);
  };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = null) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent?.add(m);
    return m;
  };
  const canvasTex = (w, h, draw, srgb = true) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  const glowTex = canvasTex(128, 128, (q, w, h) => {
    const g = q.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    q.fillStyle = g; q.fillRect(0, 0, w, h);
  });
  const blobTex = canvasTex(64, 64, (q, w, h) => {
    const g = q.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    q.fillStyle = g; q.fillRect(0, 0, w, h);
  });
  const blobMat = new THREE.MeshBasicMaterial({
    map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const addBlob = (parent, sxm, szm) => {
    const b = new THREE.Mesh(blobGeo, blobMat);
    b.scale.set(sxm, 1, szm);
    b.position.y = 0.04;
    b.renderOrder = 2;
    parent.add(b);
  };

  // ---- 2. neighbouring buildings (low, muted, windows light up at night) ------
  const BAY = 3.2, FLOOR = 3.3, TILE_W = BAY * 4, TILE_H = FLOOR * 3;
  const wallColors = ["#d8cdb8", "#cbbfae", "#d9d2c3", "#c9c3b6", "#d6c2ab", "#bfc5bb"];
  const litWindows = []; // [bay,floor] flags, shared by all facades
  for (let f = 0; f < 3; f++) for (let b = 0; b < 4; b++) litWindows.push(rng() < 0.45);
  const lit = canvasTex(512, 384, (q, w, h) => {
    q.fillStyle = "#000"; q.fillRect(0, 0, w, h);
    for (let f = 0; f < 3; f++)
      for (let b = 0; b < 4; b++)
        if (litWindows[f * 4 + b]) {
          q.fillStyle = rng() < 0.5 ? "#ffd592" : "#ffe9bf";
          q.fillRect(b * 128 + 30, f * 128 + 28, 68, 70);
        }
  });
  const facades = wallColors.map((col) => {
    const map = canvasTex(512, 384, (q, w, h) => {
      q.fillStyle = col; q.fillRect(0, 0, w, h);
      for (let n = 0; n < 900; n++) {
        q.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
        q.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
      for (let f = 0; f < 3; f++) {
        q.fillStyle = "rgba(0,0,0,0.10)"; q.fillRect(0, f * 128 + 118, w, 5); // floor slab line
        for (let b = 0; b < 4; b++) {
          const x = b * 128 + 30, y = f * 128 + 28;
          q.fillStyle = "#6f6a60"; q.fillRect(x - 4, y - 4, 76, 78);
          q.fillStyle = "#5d7486"; q.fillRect(x, y, 68, 70);
          q.fillStyle = "rgba(255,255,255,0.18)"; q.fillRect(x, y, 68, 22);
          q.fillStyle = "#6f6a60"; q.fillRect(x + 32, y, 4, 70);
          q.fillStyle = "#b9b2a4"; q.fillRect(x - 8, y + 72, 84, 6); // sill
        }
      }
    });
    return new THREE.MeshStandardMaterial({
      map, emissiveMap: lit, emissive: new THREE.Color(0xffc477), emissiveIntensity: 0, roughness: 0.92,
    });
  });
  const roofMat = M(0x8b867d, 0.95);
  const tankMat = M(0x4b4f52, 0.7);

  const placed = []; // building footprints
  const insideBuilding = (x, z, pad = 0) =>
    placed.some((b) => Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad);

  const siteFree = (x, z, w, d) => {
    const i0 = toI(x - w / 2 - CELL), i1 = toI(x + w / 2 + CELL);
    const j0 = toJ(z - d / 2 - CELL), j1 = toJ(z + d / 2 + CELL);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        if (!inGrid(i, j)) return false;
        const k = j * nx + i;
        if ((kind[k] !== 0 && kind[k] !== 2) || dist[k] < 3) return false;
      }
    return Math.hypot(x - sx, z - sz) > 28;
  };
  const candidates = [];
  for (let x = A.minX + 12; x < A.maxX - 12; x += 14)
    for (let z = A.minZ + 12; z < A.maxZ - 12; z += 14) {
      const px = x + R(-4, 4), pz = z + R(-4, 4), w = R(11, 22), d = R(10, 18);
      if (siteFree(px, pz, w, d))
        candidates.push({ x: px, z: pz, w, d, rank: Math.hypot(px - centre.x, pz - centre.z) + R(0, 40) });
    }
  candidates.sort((a, b) => a.rank - b.rank);
  const maxFloors = Math.max(2, Math.floor(S.buildingMaxHeight / FLOOR));
  for (const c of candidates) {
    if (placed.length >= S.buildings) break;
    if (placed.some((p) => Math.abs(c.x - p.x) < (c.w + p.w) / 2 + 4 && Math.abs(c.z - p.z) < (c.d + p.d) / 2 + 4)) continue;
    const far = Math.min(1, Math.max(0, (Math.hypot(c.x - centre.x, c.z - centre.z) - 50) / 70));
    const floors = Math.min(maxFloors, 2 + Math.round(R(0, 1.6) + far * 2));
    const h = floors * FLOOR;
    const geo = new THREE.BoxGeometry(c.w, h, c.d);
    const uv = geo.attributes.uv;
    const offU = Math.floor(rng() * 4) / 4, offV = Math.floor(rng() * 3) / 3;
    for (let f = 0; f < 6; f++) {
      if (f === 2 || f === 3) continue; // roof / underside: no windows
      const span = f < 2 ? c.d : c.w;
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, (uv.getX(i) * span) / TILE_W + offU, (uv.getY(i) * h) / TILE_H + offV);
      }
    }
    const wall = pickOne(facades);
    const b = new THREE.Mesh(geo, [wall, wall, roofMat, roofMat, wall, wall]);
    const y0 = gy[Math.max(0, Math.min(kind.length - 1, toJ(c.z) * nx + toI(c.x)))] || 0;
    b.position.set(c.x, y0 + h / 2 - 0.1, c.z);
    b.castShadow = shadows;
    b.receiveShadow = shadows;
    group.add(b);
    collidables.push(b);
    placed.push(c);
    for (let t = 0, n = Math.floor(R(0, 3)); t < n; t++) {
      const bit = mesh(new THREE.BoxGeometry(R(1.0, 1.8), R(0.9, 1.6), R(1.0, 1.8)), tankMat,
        c.x + R(-c.w / 3, c.w / 3), y0 + h + 0.6, c.z + R(-c.d / 3, c.d / 3), group);
      bit.castShadow = shadows;
    }
  }

  // ---- 3. extra green trees ----------------------------------------------------
  const treeSpots = [];
  for (let tries = 0; tries < 900 && treeSpots.length < S.trees && placed.length; tries++) {
    const b = pickOne(placed);
    const side = Math.floor(rng() * 4);
    let x = b.x + (side === 0 ? b.w / 2 + R(2.5, 6) : side === 1 ? -b.w / 2 - R(2.5, 6) : R(-b.w / 2, b.w / 2));
    let z = b.z + (side === 2 ? b.d / 2 + R(2.5, 6) : side === 3 ? -b.d / 2 - R(2.5, 6) : R(-b.d / 2, b.d / 2));
    const i = toI(x), j = toJ(z);
    if (!inGrid(i, j) || (kind[j * nx + i] !== 0 && kind[j * nx + i] !== 2) || dist[j * nx + i] < 2) continue;
    if (insideBuilding(x, z, 1.5) || Math.hypot(x - sx, z - sz) < 15) continue;
    if (treeSpots.some((t) => Math.hypot(t.x - x, t.z - z) < 4)) continue;
    treeSpots.push({ x, z, y: gy[j * nx + i] || 0 });
  }
  if (treeSpots.length) {
    const crownGeo = new THREE.IcosahedronGeometry(1, 1);
    const cp = crownGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const k = 1 + 0.18 * Math.sin(cp.getX(i) * 7.1 + cp.getY(i) * 5.3 + cp.getZ(i) * 3.7);
      cp.setXYZ(i, cp.getX(i) * k, cp.getY(i) * k, cp.getZ(i) * k);
    }
    crownGeo.computeVertexNormals();
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 1, 7).translate(0, 0.5, 0);
    const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), treeSpots.length);
    const trunks = new THREE.InstancedMesh(trunkGeo, M(0x5b4332, 0.95), treeSpots.length);
    const dummy = new THREE.Object3D();
    const gA = new THREE.Color(0x3a7a2a), gB = new THREE.Color(0x6aa83a), tc = new THREE.Color();
    treeSpots.forEach((t, n) => {
      const th = R(2.4, 3.4), r = R(1.7, 2.7);
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.9, th, 0.9);
      dummy.updateMatrix();
      trunks.setMatrixAt(n, dummy.matrix);
      dummy.position.set(t.x, t.y + th + r * 0.55, t.z);
      dummy.rotation.set(0, R(0, 6.28), 0);
      dummy.scale.set(r, r * R(0.85, 1.15), r);
      dummy.updateMatrix();
      crowns.setMatrixAt(n, dummy.matrix);
      crowns.setColorAt(n, tc.copy(gA).lerp(gB, rng()));
    });
    crowns.castShadow = trunks.castShadow = false;
    crowns.frustumCulled = trunks.frustumCulled = false;
    group.add(trunks, crowns);
  }

  // ---- 4. people ---------------------------------------------------------------
  const skin = [0x8d5b3a, 0xa86b45, 0xc68c5f, 0x6f4429, 0xd7a577];
  const shirts = [0xc0392b, 0x2e6fa7, 0xe0a82e, 0x3f8f5a, 0xf0f0ea, 0x8e5aa8, 0xd9772b, 0x2b2f3a, 0xe36a8a, 0x4fb3b3];
  const pants = [0x2b3140, 0x4a4036, 0x1f2a44, 0x6b6b6b, 0x3a2f28, 0xd8d0bd];
  const hairC = [0x15110e, 0x1d1712, 0x2a1d14, 0x4a4a4a];
  const pg = {
    leg: new THREE.BoxGeometry(0.16, 0.86, 0.18).translate(0, -0.43, 0),
    arm: new THREE.BoxGeometry(0.1, 0.56, 0.12).translate(0, -0.27, 0),
    torso: new THREE.BoxGeometry(0.44, 0.58, 0.25),
    kurta: new THREE.BoxGeometry(0.46, 0.98, 0.27),
    head: new THREE.SphereGeometry(0.125, 10, 8),
    hair: new THREE.SphereGeometry(0.137, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
  };
  const buildPerson = () => {
    const g = new THREE.Group();
    const longTop = rng() < 0.4;
    const shirt = M(pickOne(shirts), 0.85);
    const trouser = M(pickOne(pants), 0.9);
    const skinM = M(pickOne(skin), 0.8);
    const legs = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.1, 0.88, 0);
      mesh(pg.leg, trouser, 0, 0, 0, p);
      g.add(p);
      return p;
    });
    const arms = [-1, 1].map((s) => {
      const p = new THREE.Group();
      p.position.set(s * 0.29, 1.43, 0);
      mesh(pg.arm, longTop ? shirt : skinM, 0, 0, 0, p);
      g.add(p);
      return p;
    });
    if (longTop) mesh(pg.kurta, shirt, 0, 0.97, 0, g);
    else mesh(pg.torso, shirt, 0, 1.17, 0, g);
    mesh(pg.head, skinM, 0, 1.6, 0, g);
    mesh(pg.hair, M(pickOne(hairC), 0.9), 0, 1.61, -0.005, g);
    g.scale.setScalar(R(0.92, 1.07));
    addBlob(g, 0.9, 0.9);
    return { g, legs, arms };
  };
  const blockers = () => [...floorMeshes, ...collidables];
  const wRay = new THREE.Raycaster();
  const wOrg = new THREE.Vector3(), wDir = new THREE.Vector3();
  const pathClear = (x, y, z, dx, dz, len) => {
    wOrg.set(x, y + 0.9, z);
    wDir.set(dx, 0, dz);
    wRay.set(wOrg, wDir);
    wRay.far = len + 0.7;
    return wRay.intersectObjects(blockers(), false).length === 0;
  };
  const walkCells = [];
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (kind[k] !== 2 || gy[k] > 0.45) continue;
      const x = cellX(i), z = cellZ(j);
      if (Math.hypot(x - sx, z - sz) < 4 || insideBuilding(x, z, 2)) continue;
      walkCells.push({ x, z, y: gy[k] });
    }
  const walkers = [];
  for (let tries = 0; tries < 1500 && walkers.length < S.people && walkCells.length; tries++) {
    const c = pickOne(walkCells);
    const d = Math.hypot(c.x, c.z);
    if (rng() > 0.1 + 0.9 * Math.exp(-d / 50)) continue;
    const x = c.x + R(-CELL / 2, CELL / 2), z = c.z + R(-CELL / 2, CELL / 2);
    const group3 = rng() < 0.25 ? 2 + Math.floor(rng() * 2) : 1; // small standing groups
    for (let n = 0; n < group3 && walkers.length < S.people; n++) {
      const px = x + (n ? R(-0.9, 0.9) : 0), pz = z + (n ? R(-0.9, 0.9) : 0);
      const person = buildPerson();
      let a = [px, pz], b = [px, pz], len = 0;
      if (group3 === 1) {
        const ang0 = R(0, 6.28), L = R(3, 7);
        for (let t = 0; t < 8; t++) {
          const ang = ang0 + (t * Math.PI) / 4, dx = Math.cos(ang), dz = Math.sin(ang);
          if (!pathClear(px, c.y, pz, dx, dz, L)) continue;
          const ei = toI(px + dx * L), ej = toJ(pz + dz * L);
          if (kindAt(ei, ej) !== 2 || Math.abs(gy[ej * nx + ei] - c.y) > 0.3) continue;
          b = [px + dx * L, pz + dz * L]; len = L; break;
        }
      }
      person.g.position.set(px, c.y, pz);
      person.g.rotation.y = R(0, 6.28);
      group.add(person.g);
      walkers.push({ ...person, a, b, len, y: c.y, spd: R(0.8, 1.4), t: R(0, 20), ph: R(0, 6.28), yaw: person.g.rotation.y });
    }
  }

  // ---- 5. roads -> vehicles and street lamps ------------------------------------
  const runs = [];
  const seenRun = new Set();
  const addRuns = (axis) => {
    const nA = axis === "x" ? nx : nz, nB = axis === "x" ? nz : nx;
    const at = (a, b) => (axis === "x" ? kindAt(a, b) : kindAt(b, a));
    for (let b = 0; b < nB; b++)
      for (let a = 0; a < nA; a++) {
        if (at(a, b) !== 1) continue;
        let a0 = a, a1 = a;
        while (at(a0 - 1, b) === 1) a0--;
        while (at(a1 + 1, b) === 1) a1++;
        a = a1; // continue after this run
        if ((a1 - a0 + 1) * CELL < 28) continue;
        const mid = Math.floor((a0 + a1) / 2);
        let b0 = b, b1 = b;
        while (at(mid, b0 - 1) === 1) b0--;
        while (at(mid, b1 + 1) === 1) b1++;
        if (b !== Math.floor((b0 + b1) / 2)) continue; // only the centre line of a road
        const key = `${axis}:${b}:${a0}`;
        if (seenRun.has(key)) continue;
        seenRun.add(key);
        const width = (b1 - b0 + 1) * CELL;
        const gk = axis === "x" ? b * nx + mid : mid * nx + b;
        const lineCoord = axis === "x" ? cellZ(b) : cellX(b);
        const from = (axis === "x" ? cellX(a0) : cellZ(a0)) - CELL / 2;
        const to = (axis === "x" ? cellX(a1) : cellZ(a1)) + CELL / 2;
        runs.push({ axis, line: lineCoord, from, to, width, y: gy[gk] || 0, len: to - from });
      }
  };
  addRuns("x");
  addRuns("z");

  // vehicles ---------------------------------------------------------------------
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0b8, emissiveIntensity: 0 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x8a1313, emissive: 0xff2a1a, emissiveIntensity: 0 });
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  const beamGeo = new THREE.ConeGeometry(1.5, 8, 14, 1, true).translate(0, -4, 0).rotateX(-Math.PI / 2);
  const addBeam = (parent, x, y, z, s = 1) => {
    const b = new THREE.Mesh(beamGeo, beamMat);
    b.position.set(x, y, z);
    b.rotation.x = 0.07;
    b.scale.set(s, s, s);
    b.renderOrder = 3;
    parent.add(b);
  };
  const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14).rotateZ(Math.PI / 2);
  const tyre = M(0x151515, 0.95);
  const glass = M(0x1d2a33, 0.15, 0.2);
  const carColors = [0xd9d9d6, 0x1f2d4a, 0xa11f24, 0x5d6770, 0x2a2a2a, 0xe9e5d8, 0x3b6a4a, 0xb8872b];
  const buildCar = () => {
    const g = new THREE.Group();
    const c = pickOne(carColors);
    mesh(new THREE.BoxGeometry(1.8, 0.62, 4.1), M(c, 0.4, 0.35), 0, 0.64, 0, g);
    mesh(new THREE.BoxGeometry(1.58, 0.56, 2.2), glass, 0, 1.2, -0.25, g);
    mesh(new THREE.BoxGeometry(1.6, 0.06, 2.0), M(c, 0.4, 0.35), 0, 1.5, -0.25, g);
    for (const sx2 of [-1, 1])
      for (const sz2 of [-1, 1]) mesh(wheelGeo, tyre, sx2 * 0.92, 0.33, sz2 * 1.3, g);
    for (const sx2 of [-1, 1]) {
      mesh(new THREE.BoxGeometry(0.4, 0.16, 0.06), headMat, sx2 * 0.6, 0.72, 2.06, g);
      mesh(new THREE.BoxGeometry(0.4, 0.14, 0.06), tailMat, sx2 * 0.6, 0.76, -2.06, g);
      addBeam(g, sx2 * 0.6, 0.72, 2.1, 0.7);
    }
    addBlob(g, 2.6, 5.2);
    return g;
  };
  const buildAuto = () => {
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.3, 0.55, 2.5), M(0x1b1b1b, 0.6), 0, 0.62, 0, g);
    mesh(new THREE.BoxGeometry(1.3, 0.95, 1.5), M(0xf2c21b, 0.5), 0, 1.35, -0.5, g);
    mesh(new THREE.BoxGeometry(1.34, 0.08, 1.6), M(0x1b1b1b, 0.6), 0, 1.86, -0.5, g);
    mesh(new THREE.BoxGeometry(1.1, 0.55, 0.05), glass, 0, 1.4, 0.27, g);
    const w = new THREE.CylinderGeometry(0.27, 0.27, 0.16, 12).rotateZ(Math.PI / 2);
    mesh(w, tyre, 0, 0.27, 1.05, g);
    mesh(w, tyre, -0.62, 0.27, -0.75, g);
    mesh(w, tyre, 0.62, 0.27, -0.75, g);
    mesh(new THREE.BoxGeometry(0.28, 0.16, 0.06), headMat, 0, 0.9, 1.27, g);
    mesh(new THREE.BoxGeometry(0.9, 0.1, 0.05), tailMat, 0, 1.0, -1.27, g);
    addBeam(g, 0, 0.9, 1.3, 0.8);
    addBlob(g, 2.0, 3.6);
    return g;
  };
  const buildBike = () => {
    const g = new THREE.Group();
    const w = new THREE.CylinderGeometry(0.31, 0.31, 0.11, 12).rotateZ(Math.PI / 2);
    mesh(w, tyre, 0, 0.31, 0.68, g);
    mesh(w, tyre, 0, 0.31, -0.68, g);
    mesh(new THREE.BoxGeometry(0.26, 0.38, 1.15), M(pickOne([0x222222, 0xa11f24, 0x2b4f8a]), 0.4, 0.4), 0, 0.64, 0, g);
    const shirt = M(pickOne(shirts), 0.85);
    mesh(new THREE.BoxGeometry(0.36, 0.55, 0.22), shirt, 0, 1.22, -0.12, g);
    mesh(new THREE.BoxGeometry(0.3, 0.22, 0.62), M(pickOne(pants), 0.9), 0, 0.9, -0.1, g);
    mesh(new THREE.SphereGeometry(0.16, 10, 8), M(pickOne([0x111111, 0xcc3322, 0xf0f0f0]), 0.4), 0, 1.68, -0.08, g);
    mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), headMat, 0, 0.88, 0.95, g);
    mesh(new THREE.BoxGeometry(0.16, 0.08, 0.05), tailMat, 0, 0.8, -0.92, g);
    addBeam(g, 0, 0.88, 1.0, 0.55);
    addBlob(g, 1.0, 2.4);
    return g;
  };
  const vehicles = [];
  if (runs.length) {
    const total = runs.reduce((s2, r) => s2 + r.len, 0);
    const pickRun = () => {
      let t = rng() * total;
      for (const r of runs) { t -= r.len; if (t <= 0) return r; }
      return runs[runs.length - 1];
    };
    const runSpeed = new Map();
    for (let n = 0; n < S.vehicles; n++) {
      const r = pickRun();
      const dir = rng() < 0.5 ? 1 : -1;
      const key = `${runs.indexOf(r)}:${dir}`;
      if (!runSpeed.has(key)) runSpeed.set(key, R(4, 8)); // same speed per lane: no overtaking
      const roll = rng();
      const g = roll < 0.4 ? buildCar() : roll < 0.75 ? buildAuto() : buildBike();
      group.add(g);
      vehicles.push({ g, r, dir, spd: runSpeed.get(key), t: R(0, r.len), lane: Math.min(4, Math.max(1.3, r.width / 4)) });
    }
  }

  // street lamps -------------------------------------------------------------------
  const lampSites = [];
  for (const r of runs) {
    for (let t = R(4, 14); t < r.len && lampSites.length < S.lamps * 2; t += 24) {
      const side = lampSites.length % 2 ? 1 : -1;
      const off = r.width / 2 + 0.9;
      const x = r.axis === "x" ? r.from + t : r.line + side * off;
      const z = r.axis === "x" ? r.line + side * off : r.from + t;
      const i = toI(x), j = toJ(z);
      if (kindAt(i, j) === 3 || insideBuilding(x, z, 1)) continue;
      lampSites.push({ x, z, y: r.y, tx: r.axis === "x" ? 0 : -side, tz: r.axis === "x" ? -side : 0 });
    }
  }
  // lamps in front of the entrance and on open ground near the visitor's start
  const near = walkCells.filter((c) => Math.hypot(c.x, c.z) > 8 && Math.hypot(c.x, c.z) < 45);
  for (let tries = 0; tries < 300 && near.length && lampSites.length < S.lamps * 2; tries++) {
    const c = pickOne(near);
    if (lampSites.some((l) => Math.hypot(l.x - c.x, l.z - c.z) < 16)) continue;
    lampSites.push({ x: c.x, z: c.z, y: c.y, tx: 0, tz: 0 });
    if (lampSites.filter((l) => !l.tx && !l.tz).length >= 6) break;
  }
  lampSites.sort((p, q) => Math.hypot(p.x - sx, p.z - sz) - Math.hypot(q.x - sx, q.z - sz));
  lampSites.length = Math.min(lampSites.length, S.lamps);

  const poleMat = M(0x2d3034, 0.6, 0.6);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffb54d, emissiveIntensity: 0 });
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 6.2, 8).translate(0, 3.1, 0);
  const headGeo = new THREE.BoxGeometry(0.55, 0.1, 0.3);
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffc477, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTex, color: 0xffb860, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
  });
  const poolGeo = new THREE.PlaneGeometry(13, 13).rotateX(-Math.PI / 2);
  const realLights = [];
  lampSites.forEach((l, n) => {
    const g = new THREE.Group();
    g.position.set(l.x, l.y, l.z);
    mesh(poleGeo, poleMat, 0, 0, 0, g);
    const hx = l.tx * 0.7, hz = l.tz * 0.7;
    mesh(new THREE.BoxGeometry(0.08, 0.08, 0.1 + Math.hypot(hx, hz)), poleMat, hx / 2, 6.18, hz / 2, g);
    mesh(headGeo, poleMat, hx, 6.2, hz, g);
    mesh(new THREE.BoxGeometry(0.42, 0.04, 0.22), bulbMat, hx, 6.13, hz, g);
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(4.2, 4.2, 1);
    glow.position.set(hx, 6.0, hz);
    g.add(glow);
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(hx, 0.07, hz);
    pool.renderOrder = 2;
    g.add(pool);
    group.add(g);
    if (realLights.length < S.realLights && realLights.every((o) => Math.hypot(o.x - l.x, o.z - l.z) > 16)) {
      const pl = new THREE.PointLight(0xffc477, 0, 30, 1.7);
      pl.position.set(l.x + hx, l.y + 5.8, l.z + hz);
      group.add(pl);
      realLights.push({ light: pl, x: l.x, z: l.z });
    }
  });

  // ---- 6. time of day + animation ------------------------------------------------
  const wallMats = facades;
  const setMode = (mode) => {
    const night = mode === "night", eve = mode === "evening";
    const k = night ? 1 : eve ? 0.5 : 0;
    wallMats.forEach((m) => (m.emissiveIntensity = night ? 1.15 : eve ? 0.45 : 0));
    bulbMat.emissiveIntensity = night ? 3 : eve ? 1.4 : 0;
    glowMat.opacity = night ? 0.85 : eve ? 0.4 : 0;
    poolMat.opacity = night ? 0.5 : eve ? 0.2 : 0;
    headMat.emissiveIntensity = night ? 2.6 : eve ? 1 : 0;
    tailMat.emissiveIntensity = night ? 1.6 : eve ? 0.6 : 0;
    beamMat.opacity = 0.17 * k;
    realLights.forEach((o) => (o.light.intensity = night ? 30 : eve ? 9 : 0));
  };
  const update = (dt) => {
    for (const w of walkers) {
      w.t += dt;
      const swing = w.len ? Math.sin(w.t * w.spd * 5 + w.ph) : 0;
      w.legs[0].rotation.x = swing * 0.55;
      w.legs[1].rotation.x = -swing * 0.55;
      w.arms[0].rotation.x = -swing * 0.45;
      w.arms[1].rotation.x = swing * 0.45;
      if (!w.len) {
        w.g.rotation.y = w.yaw + Math.sin(w.t * 0.4 + w.ph) * 0.15; // standing: idle look-around
        continue;
      }
      const s = (w.t * w.spd) / w.len;
      const u = s % 2, p = u < 1 ? u : 2 - u, sgn = u < 1 ? 1 : -1;
      const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1];
      w.g.position.set(w.a[0] + dx * p, w.y + Math.abs(swing) * 0.03, w.a[1] + dz * p);
      w.g.rotation.y = Math.atan2(dx * sgn, dz * sgn);
    }
    for (const v of vehicles) {
      const r = v.r;
      v.t += v.spd * dt;
      if (v.t > r.len) v.t -= r.len;
      const along = v.dir > 0 ? v.t : r.len - v.t;
      const hx = r.axis === "x" ? v.dir : 0, hz = r.axis === "x" ? 0 : v.dir;
      // drive on the left (India): lateral offset to the left of the heading
      const lx = hz * v.lane, lz = -hx * v.lane;
      if (r.axis === "x") v.g.position.set(r.from + along + lx, r.y, r.line + lz);
      else v.g.position.set(r.line + lx, r.y, r.from + along + lz);
      v.g.rotation.y = Math.atan2(hx, hz);
    }
  };
  setMode("day");

  console.info(
    `[tour] surroundings: ${placed.length} buildings, ${treeSpots.length} trees, ${walkers.length} people, ` +
      `${vehicles.length} vehicles on ${runs.length} road run(s), ${lampSites.length} lamps`,
  );
  return { group, collidables, setMode, update };
}

// ---- component -------------------------------------------------------------
// Same interface as the old panorama Tour, so App.jsx needs no changes.
const Tour = forwardRef(function Tour(
  { lang, active = true, onMarkerSelect, onSceneChange, onReady },
  ref,
) {
  const { t } = useLang();
  const containerRef = useRef(null);
  const apiRef = useRef({});
  const signsRef = useRef([]);
  const activeRef = useRef(active);
  activeRef.current = active;
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
      // Back to the entrance, walk mode, no open shop card (used on "Enter").
      reset: () => {
        setSelectedShop(null);
        if (!walkModeRef.current) {
          setWalkMode(true);
          apiRef.current.setWalkMode?.(true);
        }
        apiRef.current.reset?.();
      },
    }),
    [],
  );

  // Language change: relabel tooltips and the street signboards; the 3D scene
  // itself is not rebuilt.
  useEffect(() => {
    signsRef.current.forEach(({ tex, draw, label }) => {
      draw(signText(label, lang));
      tex.needsUpdate = true;
    });
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
    scene.fog = new THREE.Fog(0xd5e4f0, 200, 900);

    const camera = new THREE.PerspectiveCamera(
      FOV_DEFAULT,
      initial.w / initial.h,
      0.1,
      1200,
    );
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    let pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(initial.w, initial.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // "Neutral" keeps the real colours of the model; ACES (older three) fades them.
    renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = SHADOWS;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false; // refreshed only when the visitor moves
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

    // --- sky, sun, reflections and time of day
    scene.add(camera); // so the night "torch" light can follow the visitor
    scene.add(new THREE.HemisphereLight(0xeaf5ff, 0x7a6a52, 0.55));
    const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
    sun.castShadow = SHADOWS;
    sun.shadow.mapSize.set(SHADOW_SIZE, SHADOW_SIZE);
    Object.assign(sun.shadow.camera, {
      left: -SHADOW_RADIUS, right: SHADOW_RADIUS, top: SHADOW_RADIUS,
      bottom: -SHADOW_RADIUS, near: 1, far: 420,
    });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.05;
    scene.add(sun, sun.target);
    const nightFill = new THREE.AmbientLight(0x8ba7d8, 0);
    scene.add(nightFill);
    const lamp = new THREE.PointLight(0xffd9a8, 0, 24, 1.6); // night torch
    lamp.position.set(0, 0.2, 0);
    camera.add(lamp);

    const sky = new Sky();
    sky.scale.setScalar(10000);
    const skyScene = new THREE.Scene();
    skyScene.add(sky);
    const pmrem = new THREE.PMREMGenerator(renderer);
    let envRT = null;
    const sunDirVec = new THREE.Vector3(0.5, 0.8, 0.3).normalize();
    let shadowDirty = true;
    const litMaterials = new Set();
    let roofLights = [];
    let festoonLights = [];
    let surroundings = null; // buildings, people, vehicles, lamps around the model
    let activeTime = "day";
    const applyTimeOfDay = (mode) => {
      const presets = {
        day: { elev: 45, azim: 140, turb: 2.5, ray: 1.0, mie: 0.003, hemi: 0.2, sun: 2.4, sunColor: 0xfff4e0, fog: 0xd5e4f0, fill: 0, lamp: 0, exposure: 0.6, env: 0.4 },
        evening: { elev: 7, azim: 118, turb: 8, ray: 2.4, mie: 0.015, hemi: 0.18, sun: 2.0, sunColor: 0xff9a55, fog: 0xd9a58a, fill: 0.04, lamp: 0, exposure: 0.7, env: 0.25 },
        night: { elev: -6, azim: 118, turb: 2, ray: 0.3, mie: 0.002, hemi: 0.12, sun: 0.3, sunColor: 0x9bb8ff, fog: 0x141d30, fill: 0.2, lamp: 14, exposure: 1.0, env: 0.12, lightElev: 38 },
      };
      const p = presets[mode] || presets.day;
      activeTime = mode;
      const u = sky.material.uniforms;
      u.turbidity.value = p.turb;
      u.rayleigh.value = p.ray;
      u.mieCoefficient.value = p.mie;
      u.mieDirectionalG.value = 0.8;
      const toDir = (elev, azim) => {
        const phi = THREE.MathUtils.degToRad(90 - elev);
        const th = THREE.MathUtils.degToRad(azim);
        return new THREE.Vector3().setFromSphericalCoords(1, phi, th);
      };
      u.sunPosition.value.copy(toDir(p.elev, p.azim));
      sunDirVec.copy(toDir(p.lightElev ?? p.elev, p.azim));
      envRT?.dispose();
      envRT = pmrem.fromScene(skyScene);
      scene.environment = envRT.texture;
      scene.background = envRT.texture;
      if ("environmentIntensity" in scene) scene.environmentIntensity = p.env;
      litMaterials.forEach((m) => (m.envMapIntensity = m.userData.env * p.env));
      scene.fog.color.setHex(p.fog);
      scene.children.find((o) => o.isHemisphereLight).intensity = p.hemi;
      sun.intensity = p.sun;
      sun.color.setHex(p.sunColor);
      nightFill.intensity = p.fill;
      lamp.intensity = p.lamp;
      renderer.toneMappingExposure = p.exposure;
      shadowDirty = true;
      roofLights.forEach((m) => {
        m.material.emissiveIntensity =
          mode === "day" ? 0 : mode === "evening" ? 0.65 : 1.8;
      });
      festoonLights.forEach((m) => {
        m.material.emissiveIntensity =
          mode === "day" ? 0 : mode === "evening" ? 0.85 : 2.1;
      });
      surroundings?.setMode(mode);
    };
    // Natural-looking surfaces: metals shine, glass is clear, stone and asphalt are matt.
    const tuneMaterial = (m) => {
      const name = (m.name || "").toLowerCase();
      let metal = 0, rough = Math.max(0.45, m.roughness ?? 0.5), env = 0.6;
      if (m.transparent && m.opacity < 0.95) {
        rough = 0.05; env = 1.6; m.depthWrite = false;
      } else {
        const hit = MATERIAL_LOOKS.find(([re]) => re.test(name));
        if (hit) [, metal, rough, env] = hit;
      }
      m.metalness = metal;
      m.roughness = rough;
      m.userData.env = env;
      if (m.map) m.map.anisotropy = Math.min(MAX_ANISOTROPY, renderer.capabilities.getMaxAnisotropy());
      litMaterials.add(m);
    };

    // --- view state
    let yaw = 0; // radians, 0 = looking towards -Z, positive = turn left
    let pitch = 0;
    let currentNodeId = START_NODE;
    let floorMeshes = [];
    let useModel = false; // true once market.glb is loaded
    let bounds = TEMP_BOUNDS;
    let startPose = TEMP_START;
    let groundY = 0; // floor height under the visitor
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
          const back = useModel ? 28 : 10;
          camera.position.set(
            px - direction.x * back,
            useModel ? 16 : 7,
            pz - direction.z * back,
          );
          orbitControls.target.set(
            px + direction.x * back,
            1.5,
            pz + direction.z * back,
          );
        } else {
          camera.position.y = groundY + EYE_HEIGHT;
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          direction.y = 0;
          direction.normalize();
          yaw = Math.atan2(-direction.x, -direction.z);
          pitch = 0;
          applyView();
        }
      },
      reset() {
        tweens.length = 0;
        container.classList.remove("walking");
        groundY = 0;
        setPose(startPose);
        camera.fov = FOV_DEFAULT;
        camera.updateProjectionMatrix();
        currentNodeId = START_NODE;
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
    const clampX = (v) => THREE.MathUtils.clamp(v, bounds.minX, bounds.maxX);
    const clampZ = (v) => THREE.MathUtils.clamp(v, bounds.minZ, bounds.maxZ);

    // Floor height under (x, z): looks straight down from above the head and
    // ignores anything higher than one step (stall tables, roofs, ...).
    const downRay = new THREE.Raycaster();
    const DOWN = new THREE.Vector3(0, -1, 0);
    const downOrigin = new THREE.Vector3();
    const groundAt = (x, z, fromY, maxStep) => {
      if (!useModel) return 0;
      downOrigin.set(x, fromY, z);
      downRay.set(downOrigin, DOWN);
      downRay.far = 14;
      const hits = downRay.intersectObjects(floorMeshes, false);
      for (const h of hits) if (h.point.y <= groundY + maxStep) return h.point.y;
      return null;
    };
    // Distance the visitor can still walk in direction (dx, dz) before a wall.
    const wallRay = new THREE.Raycaster();
    const wallOrigin = new THREE.Vector3();
    const wallDir = new THREE.Vector3();
    const wallDist = (dx, dz, maxD) => {
      if (!COLLIDE || !useModel || maxD <= 0) return { d: maxD };
      wallOrigin.set(camera.position.x, groundY + 1.1, camera.position.z);
      wallDir.set(dx, 0, dz).normalize();
      wallRay.set(wallOrigin, wallDir);
      wallRay.far = maxD + BODY_RADIUS;
      for (const h of wallRay.intersectObjects(floorMeshes, false)) {
        if (!h.face) continue;
        const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
        if (Math.abs(n.y) > 0.7) continue; // ramp or floor, not a wall
        return { d: Math.max(0, Math.min(maxD, h.distance - BODY_RADIUS)), n };
      }
      return { d: maxD };
    };
    const arrowDirection = (k) => {
      const a = yaw + (k * Math.PI) / 4;
      return { a, x: -Math.sin(a), z: -Math.cos(a) };
    };
    const updateWalkArrows = () =>
      groundArrows.forEach((arrow, k) => {
        const d = arrowDirection(k);
        arrow.position.set(
          camera.position.x + d.x * 4.2,
          groundY + 0.06,
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
        const dist = wallDist(d.x, d.z, 5.5).d;
        const tx = clampX(camera.position.x + d.x * dist);
        const tz = clampZ(camera.position.z + d.z * dist);
        const gy = groundAt(tx, tz, groundY + 2.2, STEP_UP) ?? groundY;
        groundY = gy;
        flyTo({ x: tx, y: gy + EYE_HEIGHT, z: tz, yaw, pitch }, 700);
        return;
      }
      const hit = raycaster.intersectObjects(floorMeshes, false)[0];
      if (!hit || !hit.face || hit.distance > 40) return;
      const normal = hit.face.normal
        .clone()
        .transformDirection(hit.object.matrixWorld);
      if (normal.y < 0.7) return; // wall or ceiling: do not walk through it
      groundY = hit.point.y;
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
      if (e.key === "[" || e.key === "]") {
        renderer.toneMappingExposure = Math.max(
          0.1,
          renderer.toneMappingExposure + (e.key === "]" ? 0.05 : -0.05),
        );
        console.log(`exposure: ${renderer.toneMappingExposure.toFixed(2)}`);
      }
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
    let perfTime = 0;
    let perfFrames = -120; // ignore the first frames (shader compiling)
    const clock = new THREE.Clock();
    let frame = 0;
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();

    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.1);
      // Not visible (home page or a popup is on top): skip all drawing work.
      if (!activeRef.current) return;

      if (!walkModeRef.current) {
        orbitControls.update();
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, bounds.minX - 30, bounds.maxX + 30);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, bounds.minZ - 30, bounds.maxZ + 30);
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
        let mx = fwd.x * forward + right.x * strafe;
        let mz = fwd.z * forward + right.z * strafe;
        const len = Math.hypot(mx, mz);
        if (len > 0) {
          mx /= len;
          mz /= len;
          const step = MOVE_SPEED * (keys.shift ? RUN_FACTOR : 1) * dt;
          const w = wallDist(mx, mz, step);
          camera.position.x += mx * w.d;
          camera.position.z += mz * w.d;
          if (w.n && step - w.d > 1e-4) {
            // slide along the wall instead of stopping dead
            const dot = mx * w.n.x + mz * w.n.z;
            let sx = mx - dot * w.n.x;
            let sz = mz - dot * w.n.z;
            const sl = Math.hypot(sx, sz);
            if (sl > 0.05) {
              sx /= sl;
              sz /= sl;
              const w2 = wallDist(sx, sz, (step - w.d) * sl);
              camera.position.x += sx * w2.d;
              camera.position.z += sz * w2.d;
            }
          }
        }
        camera.position.x = clampX(camera.position.x);
        camera.position.z = clampZ(camera.position.z);
        applyView();
      }

      // follow the floor: up ramps and steps, down kerbs (walk mode only)
      if (useModel && walkModeRef.current && !tweens.length) {
        if (frame % 3 === 0) {
          const g = groundAt(
            camera.position.x,
            camera.position.z,
            groundY + 2.2,
            STEP_UP,
          );
          if (g !== null) groundY = g;
        }
        camera.position.y +=
          (groundY + EYE_HEIGHT - camera.position.y) * Math.min(1, dt * 10);
        applyView();
      }

      updateWalkArrows();
      surroundings?.update(dt);
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

      // keep the shadow window centred on the visitor (refreshed only when needed)
      if (SHADOWS) {
        const sx = Math.round(camera.position.x / 15) * 15;
        const sz = Math.round(camera.position.z / 15) * 15;
        if (shadowDirty || sx !== sun.target.position.x || sz !== sun.target.position.z) {
          sun.target.position.set(sx, 0, sz);
          sun.position.copy(sunDirVec).multiplyScalar(160).add(sun.target.position);
          sun.target.updateMatrixWorld();
          renderer.shadowMap.needsUpdate = true;
          shadowDirty = false;
        }
      }
      // Smoothness: if frames are slow, quietly lower the render sharpness.
      if (perfFrames < 0) {
        perfFrames++;
        perfTime = 0;
      } else perfTime += dt * 1000;
      if (perfFrames >= 0 && ++perfFrames >= 45) {
        const avg = perfTime / perfFrames;
        perfTime = perfFrames = 0;
        if (avg > TARGET_FRAME_MS && pixelRatio > MIN_PIXEL_RATIO) {
          pixelRatio = Math.max(MIN_PIXEL_RATIO, pixelRatio - 0.15);
          renderer.setPixelRatio(pixelRatio);
          resize();
        }
      }
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    });

    // --- load the 3D model (falls back to the temporary street)
    const init = async () => {
      let world;
      try {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder); // market.glb is meshopt-compressed
        const gltf = await loader.loadAsync(MODEL_URL);
        if (disposed) return;
        world = gltf.scene;
        world.scale.setScalar(MODEL_SCALE);
        // market.glb is already centred on the main entrance with the street at
        // y = 0, so it is NOT moved here. Repeated items (trees, screens...) are
        // GPU-instanced; only the solid meshes are used for floor / wall tests.
        const meshes = [];
        world.traverse((o) => {
          if (!o.isMesh) return;
          // MeshStandardMaterial is cheaper to draw than the glTF "physical" one.
          const swap = (m) =>
            m.isMeshPhysicalMaterial
              ? new THREE.MeshStandardMaterial().copy(m)
              : m;
          o.material = Array.isArray(o.material)
            ? o.material.map(swap)
            : swap(o.material);
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m.side = THREE.DoubleSide;
            tuneMaterial(m);
          });
          const glass = mats.some((m) => m.transparent && m.opacity < 0.95);
          const ground = mats.some((m) => /road|asphalt|cobble|pebble|moss/i.test(m.name));
          // Repeated small items (instanced) do not cast shadows: much faster.
          o.castShadow = SHADOWS && !glass && !ground && !o.isInstancedMesh;
          o.receiveShadow = SHADOWS;
          if (o.isInstancedMesh) {
            // cull instanced batches that are outside the view when possible
            if (o.computeBoundingSphere) o.computeBoundingSphere();
            else o.frustumCulled = false;
          } else meshes.push(o);
        });
        floorMeshes = meshes;
        useModel = true;
        bounds = MODEL_BOUNDS;
        startPose = START_POSE;
        orbitControls.maxDistance = 170;
        orbitControls.target.set(-34, 3, 12);
        // Natural earth beyond the edge of the model, so there is no empty void.
        const nc = document.createElement("canvas");
        nc.width = nc.height = 256;
        const nq = nc.getContext("2d");
        nq.fillStyle = "#7f8a66";
        nq.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2600; i++) {
          const g = 90 + Math.random() * 70;
          nq.fillStyle = `rgba(${g * 0.85},${g},${g * 0.6},0.35)`;
          nq.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 4, 2 + Math.random() * 4);
        }
        const earth = new THREE.CanvasTexture(nc);
        earth.colorSpace = THREE.SRGBColorSpace;
        earth.wrapS = earth.wrapT = THREE.RepeatWrapping;
        earth.repeat.set(400, 400);
        earth.anisotropy = 8;
        const ground = new THREE.Mesh(
          new THREE.CircleGeometry(1600, 48),
          new THREE.MeshStandardMaterial({ map: earth, roughness: 1, metalness: 0 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(0, -0.12, 0);
        ground.receiveShadow = SHADOWS;
        world.add(ground);
        // Trees in the model are exported without colour: paint them green.
        world.updateMatrixWorld(true);
        greenTrees(world, (m) => {
          m.userData.env = 0.5;
          litMaterials.add(m);
        });
        // Neighbouring buildings, people, vehicles and street lights around the market.
        if (SURROUND.enabled) {
          try {
            surroundings = buildSurroundings({
              floorMeshes,
              start: START_POSE.position,
              shadows: SHADOWS,
            });
            world.add(surroundings.group);
            floorMeshes.push(...surroundings.collidables); // walls stop the visitor
          } catch (err) {
            console.warn("Could not build the surroundings", err);
          }
        }
      } catch (err) {
        if (disposed) return;
        console.warn(
          `Could not load ${MODEL_URL}; showing the temporary street.`,
          err,
        );
        const temp = buildTempStreet(langRef.current);
        signsRef.current = temp.signs || [];
        world = temp.group;
        floorMeshes = temp.groundMeshes || temp.meshes;
        roofLights = temp.roofLights || [];
        festoonLights = temp.festoonLights || [];
      }
      scene.add(world);
      setPose(startPose);
      applyTimeOfDay(activeTime);
      // Compile shaders and upload everything to the GPU now, so the first
      // visible frame (when the visitor presses Enter) does not stall.
      renderer.compile(scene, camera);
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      requestAnimationFrame(() => {
        if (!disposed) callbacks.current.onReady?.();
      });
    };
    setPose(TEMP_START);
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
      envRT?.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
      labelRenderer.domElement.remove();
      container.classList.remove("walking");
      apiRef.current = {};
      surroundings = null;
      signsRef.current = [];
      labelsRef.current = { pins: [], arrows: [] };
    };
  }, []);

  const shopInfo = SHOPS.find((x) => x.id === selectedShop);
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
          {t("tourBrand")} <small>{t("tourSub")}</small>
        </div>
        <div className="tour-controls">
          <button type="button" onClick={toggleWalk}>
            {walkMode ? t("orbitView") : t("walkMode")}
          </button>
          {["day", "evening", "night"].map((mode) => (
            <button
              type="button"
              key={mode}
              className={timeOfDay === mode ? "active" : ""}
              onClick={() => changeTime(mode)}
            >
              {t(mode)}
            </button>
          ))}
        </div>
      </div>
      <aside className="tour-side">
        <h3>{t("exploreTitle")}</h3>
        <p>{t("exploreIntro")}</p>
        {SHOPS.map((shop) => (
          <button
            type="button"
            key={shop.id}
            className={selectedShop === shop.id ? "shop active" : "shop"}
            onClick={() => {
              setSelectedShop(shop.id);
              callbacks.current.onMarkerSelect?.(null);
            }}
          >
            <span>
              {shop.emoji} {pick(shop.name, lang)}
            </span>
            <small>{pick(shop.desc, lang)}</small>
          </button>
        ))}
        <p className="tour-hint">{t("tourHint")}</p>
      </aside>
      {shopInfo && (
        <section className="tour-info" aria-live="polite">
          <button
            type="button"
            className="tour-close"
            onClick={() => setSelectedShop(null)}
            aria-label={t("close")}
          >
            ×
          </button>
          <div className="tour-info-body">
            <h3>
              {shopInfo.emoji} {pick(shopInfo.name, lang)}
            </h3>
            <p>{pick(shopInfo.about, lang)}</p>
            <h4>{t("shopFinds")}</h4>
            <ul className="tour-chips">
              {(pick(shopInfo.items, lang) || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h4>{t("shopTip")}</h4>
            <p className="tour-tip">{pick(shopInfo.tip, lang)}</p>
          </div>
        </section>
      )}
      <style>{`
        .tour-topbar{position:absolute;z-index:5;top:16px;left:16px;right:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;pointer-events:none;font-family:Inter,Arial,sans-serif;color:#fff}
        .tour-brand,.tour-controls,.tour-side,.tour-info{background:rgba(18,22,28,.84);border:1px solid #ffffff25;border-radius:12px;box-shadow:0 8px 24px #0003}
        .tour-brand{padding:12px 16px;font-weight:700;letter-spacing:.02em}.tour-brand small{display:block;margin-top:4px;color:#d6d9dd;font-size:10px;font-weight:400;letter-spacing:.1em}
        .tour-controls{padding:8px;display:flex;gap:7px;pointer-events:auto}.tour-controls button,.tour-side button,.tour-close{border:1px solid #ffffff30;border-radius:8px;padding:9px 12px;color:white;background:#ffffff12;cursor:pointer;font-size:13px}.tour-controls button.active,.tour-side button.active{background:#e9a34b35;border-color:#e9a34b}
        .tour-side{position:absolute;z-index:5;top:100px;left:16px;width:240px;padding:14px;color:#fff;font-family:Inter,Arial,sans-serif}.tour-side h3,.tour-info h3{margin:0 0 9px;font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#f4c17e}.tour-side p,.tour-info p{margin:0 0 10px;color:#d6d9dd;font-size:12px;line-height:1.45}.tour-side .shop{display:block;width:100%;text-align:left;margin:6px 0}.tour-side .shop span,.tour-side .shop small{display:block}.tour-side .shop small{margin:4px 0 0 24px;color:#c9cdd2;font-size:10px}.tour-side .tour-hint{margin-top:10px;font-size:10px}.tour-info{position:absolute;z-index:6;right:16px;bottom:16px;width:min(300px,calc(100vw - 32px));padding:15px;color:#fff;font-family:Inter,Arial,sans-serif}.tour-close{float:right;padding:2px 9px;font-size:20px}
        @media(max-width:650px){.tour-topbar{top:8px;left:8px;right:8px;align-items:flex-start}.tour-brand{font-size:11px;padding:9px}.tour-controls{max-width:65vw;flex-wrap:wrap;justify-content:flex-end}.tour-controls button{padding:7px;font-size:11px}.tour-side{top:82px;left:8px;width:185px;padding:9px}.tour-side .shop{padding:7px;font-size:11px}.tour-side .shop small{font-size:9px}}
        .tour-info{width:min(340px,calc(100vw - 32px));max-height:calc(100vh - 130px);overflow-y:auto;padding:0}
        .tour-info-body{padding:14px 16px 16px}
        .tour-info .tour-close{position:absolute;top:8px;right:8px;float:none;z-index:1;width:30px;height:30px;padding:0;line-height:1;border-radius:50%;background:#000000a8;font-size:18px}
        .tour-info h3{margin:0 0 8px;padding-right:30px;font-size:16px;letter-spacing:.02em;text-transform:none;color:#f4c17e}
        .tour-info h4{margin:14px 0 7px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#f4c17e}
        .tour-info p{margin:0;font-size:13px;line-height:1.6;color:#e4e7ea}
        .tour-chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
        .tour-chips li{padding:4px 10px;border:1px solid #ffffff30;border-radius:999px;background:#ffffff12;color:#fff;font-size:12px}
        .tour-info .tour-tip{padding:9px 11px;border-left:3px solid #e9a34b;border-radius:6px;background:#e9a34b18}
      `}</style>
    </div>
  );
});

export default Tour;
