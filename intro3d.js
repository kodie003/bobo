// Opening scene: drifting over the solar system, then flying to the Moon.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const gate = document.getElementById("gate");
const canvas = document.getElementById("space");
const label = document.getElementById("planetLabel");

if (gate && canvas) start();

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020006);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 3000);

  const loader = new THREE.TextureLoader();
  const tex = (p) => {
    const t = loader.load(p);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };

  /* ---------- stars ---------- */
  {
    const N = 7000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const r = 500 + Math.random() * 900;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
      const k = Math.random();
      c.setHSL(k < 0.15 ? 0.6 : k < 0.3 ? 0.08 : 0, k < 0.3 ? 0.6 : 0, 0.75 + Math.random() * 0.25);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size: 1.6, vertexColors: true, sizeAttenuation: true, transparent: true, depthWrite: false, map: dotTexture() });
    scene.add(new THREE.Points(g, m));
  }

  /* ---------- burgundy nebula haze, to keep her colours ---------- */
  const neb = nebulaTexture();
  [[0x8c1c2b, -500, 80, -700, 900], [0x4a0b14, 600, -120, -500, 1000], [0xc23a4b, 200, 300, -900, 700], [0x3a1060, -700, -200, 300, 800]].forEach(([color, x, y, z, s]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: neb, color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.position.set(x, y, z);
    sp.scale.setScalar(s);
    scene.add(sp);
  });

  /* ---------- sun ---------- */
  const sunMat = new THREE.MeshBasicMaterial({ map: tex("tex/sunmap.jpg") });
  sunMat.color.setRGB(2.4, 1.5, 0.8); // push past bloom threshold, warm
  const sun = new THREE.Mesh(new THREE.SphereGeometry(6, 64, 64), sunMat);
  sun.userData.name = "the Sun";
  scene.add(sun);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff7a2e, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  corona.scale.setScalar(24);
  scene.add(corona);

  scene.add(new THREE.PointLight(0xfff1dc, 3.2, 0, 0));
  scene.add(new THREE.AmbientLight(0x30202a, 0.35));

  /* ---------- planets ---------- */
  const planets = [];
  const hoverables = [sun];
  const defs = [
    { name: "Mercury", map: "mercurymap.jpg", r: 0.8, d: 11, s: 1.6 },
    { name: "Venus", map: "venusmap.jpg", r: 1.4, d: 15, s: 1.2 },
    { name: "Earth", map: "earth.jpg", r: 1.55, d: 20, s: 1.0, earth: true },
    { name: "Mars", map: "marsmap1k.jpg", r: 1.1, d: 26, s: 0.8 },
    { name: "Jupiter", map: "jupitermap.jpg", r: 3.8, d: 36, s: 0.43 },
    { name: "Saturn", map: "saturnmap.jpg", r: 3.2, d: 48, s: 0.32, ring: true },
    { name: "Uranus", map: "uranusmap.jpg", r: 2.1, d: 58, s: 0.22 },
    { name: "Neptune", map: "neptunemap.jpg", r: 2.0, d: 66, s: 0.18 },
  ];

  let moon;
  defs.forEach((p, i) => {
    const pivot = new THREE.Object3D();
    pivot.rotation.y = i * 1.37 + 0.6;
    scene.add(pivot);

    const body = new THREE.Object3D();
    body.position.x = p.d;
    pivot.add(body);

    const mat = new THREE.MeshStandardMaterial({ map: tex("tex/" + p.map), roughness: 1, metalness: 0 });
    if (p.earth) {
      mat.normalMap = loader.load("tex/earth_normal.jpg");
      mat.normalScale.set(0.6, 0.6);
    }
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 64, 64), mat);
    mesh.rotation.z = 0.3;
    mesh.userData.name = p.name;
    body.add(mesh);
    hoverables.push(mesh);

    if (p.earth) {
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(p.r * 1.015, 64, 64),
        new THREE.MeshStandardMaterial({ map: tex("tex/earth_clouds.png"), transparent: true, opacity: 0.8, depthWrite: false })
      );
      mesh.add(clouds);
      const atmo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x4f8cff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      atmo.scale.setScalar(p.r * 3);
      body.add(atmo);

      // the Moon: NASA LRO colour + elevation maps
      const moonPivot = new THREE.Object3D();
      body.add(moonPivot);
      const disp = loader.load("tex/moon_disp.jpg");
      moon = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 256, 256),
        new THREE.MeshStandardMaterial({ map: tex("tex/moon_color.jpg"), displacementMap: disp, displacementScale: 0.012, bumpMap: disp, bumpScale: 2, roughness: 1, metalness: 0 })
      );
      moon.position.x = 3.2;
      moon.userData.name = "the Moon · your favourite";
      moonPivot.add(moon);
      hoverables.push(moon);
      p.moonPivot = moonPivot;
    }

    if (p.ring) {
      const ringTex = tex("tex/saturn_ring.png");
      const g = new THREE.RingGeometry(p.r * 1.25, p.r * 2.3, 128);
      // remap UVs so the ring texture runs from inner to outer edge
      const v = new THREE.Vector3();
      const uv = g.attributes.uv;
      for (let k = 0; k < g.attributes.position.count; k++) {
        v.fromBufferAttribute(g.attributes.position, k);
        uv.setXY(k, (v.length() - p.r * 1.25) / (p.r * 1.05), 0.5);
      }
      const ring = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, roughness: 1 }));
      ring.rotation.x = -Math.PI / 2 + 0.45;
      body.add(ring);
    }

    // faint orbit line
    const pts = [];
    for (let a = 0; a <= 256; a++) pts.push(new THREE.Vector3(Math.cos((a / 256) * Math.PI * 2) * p.d, 0, Math.sin((a / 256) * Math.PI * 2) * p.d));
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xe8c9cf, transparent: true, opacity: 0.12 }));
    scene.add(orbit);

    planets.push({ ...p, pivot, mesh });
  });

  /* ---------- post: bloom ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.35, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- interaction ---------- */
  const mouse = new THREE.Vector2(0, 0);
  const ndc = new THREE.Vector2(9, 9);
  const ray = new THREE.Raycaster();
  addEventListener("pointermove", (e) => {
    mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5);
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    label.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 12}px)`;
  });

  function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  }
  addEventListener("resize", onResize);

  /* ---------- camera: slow hover over the system ---------- */
  const narrow = () => innerWidth < 700;
  let angle = 0.9;
  const lookAt = new THREE.Vector3();
  // aim above the sun so the system sits under her name
  const focus = new THREE.Vector3(0, 12, 0);
  let flight = null; // set when flying to the moon
  const moonWorld = new THREE.Vector3();
  const clock = new THREE.Clock();
  let running = true;

  function cruisePosition(out) {
    const R = narrow() ? 110 : 78;
    const h = narrow() ? 46 : 26;
    return out.set(Math.cos(angle) * R + mouse.x * 14, h - mouse.y * 10, Math.sin(angle) * R);
  }

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const speed = flight ? 0.15 : 1; // calm the orbits while flying in

    sun.rotation.y += dt * 0.05;
    planets.forEach((p) => {
      p.pivot.rotation.y += dt * 0.12 * p.s * speed;
      p.mesh.rotation.y += dt * 0.4;
      if (p.moonPivot) p.moonPivot.rotation.y += dt * 0.6 * speed;
    });
    if (moon) {
      moon.rotation.y += dt * 0.05;
      moon.getWorldPosition(moonWorld);
    }

    if (!flight) {
      angle += dt * 0.025;
      cruisePosition(camera.position);
      lookAt.lerp(focus, 0.05);
      camera.lookAt(lookAt);
      hoverCheck();
    } else {
      const t = Math.min((performance.now() - flight.t0) / flight.dur, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // end just off the moon's lit side
      const sunDir = moonWorld.clone().normalize().negate();
      const end = moonWorld.clone().add(sunDir.multiplyScalar(0.9)).add(new THREE.Vector3(0, 0.25, 0));
      camera.position.lerpVectors(flight.from, end, e);
      lookAt.lerpVectors(flight.look, moonWorld, Math.min(e * 1.6, 1));
      camera.lookAt(lookAt);
      camera.fov = 45 - e * 10;
      camera.updateProjectionMatrix();
      if (t >= 1 && !flight.done) { flight.done = true; flight.resolve(); }
    }

    composer.render();
    requestAnimationFrame(frame);
  }

  let hovered = null;
  function hoverCheck() {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hoverables, false)[0];
    const obj = hit ? hit.object : null;
    if (obj === hovered) return;
    hovered = obj;
    canvas.style.cursor = obj ? "pointer" : "default";
    if (obj) {
      label.textContent = obj.userData.name;
      label.classList.add("show");
    } else label.classList.remove("show");
  }

  frame();

  // main.js calls these
  window.flyToMoon = () =>
    new Promise((resolve) => {
      label.classList.remove("show");
      flight = { t0: performance.now(), dur: 3400, from: camera.position.clone(), look: lookAt.clone(), resolve };
    });

  window.disposeSpace = () => {
    running = false;
    removeEventListener("resize", onResize);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
    composer.dispose?.();
    renderer.dispose();
  };
}

/* ---------- little canvas textures ---------- */
function radialTexture(stops, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function dotTexture() {
  return radialTexture([[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,.8)"], [1, "rgba(255,255,255,0)"]], 32);
}
function glowTexture() {
  return radialTexture([[0, "rgba(255,255,255,1)"], [0.2, "rgba(255,255,255,.55)"], [0.5, "rgba(255,255,255,.12)"], [1, "rgba(255,255,255,0)"]], 256);
}
function nebulaTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  for (let i = 0; i < 40; i++) {
    const x = size / 2 + (Math.random() - 0.5) * size * 0.5;
    const y = size / 2 + (Math.random() - 0.5) * size * 0.5;
    const r = 60 + Math.random() * 160;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(255,255,255,.08)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
