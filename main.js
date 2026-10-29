// Sela's 21st — interactions
(() => {
  const BIRTHDAY = new Date(2026, 9, 29, 0, 0, 0); // 29 Oct 2026, local time
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- gate ---------------- */
  const gate = document.getElementById("gate");
  const openBtn = document.getElementById("openBtn");
  document.body.classList.add("locked");
  function closeGate() {
    gate.remove();
    window.disposeSpace?.();
  }
  if (new URLSearchParams(location.search).has("skip")) { // handy while testing
    document.body.classList.remove("locked");
    addEventListener("load", closeGate);
    gate.style.display = "none";
  }

  openBtn.addEventListener("click", async () => {
    if (openBtn.disabled) return;
    openBtn.disabled = true;
    openBtn.classList.add("cracked");
    gate.classList.add("flying");
    // fly through the solar system to the moon (intro3d.js), if WebGL is up
    if (window.flyToMoon) await window.flyToMoon();
    gate.classList.add("open");
    document.body.classList.remove("locked");
    scrollTo(0, 0);
    setTimeout(() => burstBubbles(innerWidth / 2, innerHeight / 2, 26), 300);
    setTimeout(closeGate, 1600);
  });

  /* ---------------- countdown ---------------- */
  const cd = document.getElementById("countdown");
  const cdDone = document.getElementById("countdownDone");
  const units = {
    d: cd.querySelector('[data-u="d"]'),
    h: cd.querySelector('[data-u="h"]'),
    m: cd.querySelector('[data-u="m"]'),
    s: cd.querySelector('[data-u="s"]'),
  };
  const pad = (n) => String(n).padStart(2, "0");

  function tick() {
    const diff = BIRTHDAY - new Date();
    if (diff <= 0) {
      cd.hidden = true;
      cdDone.hidden = false;
      return false;
    }
    const s = Math.floor(diff / 1000);
    units.d.textContent = pad(Math.floor(s / 86400));
    units.h.textContent = pad(Math.floor((s % 86400) / 3600));
    units.m.textContent = pad(Math.floor((s % 3600) / 60));
    units.s.textContent = pad(s % 60);
    return true;
  }
  if (tick()) {
    const timer = setInterval(() => { if (!tick()) clearInterval(timer); }, 1000);
  }

  /* ---------------- reveal on scroll ---------------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------------- moon parallax ---------------- */
  const moon = document.querySelector(".hero .moon");
  if (moon && !reduceMotion) {
    addEventListener("scroll", () => {
      const y = scrollY;
      if (y < innerHeight * 1.2) moon.style.transform = `translateY(${y * 0.35}px)`;
    }, { passive: true });
  }

  /* ---------------- torn paper edges ---------------- */
  function tornPolygon(jag = 3.5, steps = 18) {
    const pts = [];
    const r = () => Math.random() * jag;
    for (let i = 0; i <= steps; i++) pts.push(`${(i / steps) * 100}% ${r()}%`);
    for (let i = 1; i <= steps; i++) pts.push(`${100 - r() * 0.6}% ${(i / steps) * 100}%`);
    for (let i = steps; i >= 0; i--) pts.push(`${(i / steps) * 100}% ${100 - r()}%`);
    for (let i = steps - 1; i > 0; i--) pts.push(`${r() * 0.6}% ${(i / steps) * 100}%`);
    return `polygon(${pts.join(",")})`;
  }
  document.querySelectorAll(".torn").forEach((el) => (el.style.clipPath = tornPolygon()));

  /* ---------------- newspaper clippings ---------------- */
  const story =
    "Sources confirm that on the 29th of October a certain Sela turned twenty-one and the moon was seen glowing a little brighter than usual. " +
    "Friends report she remains kind, caring and strong. Witnesses describe her laugh as contagious and her eyes as the best part of any room. " +
    "Officials advise the public to celebrate accordingly. More on page 21. ";
  document.querySelectorAll(".news").forEach((n) => {
    n.innerHTML = `<h4>THE SELA TIMES</h4><p>${story.repeat(6)}</p>`;
  });

  /* ---------------- turnable pages (both scrapbooks) ---------------- */
  document.querySelectorAll(".stack").forEach((stack) => {
    const leaves = [...stack.querySelectorAll(".leaf")];
    let turned = 0; // how many leaves are over on the left
    let busy = false;
    let soundOn = true;
    let audio = null;
    const bar = document.querySelector(`.book-bar[data-for="${stack.id}"]`);
    const count = bar?.querySelector(".book-bar__count");

    // paper page-turn sound, synthesised so there is no file to load
    function paperSound() {
      if (!soundOn) return;
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
        const t = audio.currentTime;
        const len = 0.5;
        const buf = audio.createBuffer(1, audio.sampleRate * len, audio.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.04 ? 1 : 0.45);
        const src = audio.createBufferSource();
        src.buffer = buf;
        const band = audio.createBiquadFilter();
        band.type = "bandpass";
        band.Q.value = 0.8;
        band.frequency.setValueAtTime(3200, t);
        band.frequency.exponentialRampToValueAtTime(700, t + len);
        const g = audio.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.45, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.15, t + 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        // soft thump as the page lands
        const thump = audio.createOscillator();
        const tg = audio.createGain();
        thump.frequency.setValueAtTime(140, t + 0.8);
        thump.frequency.exponentialRampToValueAtTime(60, t + 0.95);
        tg.gain.setValueAtTime(0.0001, t);
        tg.gain.setValueAtTime(0.0001, t + 0.78);
        tg.gain.exponentialRampToValueAtTime(0.18, t + 0.82);
        tg.gain.exponentialRampToValueAtTime(0.0001, t + 1);
        src.connect(band).connect(g).connect(audio.destination);
        thump.connect(tg).connect(audio.destination);
        src.start(t);
        thump.start(t);
        thump.stop(t + 1.05);
      } catch (_) { /* no audio available: turn silently */ }
    }
    function updateCount() {
      if (count) count.textContent = `${turned + 1} / ${leaves.length + 1}`;
    }

    function layer() {
      leaves.forEach((l, i) => {
        // unturned: first leaf on top; turned: last-turned on top
        l.style.zIndex = i < turned ? 10 + i : 10 + leaves.length - i;
        l.classList.toggle("next", i === turned);
      });
    }
    function turn(dir) {
      if (busy) return;
      const i = dir > 0 ? turned : turned - 1;
      const leaf = leaves[i];
      if (!leaf) return;
      busy = true;
      paperSound();
      stack.querySelectorAll("video").forEach((v) => v.pause());
      leaf.style.zIndex = 100; // ride above everything while moving
      leaf.classList.add("turning");
      leaf.classList.toggle("flipped", dir > 0);
      turned += dir;
      updateCount();
      let finished = false;
      const done = (e) => {
        if (finished || (e && (e.target !== leaf || e.propertyName !== "transform"))) return;
        finished = true;
        leaf.removeEventListener("transitionend", done);
        leaf.classList.remove("turning");
        layer();
        busy = false;
      };
      leaf.addEventListener("transitionend", done);
      setTimeout(done, 1400); // in case the browser skips transitionend (background tab)
    }
    // pages that have turned sit over the left page, so a click there goes back
    function onLeftSide(x) {
      const r = stack.getBoundingClientRect();
      const stacked = getComputedStyle(stack).getPropertyValue("--gutter").trim() === "20px";
      return stacked ? false : x < r.left;
    }
    stack.addEventListener("click", (e) => {
      // photos open the lightbox; buttons and the video do their own thing
      if (e.target.closest("img, button, video, .no-flip")) return;
      if (onLeftSide(e.clientX) || e.target.closest(".face--back")) turn(-1);
      else turn(1);
    });
    let sx = null;
    stack.addEventListener("pointerdown", (e) => (sx = e.target.closest(".no-flip") ? null : e.clientX));
    stack.addEventListener("pointerup", (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) { turn(dx < 0 ? 1 : -1); stack.dataset.swiped = "1"; }
    });
    stack.addEventListener("click", (e) => {
      if (stack.dataset.swiped) { delete stack.dataset.swiped; e.stopImmediatePropagation(); }
    }, true);
    addEventListener("keydown", (e) => {
      // only the book whose middle is on screen listens to the arrow keys
      const r = stack.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (mid < 0 || mid > innerHeight || !lb.hidden) return;
      if (e.key === "ArrowRight") turn(1);
      if (e.key === "ArrowLeft") turn(-1);
    });
    bar?.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.book === "prev") turn(-1);
      if (b.dataset.book === "next") turn(1);
      if (b.dataset.book === "sound") {
        soundOn = !soundOn;
        b.setAttribute("aria-pressed", String(soundOn));
      }
    });
    layer();
    updateCount();
  });

  /* ---------------- the time pill video ---------------- */
  document.querySelectorAll(".pill").forEach((pill) => {
    const v = pill.querySelector("video");
    const bar = pill.querySelector(".pill__progress i");
    const toggle = () => (v.paused ? v.play() : v.pause());
    pill.querySelector(".pill__play").addEventListener("click", toggle);
    v.addEventListener("click", toggle);
    v.addEventListener("play", () => pill.classList.add("playing"));
    v.addEventListener("pause", () => pill.classList.remove("playing"));
    v.addEventListener("ended", () => { pill.classList.remove("playing"); v.currentTime = 0; });
    v.addEventListener("timeupdate", () => { bar.style.width = (v.currentTime / (v.duration || 1)) * 100 + "%"; });
  });

  /* ---------------- fit the photo clusters inside their pages ---------------- */
  function fitClusters() {
    document.querySelectorAll(".cluster").forEach((c) => {
      let inset = 0;
      c.style.setProperty("--inset", "0px");
      // an overflowing multi-column box grows sideways, so squeeze until it doesn't
      while (c.scrollWidth > c.clientWidth + 1 && inset < c.clientWidth * 0.3) {
        inset += 4;
        c.style.setProperty("--inset", inset + "px");
      }
    });
  }
  addEventListener("load", fitClusters);
  addEventListener("resize", fitClusters);
  fitClusters();

  /* ---------------- film strip loop ---------------- */
  const track = document.querySelector(".film__track");
  if (track) track.innerHTML += track.innerHTML;

  /* ---------------- lightbox ---------------- */
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector("img");
  document.addEventListener("click", (e) => {
    const img = e.target.closest(".page img, .phase__img img, .film__track img, .letter__pic img, .hero__arch img");
    if (!img || img.closest("button")) return;
    lbImg.src = img.src;
    lb.hidden = false;
  });
  lb.addEventListener("click", () => (lb.hidden = true));
  addEventListener("keydown", (e) => { if (e.key === "Escape") lb.hidden = true; });

  /* ---------------- cake + confetti ---------------- */
  const cake = document.getElementById("cake");
  const wishMsg = document.getElementById("wishMsg");
  function blow() {
    if (cake.classList.contains("out")) {
      cake.classList.remove("out"); // relight for another go
      wishMsg.classList.remove("show");
      return;
    }
    cake.classList.add("out");
    wishMsg.textContent = "Happy birthday, Sela. I love you.";
    wishMsg.classList.add("show");
    confetti(140);
    const r = cake.getBoundingClientRect();
    burstBubbles(r.left + r.width / 2, r.top, 30);
  }
  cake.addEventListener("click", blow);
  cake.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); blow(); } });

  function confetti(n) {
    if (reduceMotion) return;
    const colors = ["#6b0f1a", "#8c1c2b", "#fffaf3", "#c9a55a", "#f3d9dd"];
    for (let i = 0; i < n; i++) {
      const c = document.createElement("span");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.setProperty("--dx", (Math.random() - 0.5) * 300 + "px");
      c.style.setProperty("--rot", Math.random() * 1080 + "deg");
      c.style.animationDuration = 2.5 + Math.random() * 2.5 + "s";
      c.style.animationDelay = Math.random() * 0.6 + "s";
      if (Math.random() > 0.6) c.style.borderRadius = "50%";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 6000);
    }
  }

  /* ================================================================
     BUBBLES — iridescent soap bubbles drifting up; click/tap to pop
     ================================================================ */
  const canvas = document.getElementById("bubbles");
  const ctx = canvas.getContext("2d");
  let W, H, dpr;
  const bubbles = [];
  const shards = [];
  const MAX = innerWidth < 600 ? 14 : 26;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener("resize", resize);

  function makeBubble(x, y, fromBurst) {
    const r = fromBurst ? 8 + Math.random() * 22 : 12 + Math.random() * 38;
    return {
      x: x ?? Math.random() * W,
      y: y ?? H + r + Math.random() * H * 0.5,
      r,
      vx: fromBurst ? (Math.random() - 0.5) * 4 : (Math.random() - 0.5) * 0.3,
      vy: fromBurst ? -1 - Math.random() * 3 : -(0.25 + Math.random() * 0.6),
      wob: Math.random() * Math.PI * 2,
      hue: Math.random() * 360,
      life: fromBurst ? 240 + Math.random() * 200 : Infinity,
    };
  }
  for (let i = 0; i < MAX; i++) {
    const b = makeBubble();
    b.y = Math.random() * H; // start scattered
    bubbles.push(b);
  }

  function burstBubbles(x, y, n) {
    for (let i = 0; i < n; i++) bubbles.push(makeBubble(x, y, true));
  }

  function drawBubble(b) {
    const { x, y, r } = b;
    // thin film body
    const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    body.addColorStop(0, "rgba(255,255,255,0.02)");
    body.addColorStop(0.75, "rgba(255,240,245,0.06)");
    body.addColorStop(0.92, `hsla(${b.hue},90%,80%,0.28)`);
    body.addColorStop(1, `hsla(${(b.hue + 60) % 360},90%,85%,0.5)`);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();

    // iridescent rim
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.strokeStyle = `hsla(${(b.hue + 140) % 360},80%,85%,0.45)`;
    ctx.stroke();

    // highlights
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.11, -0.7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.42, y + r * 0.4, r * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();
  }

  function pop(b) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      shards.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 1, hue: b.hue });
    }
  }

  // canvas ignores pointer events, so hit-test bubbles from the document
  addEventListener("pointerdown", (e) => {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (Math.hypot(e.clientX - b.x, e.clientY - b.y) < b.r + 6) {
        pop(b);
        bubbles.splice(i, 1);
        if (bubbles.length < MAX) bubbles.push(makeBubble());
        break;
      }
    }
  });

  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.wob += 0.02;
      b.x += b.vx + Math.sin(b.wob) * 0.35;
      b.y += b.vy;
      b.vx *= 0.99;
      b.hue = (b.hue + 0.4) % 360;
      if (b.life !== Infinity && --b.life <= 0) { pop(b); bubbles.splice(i, 1); continue; }
      if (b.y < -b.r * 2) {
        if (b.life === Infinity) Object.assign(b, makeBubble());
        else { bubbles.splice(i, 1); continue; }
      }
      drawBubble(b);
    }
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      s.x += s.vx; s.y += s.vy; s.life -= 0.04;
      if (s.life <= 0) { shards.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue},90%,85%,${s.life})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  if (reduceMotion) bubbles.forEach(drawBubble);
  else requestAnimationFrame(frame);
})();
