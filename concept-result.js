/* =====================================================================
   CONCEPT TOOL — the answers page (concept-result.html)
   ---------------------------------------------------------------------
   1. reads the answers concept.html kept in the browser
   2. runs the invisible bot check (Cloudflare Turnstile)
   3. asks the server for the concept, showing progress steps meanwhile
   4. shows the concept, or a friendly message if something's not right

   The parts you might want to edit are SETTINGS and MESSAGES.
   ===================================================================== */


/* ---------------------------------------------------------------------
   SETTINGS
   --------------------------------------------------------------------- */
const SETTINGS = {
  server: "https://concept-tool.mugz-wood.workers.dev",
  turnstileSiteKey: "0x4AAAAAAFvhEzx0kfvOMY-w",       // public key: fine to be in this file
  email: "info@toucancreative.tech",
  imagesLive: false,     // mock-up images aren't built yet (Task 6). Set to true when they are.
  timeoutSeconds: 120,   // give up waiting after this long
};

// What the visitor sees when there's no concept to show.
// "text: null" means the server's own message is used.
const MESSAGES = {
  rephrase: { label: "One more thing", title: "Tell me a bit <em>more.</em>", text: null, button: "Edit my answers", link: "concept.html" },
  limit:    { label: "Daily limit", title: "That's today's <em>limit.</em>", text: null, button: "Email me", link: "mailto" },
  busy:     { label: "Taking a break", title: "The tool is <em>resting.</em>", text: null, button: "Email me", link: "mailto" },
  failed:   { label: "Sorry", title: "That didn't <em>work.</em>", text: null, button: "Try again", link: "retry" },
  blocked:  { label: "Sorry", title: "Something went <em>wrong.</em>", text: "The page couldn't check your request. Please try again.", button: "Try again", link: "retry" },
  offline:  { label: "Sorry", title: "Couldn't <em>connect.</em>", text: "Please check your internet connection and try again.", button: "Try again", link: "retry" },
  slow:     { label: "Sorry", title: "That took too <em>long.</em>", text: "The design tool didn't answer in time. Please try again.", button: "Try again", link: "retry" },
  noAnswers:{ label: "Free design tool", title: "No answers <em>yet.</em>", text: "Answer the 8 questions first, and your concept will appear here.", button: "Start the tool", link: "concept.html" },
};


/* =====================================================================
   Everything below here is the machinery. Edit with care.
   ===================================================================== */

(function () {
  const ANSWERS = "toucan-concept-answers";
  const RESULT = "toucan-concept-result";
  const TEST_SITE_KEY = "1x00000000000000000000AA";   // Cloudflare's always-passes test key, used on your own computer
  const onMyComputer = ["localhost", "127.0.0.1"].includes(location.hostname);

  const $ = sel => document.querySelector(sel);
  const field = name => document.querySelector(`[data-field="${name}"]`);
  const read = key => { try { return JSON.parse(sessionStorage.getItem(key) || "null"); } catch { return null; } };
  const write = (key, v) => { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch {} };
  const forget = key => { try { sessionStorage.removeItem(key); } catch {} };

  function showState(name) {
    document.querySelectorAll(".result-state").forEach(el => el.hidden = el.dataset.state !== name);
    $("[data-images]").hidden = name !== "ok";
  }

  /* ---------- Progress steps while waiting ---------- */
  let progressTimer;
  function startProgress() {
    const started = Date.now();
    const steps = [...document.querySelectorAll(".progress-steps li")];
    const switchAt = [0, 4, 22];                     // seconds: reading, designing, checking
    const update = () => {
      const s = (Date.now() - started) / 1000;
      const active = switchAt.filter(t => s >= t).length - 1;
      steps.forEach((li, i) => {
        li.classList.toggle("is-done", i < active);
        li.classList.toggle("is-active", i === active);
        if (i === active) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
    };
    update();
    progressTimer = setInterval(update, 500);
  }
  function stopProgress() {
    clearInterval(progressTimer);
    document.querySelectorAll(".progress-steps li").forEach(li => { li.classList.add("is-done"); li.classList.remove("is-active"); });
  }

  /* ---------- Showing the result ---------- */
  function showConcept(data) {
    const c = data.concept || {}, o = data.outline || {};
    field("name").textContent = c.name || "Your sculpture";
    field("name-inline").textContent = c.name || "your sculpture";
    ["idea", "visitors_do", "what_happens", "says_about_product", "size_materials_place"].forEach(k => field(k).textContent = c[k] || "");
    ["senses", "control_unit", "light", "sound", "connections", "power_safety", "test_first"].forEach(k => field(k).textContent = o[k] || "");
    $('[data-row="sound"]').hidden = !(o.sound && o.sound.trim());
    field("closing").textContent = data.closing || "";
    document.title = `${c.name || "Your sculpture concept"} — Toucan Creative Technology`;
    showState("ok");
  }

  function showMessage(kind, serverText) {
    const m = MESSAGES[kind] || MESSAGES.failed;
    field("message-label").textContent = m.label;
    field("message-title").innerHTML = m.title;              // titles are written here, not by visitors
    field("message-text").textContent = m.text || serverText || MESSAGES.failed.text || "";
    const btn = field("message-button");
    btn.textContent = m.button;
    btn.onclick = null;
    if (m.link === "mailto") btn.href = `mailto:${SETTINGS.email}?subject=Design%20tool`;
    else if (m.link === "retry") { btn.href = "#"; btn.onclick = e => { e.preventDefault(); forget(RESULT); location.reload(); }; }
    else btn.href = m.link;
    field("message-email").hidden = m.link === "mailto";   // no second "Email me" when the button already is one
    showState("message");
  }

  /* ---------- The bot check ---------- */
  function getTurnstileToken() {
    return new Promise((resolve, reject) => {
      const giveUp = setTimeout(() => reject(new Error("turnstile-timeout")), 20000);
      window.onTurnstileLoad = () => {
        try {
          window.turnstile.render("#turnstile", {
            sitekey: onMyComputer ? TEST_SITE_KEY : SETTINGS.turnstileSiteKey,
            callback: token => { clearTimeout(giveUp); resolve(token); },
            "error-callback": () => { clearTimeout(giveUp); reject(new Error("turnstile-error")); },
          });
        } catch (e) { clearTimeout(giveUp); reject(e); }
      };
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
      s.async = true;
      s.onerror = () => { clearTimeout(giveUp); reject(new Error("turnstile-load")); };
      document.head.appendChild(s);
    });
  }

  /* ---------- Asking the server ---------- */
  async function requestConcept(answers) {
    showState("loading");
    startProgress();

    let token;
    try { token = await getTurnstileToken(); }
    catch { stopProgress(); return showMessage("blocked"); }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SETTINGS.timeoutSeconds * 1000);
    let res, data;
    try {
      res = await fetch(SETTINGS.server.replace(/\/$/, "") + "/concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, turnstileToken: token }),
        signal: controller.signal,
      });
      data = await res.json().catch(() => ({}));
    } catch (e) {
      stopProgress();
      return showMessage(e.name === "AbortError" ? "slow" : "offline");
    } finally {
      clearTimeout(timer);
    }

    stopProgress();
    if (onMyComputer && data.debug) console.info("Design tool (test mode):", data.debug);

    if (data.status === "ok") {
      write(RESULT, { answers: JSON.stringify(answers), data });
      // a short pause so the last tick is seen
      return setTimeout(() => showConcept(data), 400);
    }
    showMessage(MESSAGES[data.status] ? data.status : "failed", data.message);
  }

  /* ---------- Mock-up images form ---------- */
  const imagesForm = $(".images-form");
  imagesForm.addEventListener("submit", e => {
    e.preventDefault();
    const error = imagesForm.querySelector(".images-error");
    const email = imagesForm.elements.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error.textContent = "Please check your email address."; return; }
    if (!SETTINGS.imagesLive) {
      error.textContent = `Mock-up images aren't ready yet. Email ${SETTINGS.email} and I'll send you some.`;
      return;
    }
    // Task 6: send the email and concept to the server here
  });
  imagesForm.addEventListener("input", () => { imagesForm.querySelector(".images-error").textContent = ""; });

  /* ---------- Start ---------- */
  const answers = read(ANSWERS);
  if (!answers) return showMessage("noAnswers");

  // Already made for these exact answers (e.g. the page was reloaded)? Show it again without asking twice.
  const saved = read(RESULT);
  if (saved && saved.answers === JSON.stringify(answers) && saved.data) return showConcept(saved.data);

  requestConcept(answers);
})();
