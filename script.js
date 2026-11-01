/* =====================================================================
   SCRIPT — makes the site work.
   ---------------------------------------------------------------------
   You normally don't need to edit this file.
   The only part you might want to change is MENU & FOOTER (just below):
   it is shared by every page, so changing it here changes it everywhere.

   Photos and videos are set in photos-and-videos.js, not here.
   ===================================================================== */


/* ---------------------------------------------------------------------
   MENU & FOOTER  — safe to edit
   --------------------------------------------------------------------- */
const EMAIL = "info@toucancreative.tech";

const MENU = [
  { text: "Work",            link: "#work" },
  // { text: "Videos",          link: "#videos" },   // hidden for now — remove the // to show
  // { text: "Who I work with", link: "#who" },      // hidden for now — remove the // to show
  { text: "About",           link: "#about" },
];

// Landing pages, listed in the footer of every page
const LANDING_PAGES = [
  { text: "Artists",                  link: "artists.html" },
  { text: "Companies & commissions",  link: "companies.html" },
  { text: "Galleries & museums",      link: "galleries-museums.html" },
  { text: "Brand experiences",        link: "brand-experiences.html" },
  { text: "Retail & visual merchandising", link: "retail.html" },
  { text: "Creative studios",         link: "creative-studios.html" },
  { text: "Events",                   link: "events.html" },
  { text: "Crazy golf",               link: "crazy-golf.html" },
  { text: "Prototyping",              link: "prototyping.html" },
];


/* =====================================================================
   Everything below here is the machinery. Edit with care.
   ===================================================================== */

const isHomePage = document.body.dataset.page === "home";

// On landing pages, menu links like "#work" need to point back to the home page
function homeLink(link) {
  return link.startsWith("#") && !isHomePage ? "index.html" + link : link;
}


/* ---------- Header ---------- */
function buildHeader() {
  const spot = document.querySelector("[data-site-header]");
  if (!spot) return;

  const menuLinks = MENU.map(item => `<a href="${homeLink(item.link)}">${item.text}</a>`).join("");
  const contactLink = "#contact"; // every page has its own contact section at the bottom

  spot.outerHTML = `
    <header class="site-header">
      <a class="brand" href="${isHomePage ? "#top" : "index.html"}" aria-label="Toucan Creative Technology home">
        <img class="logo" src="images/toucan_horizontal_small_logo_big_text.png" alt="Toucan Creative Technology">
      </a>
      <button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">Menu</button>
      <nav id="main-nav" class="nav" aria-label="Main menu">
        ${menuLinks}
        <a class="nav-cta" href="${contactLink}">Start a project</a>
      </nav>
    </header>`;

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#main-nav");
  const setOpen = open => {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
  };
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setOpen(false)));
}


/* ---------- Footer ---------- */
function buildFooter() {
  const spot = document.querySelector("[data-site-footer]");
  if (!spot) return;

  const pageLinks = LANDING_PAGES.map(p => `<a href="${p.link}">${p.text}</a>`).join("");

  spot.outerHTML = `
    <footer class="footer">
      <div>
        <div class="footer-brand">TOUCAN</div>
        <p>Creative technical collaboration for interactive art and physical experiences.</p>
        <p><a href="mailto:${EMAIL}">${EMAIL}</a></p>
      </div>
      <nav class="footer-links" aria-label="Who I work with">
        <a href="${isHomePage ? "#top" : "index.html"}">Home</a>
        ${pageLinks}
      </nav>
      <p class="copyright">© ${new Date().getFullYear()} Toucan Creative Technology</p>
    </footer>`;
}


/* ---------- Photos ----------
   Makes a photo frame. If the file is missing, the frame shows the
   expected file name instead of a broken image. */
function makeFrame(photo, extraClass = "") {
  const fig = document.createElement("figure");
  fig.className = `frame ${extraClass}`.trim();
  if (!photo || !photo.file && !photo.photo) {
    fig.classList.add("is-empty");
    return fig;
  }
  const file = photo.file || photo.photo;
  fig.dataset.file = file;
  if (photo.focus) fig.style.setProperty("--focus", photo.focus);
  if (photo.showWhole) fig.classList.add("show-whole");
  if (photo.blackAndWhite) fig.classList.add("black-and-white");

  const img = document.createElement("img");
  img.src = file;
  img.alt = photo.alt || photo.caption || "";
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("error", () => fig.classList.add("is-empty"));
  fig.appendChild(img);
  return fig;
}

/* Makes a video frame for a slide.
   Every video plays by itself on a loop while it's on screen.
   Videos are silent, except withSound: true -> plays with sound and shows the controls. */
const prefersLessMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function makeVideoFrame(s) {
  const fig = document.createElement("figure");
  fig.className = "frame";
  fig.dataset.file = s.video;

  const video = document.createElement("video");
  video.preload = "none";          // nothing downloads until it's needed
  video.playsInline = true;
  video.muted = true;              // browsers only allow videos to start by themselves when muted
  video.setAttribute("muted", "");
  video.loop = true;
  if (s.poster) video.poster = s.poster;

  if (prefersLessMotion) {
    video.controls = true;         // visitor has asked for less motion: let them press play
  } else {
    video.dataset.autoplay = "";
    if (s.withSound) { video.controls = true; video.dataset.sound = ""; }
    else video.disablePictureInPicture = true;
  }
  video.src = s.video;
  video.addEventListener("error", () => fig.classList.add("is-empty"));
  fig.appendChild(video);
  return fig;
}

// Plays videos only while they're on screen, pauses them otherwise.
// Browsers won't play sound until the visitor has clicked or tapped something on
// the page. Until then a "withSound" video plays muted, and its sound comes on at
// the visitor's first click or tap (clicking the slider arrows counts).
function autoplayWhenVisible() {
  const videos = document.querySelectorAll("video[data-autoplay]");
  if (!videos.length || !("IntersectionObserver" in window)) return;

  const playWithSound = video => {
    if (video.dataset.userMuted) return video.play().catch(() => {});
    video.muted = false;
    video.play().catch(() => {           // not allowed yet: play muted for now
      video.mutedByScript = true;
      video.muted = true;
      video.play().catch(() => {});
    });
  };

  const visible = new Set();
  const watcher = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        visible.add(target);
        if (target.hasAttribute("data-sound")) playWithSound(target);
        else target.play().catch(() => {});
      } else {
        visible.delete(target);
        target.pause();
      }
    });
  }, { threshold: 0.6 });
  videos.forEach(v => watcher.observe(v));

  // First click/tap/key anywhere: turn on the sound of a visible "withSound" video
  const unmuteVisible = () => visible.forEach(v => {
    if (v.hasAttribute("data-sound") && v.muted && !v.dataset.userMuted) v.muted = false;
  });
  ["pointerdown", "keydown", "touchend"].forEach(type =>
    document.addEventListener(type, () => setTimeout(unmuteVisible), { capture: true }));

  // If the visitor mutes it themselves, respect that
  document.querySelectorAll("video[data-sound]").forEach(v =>
    v.addEventListener("volumechange", () => {
      if (v.mutedByScript) { v.mutedByScript = false; return; }
      if (v.muted) v.dataset.userMuted = "yes";
    }));
}

// Fills every <figure data-photo="name"> on the page from PHOTOS
function fillPhotos() {
  document.querySelectorAll("[data-photo]").forEach(spot => {
    const name = spot.dataset.photo;
    const photo = typeof PHOTOS !== "undefined" ? PHOTOS[name] : null;
    const frame = makeFrame(photo, spot.className);
    if (!photo) frame.dataset.file = `(add "${name}" to photos-and-videos.js)`;
    // the top photo should load straight away, not lazily
    if (spot.hasAttribute("data-eager")) frame.querySelector("img")?.setAttribute("loading", "eager");
    spot.replaceWith(frame);
  });
}


/* ---------- Featured project slider ---------- */
function buildSlider() {
  const spot = document.querySelector("[data-slider]");
  if (!spot) return;
  const slides = typeof FEATURED_SLIDES !== "undefined" ? FEATURED_SLIDES : [];
  if (!slides.length) { spot.remove(); return; }

  const track = document.createElement("ul");
  track.className = "slider-track";
  track.tabIndex = 0;
  track.setAttribute("aria-label", "Project process — swipe or use the arrow keys");

  slides.forEach((s, i) => {
    const li = document.createElement("li");
    li.className = "slide";
    li.setAttribute("aria-label", `${i + 1} of ${slides.length}`);
    li.appendChild(s.video ? makeVideoFrame(s) : makeFrame(s));
    const text = document.createElement("div");
    text.className = "slide-text";
    text.innerHTML = `<span class="slide-step">${String(i + 1).padStart(2, "0")} · ${s.step || ""}</span><p>${s.caption || ""}</p>`;
    li.appendChild(text);
    track.appendChild(li);
  });

  // Arrows and counter sit on top of the picture
  const arrow = (dir, label, path) => `
    <button class="slider-arrow ${dir}" aria-label="${label}">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`;
  spot.classList.add("slider");
  spot.append(track);
  spot.insertAdjacentHTML("beforeend",
    arrow("prev", "Previous", "M15 5l-7 7 7 7") +
    arrow("next", "Next", "M9 5l7 7-7 7") +
    `<span class="slider-count" aria-live="polite"></span>`);

  const items = [...track.children];
  const count = spot.querySelector(".slider-count");
  const prev = spot.querySelector(".slider-arrow.prev");
  const next = spot.querySelector(".slider-arrow.next");
  let current = 0;

  const update = () => {
    // keep the arrows centred on the picture, whatever the screen size
    spot.style.setProperty("--frame-h", items[0].querySelector(".frame").offsetHeight + "px");
    // which slide is nearest the left edge?
    let best = 0;
    items.forEach((item, i) => {
      if (Math.abs(item.offsetLeft - track.scrollLeft) < Math.abs(items[best].offsetLeft - track.scrollLeft)) best = i;
    });
    current = best;
    count.textContent = `${current + 1} / ${items.length}`;
    prev.disabled = current === 0;
    next.disabled = current === items.length - 1;
  };
  const goTo = i => {
    i = Math.max(0, Math.min(items.length - 1, i));
    track.scrollTo({ left: items[i].offsetLeft });
  };

  prev.addEventListener("click", () => goTo(current - 1));
  next.addEventListener("click", () => goTo(current + 1));
  track.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); goTo(current - 1); }
  });
  track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  window.addEventListener("resize", update);
  update();
}


/* ---------- Videos ---------- */
function youtubeId(url) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url) {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}
const isVideoFile = url => /\.(mp4|webm|mov|m4v)$/i.test(url.split("?")[0]);

function makeVideoPlayer(v) {
  const box = document.createElement("div");
  box.className = "video-frame";
  const link = v.link || "";
  const yt = youtubeId(link);
  const vm = vimeoId(link);

  if (yt) {
    // Show the thumbnail first; only load YouTube when clicked (keeps the page fast)
    box.innerHTML = `<button class="video-play" aria-label="Play: ${v.title || "video"}">
        <img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy"></button>`;
    box.querySelector("button").addEventListener("click", () => {
      box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0"
        title="${v.title || "Video"}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    });
  } else if (vm) {
    box.innerHTML = `<iframe src="https://player.vimeo.com/video/${vm}?dnt=1" loading="lazy"
      title="${v.title || "Video"}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  } else if (isVideoFile(link)) {
    const video = document.createElement("video");
    video.src = link;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;
    if (v.poster) video.poster = v.poster;
    video.addEventListener("error", () => {
      box.innerHTML = `<div class="video-link">Video not found: ${link}</div>`;
    });
    box.appendChild(video);
  } else if (link) {
    box.innerHTML = `<a class="video-link" href="${link}" target="_blank" rel="noopener">Watch ↗</a>`;
  }
  return box;
}

function buildVideos() {
  const spot = document.querySelector("[data-videos]");
  if (!spot) return;
  const list = typeof VIDEOS !== "undefined" ? VIDEOS : [];

  if (!list.length) {
    spot.innerHTML = `<div class="empty-note">Videos coming soon.</div>`;
    return;
  }
  spot.classList.add("video-grid");
  list.forEach(v => {
    const card = document.createElement("article");
    card.className = "video-card";
    card.appendChild(makeVideoPlayer(v));
    card.insertAdjacentHTML("beforeend",
      `${v.tag ? `<span class="video-tag">${v.tag}</span>` : ""}
       <h3>${v.title || ""}</h3>
       ${v.text ? `<p>${v.text}</p>` : ""}`);
    spot.appendChild(card);
  });
}


/* ---------- Friendly warning if photos-and-videos.js has a typo ---------- */
function checkContentFile() {
  if (typeof PHOTOS !== "undefined") return;
  const note = document.createElement("div");
  note.style.cssText = "position:fixed;bottom:16px;left:16px;right:16px;z-index:99;padding:14px 18px;background:#b3261e;color:#fff;font:600 15px/1.4 sans-serif";
  note.textContent = "Photos couldn't load: there's a typo in photos-and-videos.js (often a missing comma or quote). Undo your last change there and try again.";
  document.body.appendChild(note);
}


/* ---------- Start ---------- */
buildHeader();
buildFooter();
checkContentFile();
fillPhotos();
buildSlider();
buildVideos();
autoplayWhenVisible();
