// Realistic hero moon: NASA LRO colour map + LOLA elevation (displacement + bump)
import * as THREE from "three";

const host = document.querySelector(".hero .moon");
if (host) {
  try { start(host); } catch (e) { console.warn("moon3d:", e); }
}

function start(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  host.appendChild(renderer.domElement);
  host.classList.add("is-3d");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 4.1);

  const loader = new THREE.TextureLoader();
  const map = loader.load("tex/moon_color.jpg");
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const disp = loader.load("tex/moon_disp.jpg");

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1, 256, 256),
    new THREE.MeshStandardMaterial({ map, displacementMap: disp, displacementScale: 0.025, bumpMap: disp, bumpScale: 3, roughness: 1, metalness: 0 })
  );
  moon.rotation.set(0.12, -1.6, 0.05);
  scene.add(moon);

  // sunlight from the upper left gives a waxing-gibbous terminator with crater shadows
  const sunLight = new THREE.DirectionalLight(0xfff4e6, 3.2);
  sunLight.position.set(-4, 1.5, 2.2);
  scene.add(sunLight);
  // faint burgundy "earthshine" on the dark side
  scene.add(new THREE.AmbientLight(0x8c1c2b, 0.25));

  function size() {
    const w = host.clientWidth;
    renderer.setSize(w, w, false);
    renderer.domElement.style.width = renderer.domElement.style.height = "100%";
  }
  size();
  addEventListener("resize", size);

  // drag gently with the pointer
  let tx = 0, ty = 0;
  addEventListener("pointermove", (e) => {
    tx = (e.clientX / innerWidth - 0.5) * 0.5;
    ty = (e.clientY / innerHeight - 0.5) * 0.3;
  });

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(host);

  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    if (!visible) return;
    moon.rotation.y += dt * 0.04;
    moon.rotation.x += (0.12 + ty - moon.rotation.x) * 0.03;
    sunLight.position.x = -4 + tx * 3;
    renderer.render(scene, camera);
  })();
}
