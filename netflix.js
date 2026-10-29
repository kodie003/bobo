// Netflix-style player for the episodes inside the book
(() => {
  const player = document.getElementById("player");
  const book = document.getElementById("usStack");
  if (!player || !book) return;

  const EPISODES = [
    { id: "memories", title: "Memories Vlog." },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `ep${i + 1}`, title: `Episode ${i + 1}` })),
  ];
  const video = player.querySelector("video");
  const fill = player.querySelector(".nfp__fill");
  const knob = player.querySelector(".nfp__knob");
  const time = player.querySelector(".nfp__time");
  const title = player.querySelector(".nfp__title");
  const eps = player.querySelector(".nfp__eps");
  const epsList = eps.querySelector("ol");
  let current = -1;
  let idleTimer;

  epsList.innerHTML = EPISODES.map(
    (ep, i) => `<li><button data-ep="${i}"><img src="videos/${ep.id}.jpg" alt="" />${ep.title}</button></li>`
  ).join("");

  function open(i, showList = false) {
    current = i;
    const ep = EPISODES[i];
    video.src = `videos/${ep.id}.mp4`;
    video.poster = `videos/${ep.id}.jpg`;
    title.textContent = ep.title;
    epsList.querySelectorAll("button").forEach((b) => b.classList.toggle("current", +b.dataset.ep === i));
    player.hidden = false;
    eps.hidden = !showList;
    document.body.style.overflow = "hidden";
    document.body.classList.add("watching");
    book.querySelectorAll("video").forEach((v) => v.pause());
    video.play().catch(() => {});
    poke();
  }
  function close() {
    video.pause();
    video.removeAttribute("src");
    video.load();
    player.hidden = true;
    document.body.style.overflow = "";
    document.body.classList.remove("watching");
    if (document.fullscreenElement === player) document.exitFullscreen();
  }
  function toggle() { video.paused ? video.play() : video.pause(); }
  function poke() {
    player.classList.remove("idle");
    clearTimeout(idleTimer);
    // the vlog has its own Netflix bar baked in, so get out of its way sooner
    const wait = EPISODES[current]?.id === "memories" ? 1200 : 2500;
    idleTimer = setTimeout(() => { if (!video.paused && eps.hidden) player.classList.add("idle"); }, wait);
  }
  const fmt = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    return [s / 3600, (s % 3600) / 60, s % 60].map((n) => String(Math.floor(n)).padStart(2, "0")).join(":");
  };

  video.addEventListener("play", () => { player.classList.add("playing"); poke(); });
  video.addEventListener("pause", () => { player.classList.remove("playing"); poke(); });
  video.addEventListener("timeupdate", () => {
    const p = video.duration ? (video.currentTime / video.duration) * 100 : 0;
    fill.style.width = p + "%";
    knob.style.left = p + "%";
    time.textContent = fmt(video.duration - video.currentTime);
  });
  video.addEventListener("ended", () => {
    if (current < EPISODES.length - 1) open(current + 1);
    else close();
  });

  player.addEventListener("pointermove", poke);
  player.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.ep) return open(+b.dataset.ep, true);
    switch (b.dataset.act) {
      case "close": close(); break;
      case "toggle": toggle(); break;
      case "back10": video.currentTime = Math.max(0, video.currentTime - 10); break;
      case "fwd10": video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); break;
      case "episodes": eps.hidden = !eps.hidden; poke(); break;
      case "mute":
        video.muted = !video.muted;
        player.classList.toggle("muted", video.muted);
        break;
      case "next": open((current + 1) % EPISODES.length); break;
      case "full":
        if (document.fullscreenElement) document.exitFullscreen();
        else player.requestFullscreen?.();
        break;
    }
  });

  // drag along the red bar to scrub
  const bar = player.querySelector(".nfp__progress");
  bar.addEventListener("pointerdown", (e) => {
    const seek = (ev) => {
      const r = bar.getBoundingClientRect();
      const p = Math.min(Math.max((ev.clientX - r.left) / r.width, 0), 1);
      if (video.duration) video.currentTime = p * video.duration;
    };
    seek(e);
    bar.setPointerCapture(e.pointerId);
    bar.onpointermove = seek;
    bar.onpointerup = () => (bar.onpointermove = null);
  });
  addEventListener("keydown", (e) => {
    if (player.hidden) return;
    e.stopImmediatePropagation(); // don't turn book pages behind the player
    if (e.key === "Escape") close();
    if (e.key === " ") { e.preventDefault(); toggle(); }
    if (e.key === "ArrowRight") video.currentTime += 10;
    if (e.key === "ArrowLeft") video.currentTime -= 10;
  }, true);

  // buttons on the Netflix pages of the book
  book.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.video) open(EPISODES.findIndex((ep) => ep.id === b.dataset.video));
    if ("episodes" in b.dataset) open(1, true);
    if ("info" in b.dataset) {
      const info = b.closest(".nf-series__body").querySelector(".nf-info");
      info.hidden = !info.hidden;
    }
  });
})();
