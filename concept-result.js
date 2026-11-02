/* =====================================================================
   CONCEPT TOOL — the answers page (concept-result.html)
   ---------------------------------------------------------------------
   1. reads the answers concept.html kept in the browser
   2. runs the invisible bot check (Cloudflare Turnstile)
   3. asks the server for the concept, showing progress steps meanwhile
   4. shows the concept, or a friendly message if something's not right
   5. "Generate mock-up images": the server emails the visitor a "Verify"
      link and this page says "Check your email". Clicking the link opens
      concept-verify.html, which has the images and design PDF made and
      emailed (they aren't shown here, so only a real inbox gets them)

   The parts you might want to edit are SETTINGS and MESSAGES.
   ===================================================================== */


/* ---------------------------------------------------------------------
   SETTINGS
   --------------------------------------------------------------------- */
const SETTINGS = {
  server: "https://concept-tool.mugz-wood.workers.dev",
  turnstileSiteKey: "0x4AAAAAAFvhEzx0kfvOMY-w",       // public key: fine to be in this file
  email: "info@toucancreative.tech",
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

  /* ---------- The bot check (a fresh check for every request) ---------- */
  let turnstileReady;
  function loadTurnstile() {
    if (!turnstileReady) turnstileReady = new Promise((resolve, reject) => {
      window.onTurnstileLoad = () => resolve(window.turnstile);
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
      s.async = true;
      s.onerror = () => { turnstileReady = null; reject(new Error("turnstile-load")); };
      document.head.appendChild(s);
    });
    return turnstileReady;
  }
  function getTurnstileToken(holder) {
    return new Promise((resolve, reject) => {
      const giveUp = setTimeout(() => reject(new Error("turnstile-timeout")), 20000);
      loadTurnstile().then(turnstile => {
        const box = document.createElement("div");
        $(holder).replaceChildren(box);
        turnstile.render(box, {
          sitekey: onMyComputer ? TEST_SITE_KEY : SETTINGS.turnstileSiteKey,
          callback: token => { clearTimeout(giveUp); resolve(token); },
          "error-callback": () => { clearTimeout(giveUp); reject(new Error("turnstile-error")); },
        });
      }).catch(e => { clearTimeout(giveUp); reject(e); });
    });
  }

  /* ---------- Asking the server ---------- */
  async function requestConcept(answers) {
    showState("loading");
    startProgress();

    let token;
    try { token = await getTurnstileToken("#turnstile"); }
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

  /* ---------- Mock-up images: email a "Verify" link, then "Check your email" ---------- */
  const SENT = "toucan-concept-images";
  const imagesForm = $(".images-form");
  const imagesError = imagesForm.querySelector(".images-error");
  const imagesButton = imagesForm.querySelector("button");
  const imagesWaiting = $("[data-images-waiting]");
  const imagesDone = $("[data-images-done]");
  const againButton = $("[data-images-again]");
  const againError = $("[data-images-again-error]");

  function showCheckEmail(email) {
    imagesDone.querySelector("[data-images-done-text]").textContent =
      `I've sent a link to ${email}. Click Verify in that email, and your mock-up images and a PDF of the whole design will follow in about a minute.`;
    imagesForm.hidden = true;
    imagesDone.hidden = false;
  }

  // Asks the server to email the "Verify" link. Returns an error message, or "" if it was sent.
  async function askForLink(email) {
    const saved = read(RESULT);
    const id = saved && saved.data && saved.data.id;
    if (!id) return "Please make your concept again, then ask for images.";
    try {
      const token = await getTurnstileToken("#turnstile-images");
      const res = await fetch(SETTINGS.server.replace(/\/$/, "") + "/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, email, turnstileToken: token }),
      });
      const data = await res.json().catch(() => ({}));
      if (onMyComputer && data.debug) console.info("Design tool images (test mode):", data.debug);
      if (data.status !== "check_email") return data.message || "Sorry, the email couldn't be sent. Please try again.";
      write(SENT, { id, email });
      return "";
    } catch (err) {
      return String(err.message).startsWith("turnstile")
        ? "The page couldn't check your request. Please try again."
        : "Couldn't connect. Please check your internet connection and try again.";
    }
  }

  imagesForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = imagesForm.elements.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { imagesError.textContent = "Please check your email address."; return; }
    imagesError.textContent = "";
    imagesButton.disabled = true;
    imagesWaiting.hidden = false;
    const problem = await askForLink(email);
    imagesButton.disabled = false;
    imagesWaiting.hidden = true;
    if (problem) imagesError.textContent = problem;
    else showCheckEmail(email);
  });
  imagesForm.addEventListener("input", () => { imagesError.textContent = ""; });

  // "send it again"
  againButton.addEventListener("click", async () => {
    const sent = read(SENT);
    if (!sent) return;
    againButton.disabled = true;
    againError.textContent = "";
    const problem = await askForLink(sent.email);
    againButton.disabled = false;
    againError.textContent = problem || `Sent again to ${sent.email}.`;
  });
  // "use a different email"
  $("[data-images-change]").addEventListener("click", () => {
    againError.textContent = "";
    imagesDone.hidden = true;
    imagesForm.hidden = false;
    imagesForm.elements.email.select();
    imagesForm.elements.email.focus();
  });

  /* ---------- Start ---------- */
  const answers = read(ANSWERS);
  if (!answers) return showMessage("noAnswers");

  // Already made for these exact answers (e.g. the page was reloaded)? Show it again without asking twice.
  const saved = read(RESULT);
  if (saved && saved.answers === JSON.stringify(answers) && saved.data) {
    showConcept(saved.data);
    const sent = read(SENT);
    if (sent && sent.id === saved.data.id) showCheckEmail(sent.email);
    return;
  }

  requestConcept(answers);
})();
