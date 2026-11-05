import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import { nodes, START_NODE, getNode } from '../data/nodes.js';
import { pick } from '../i18n.jsx';

// ---- settings --------------------------------------------------------------
const MODEL_URL = '/models/market.glb'; // put your exported model in public/models/
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

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// ---- temporary street, used until public/models/market.glb exists ---------
function buildTempStreet() {
  const group = new THREE.Group();
  const meshes = [];
  const mat = (color, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness });
  const box = (w, h, d, x, y, z, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    group.add(m);
    meshes.push(m);
    return m;
  };

  box(13, 0.12, 75, 0, -0.08, -27, 0x9c9a96); // street
  for (let z = -62; z < 9; z += 8) {
    box(4.8, 2.8, 6, -8.6, 1.45, z, 0x4faaa7);
    box(4.8, 0.18, 6, -8.6, 2.95, z, 0xeeeeea);
    box(4.8, 2.8, 6, 8.6, 1.45, z, 0xc78d25);
    box(4.8, 0.18, 6, 8.6, 2.95, z, 0xe9e5df);
  }
  box(1.1, 6, 1.1, -11, 3, -25, 0xd6d2ca);
  box(1.1, 6, 1.1, 11, 3, -25, 0xd6d2ca);
  box(23, 0.5, 1, 0, 6, -25, 0xd6d2ca);

  // open entrance gateway
  const gateZ = -2, gateW = 7.2, gateH = 7.2, openingW = 4.2, springH = 3.7, depth = 1.0;
  const stone = mat(0xb9a58b, 0.9);
  const trim = mat(0xd3c2a5, 0.82);
  const pierW = (gateW - openingW) / 2;
  const leftPier = new THREE.Mesh(new THREE.BoxGeometry(pierW, gateH, depth), stone);
  leftPier.position.set(-(openingW / 2 + pierW / 2), gateH / 2, gateZ);
  const rightPier = leftPier.clone();
  rightPier.position.x = openingW / 2 + pierW / 2;
  group.add(leftPier, rightPier);
  meshes.push(leftPier, rightPier);

  const outerR = openingW / 2 + 0.38, innerR = openingW / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-outerR, 0);
  shape.lineTo(-outerR, springH);
  shape.absarc(0, springH, outerR, Math.PI, 0, true);
  shape.lineTo(outerR, 0);
  shape.lineTo(innerR, 0);
  shape.lineTo(innerR, springH);
  shape.absarc(0, springH, innerR, 0, Math.PI, false);
  shape.lineTo(-innerR, 0);
  shape.closePath();
  const arch = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 36 }),
    trim
  );
  arch.position.set(0, 0, gateZ - depth / 2);
  group.add(arch);
  meshes.push(arch);

  box(gateW + 0.45, 0.32, depth + 0.25, 0, gateH - 0.16, gateZ, 0x8d7961);
  box(gateW + 0.7, 0.18, depth + 0.4, 0, gateH + 0.12, gateZ, 0xd3c2a5);
  box(openingW + 0.5, 0.5, 0.12, 0, gateH - 0.72, gateZ - depth / 2 - 0.08, 0x9b8668);

  return { group, meshes };
}

// ---- component -------------------------------------------------------------
// Same interface as the old panorama Tour, so App.jsx needs no changes.
const Tour = forwardRef(function Tour(
  { lang, onMarkerSelect, onSceneChange, onReady },
  ref
) {
  const containerRef = useRef(null);
  const apiRef = useRef({});
  const labelsRef = useRef({ pins: [], arrows: [] });

  const callbacks = useRef({});
  callbacks.current = { onMarkerSelect, onSceneChange, onReady };
  const langRef = useRef(lang);
  langRef.current = lang;

  useImperativeHandle(
    ref,
    () => ({
      goTo: (id) => apiRef.current.goTo?.(id),
      zoomIn: () => apiRef.current.zoomBy?.(-ZOOM_STEP),
      zoomOut: () => apiRef.current.zoomBy?.(ZOOM_STEP),
      recenter: () => apiRef.current.recenter?.(),
    }),
    []
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
      500
    );
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initial.w, initial.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(initial.w, initial.h);
    Object.assign(labelRenderer.domElement.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none',
    });
    container.appendChild(labelRenderer.domElement);

    scene.add(new THREE.HemisphereLight(0xeaf5ff, 0x64533d, 2.0));
    const sun = new THREE.DirectionalLight(0xffe2b4, 2.2);
    sun.position.set(-12, 24, 8);
    scene.add(sun);

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
        x: camera.position.x, y: camera.position.y, z: camera.position.z,
        yaw, pitch, fov: camera.fov,
      };
      // turn the short way round
      const d = ((((pose.yaw - yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
      const to = { ...pose, yaw: yaw + d };
      addTween(
        ms / 1000,
        (k) => {
          camera.position.set(
            from.x + (to.x - from.x) * k,
            from.y + (to.y - from.y) * k,
            from.z + (to.z - from.z) * k
          );
          yaw = from.yaw + (to.yaw - from.yaw) * k;
          pitch = from.pitch + (to.pitch - from.pitch) * k;
          if (to.fov != null) {
            camera.fov = from.fov + (to.fov - from.fov) * k;
            camera.updateProjectionMatrix();
          }
          applyView();
        },
        done
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
        container.classList.add('walking');
        flyTo({ x, y, z, yaw: (n.camera.yaw || 0) * DEG, pitch: (n.camera.pitch || 0) * DEG, fov: FOV_DEFAULT }, 1800, () => {
          container.classList.remove('walking');
          setCurrent(id);
        });
      },
      zoomBy(delta) {
        const from = camera.fov;
        const to = Math.min(FOV_MAX, Math.max(FOV_MIN, from + delta));
        addTween(0.4, (k) => {
          camera.fov = from + (to - from) * k;
          camera.updateProjectionMatrix();
        });
      },
      recenter() {
        flyTo(
          {
            x: camera.position.x, y: camera.position.y, z: camera.position.z,
            yaw: nodeYaw(currentNodeId),
            pitch: (getNode(currentNodeId)?.camera.pitch || 0) * DEG,
            fov: FOV_DEFAULT,
          },
          700
        );
      },
    };

    // --- pins (stall info) and arrows (walk to another spot)
    labelsRef.current = { pins: [], arrows: [] };
    const labelObjects = [];

    nodes.forEach((n) => {
      (n.markers || []).forEach((m) => {
        const el = document.createElement('div');
        el.className = 'stall-pin';
        el.textContent = '🛒';
        el.title = pick(m.title, langRef.current);
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
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
        const el = document.createElement('button');
        el.className = 'nav-pin';
        el.type = 'button';
        el.textContent = '▲';
        const target = getNode(l.nodeId);
        el.title = target ? pick(target.name, langRef.current) : '';
        el.style.pointerEvents = 'auto';
        el.addEventListener('click', (e) => {
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

    // --- input: drag to look, wheel to zoom, tap floor to walk, keys to move
    const canvas = renderer.domElement;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    const raycaster = new THREE.Raycaster();

    const onPointerDown = (e) => {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
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
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = 'grab';
      if (moved > 5) return;

      // a tap: close the info card, and walk to the tapped spot if it is floor
      callbacks.current.onMarkerSelect?.(null);
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(floorMeshes, false)[0];
      if (!hit || !hit.face || hit.distance > 40) return;
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (normal.y < 0.7) return; // wall or ceiling: do not walk through it
      flyTo(
        { x: hit.point.x, y: hit.point.y + EYE_HEIGHT, z: hit.point.z, yaw, pitch },
        900
      );
    };
    const onWheel = (e) => {
      e.preventDefault();
      camera.fov = Math.min(FOV_MAX, Math.max(FOV_MIN, camera.fov + Math.sign(e.deltaY) * 3));
      camera.updateProjectionMatrix();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const keys = {};
    const onKeyDown = (e) => {
      keys[e.key.toLowerCase()] = true;
      // Press P to print the current camera pose: handy for placing spots in nodes.js
      if (e.key.toLowerCase() === 'p') {
        const p = camera.position;
        console.log(
          `camera: { position: [${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}], yaw: ${Math.round(yaw / DEG)}, pitch: ${Math.round(pitch / DEG)} }`
        );
      }
    };
    const onKeyUp = (e) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

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
      const forward = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
      const strafe = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      const turn = (keys.arrowleft ? 1 : 0) - (keys.arrowright ? 1 : 0);
      if (forward || strafe || turn) {
        tweens.length = 0;
        container.classList.remove('walking');
        yaw += turn * TURN_SPEED * dt;
        fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        right.set(Math.cos(yaw), 0, -Math.sin(yaw));
        camera.position.addScaledVector(fwd, forward * MOVE_SPEED * dt);
        camera.position.addScaledVector(right, strafe * MOVE_SPEED * dt);
        applyView();
      }

      // show only nearby pins/arrows
      labelObjects.forEach(({ obj, range }) => {
        obj.visible = obj.position.distanceTo(camera.position) < range;
      });

      // keep "You are at" correct while walking freely
      if (++frame % 15 === 0 && !tweens.length) {
        let best = currentNodeId;
        let bestD = Infinity;
        nodes.forEach((n) => {
          const d = camera.position.distanceTo(new THREE.Vector3(...n.camera.position));
          if (d < bestD) { bestD = d; best = n.id; }
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
        world.traverse((o) => { if (o.isMesh) meshes.push(o); });
        floorMeshes = meshes;
      } catch (err) {
        if (disposed) return;
        console.warn(`Could not load ${MODEL_URL}; showing the temporary street.`, err);
        const temp = buildTempStreet();
        world = temp.group;
        floorMeshes = temp.meshes;
      }
      scene.add(world);
      setPose(getNode(START_NODE).camera);
      requestAnimationFrame(() => {
        if (!disposed) callbacks.current.onReady?.();
      });
    };
    setPose(getNode(START_NODE).camera);
    init();

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => {
          Object.values(m).forEach((v) => v?.isTexture && v.dispose());
          m.dispose();
        });
      });
      renderer.dispose();
      canvas.remove();
      labelRenderer.domElement.remove();
      container.classList.remove('walking');
      apiRef.current = {};
      labelsRef.current = { pins: [], arrows: [] };
    };
  }, []);

  return (
    <div
      className="tour"
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}
    />
  );
});

export default Tour;
