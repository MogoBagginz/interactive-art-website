/* =====================================================================
   CONCEPT TOOL — the "Verify" page (concept-verify.html)
   ---------------------------------------------------------------------
   1. reads the code from the link in the "Verify" email (…?t=CODE)
   2. runs the invisible bot check (Cloudflare Turnstile)
   3. tells the server the email is confirmed; the server makes the
      mock-up images and the design PDF and emails them, while this page
      shows progress steps
   4. says "Sent", or a friendly message (expired link, already sent…)

   The parts you might want to edit are SETTINGS and MESSAGES.
   ===================================================================== */


/* ---------------------------------------------------------------------
   SETTINGS (the same as in concept-result.js)
   --------------------------------------------------------------------- */
const SETTINGS = {
  server: "https://concept-tool.mugz-wood.workers.dev",
  turnstileSiteKey: "0x4AAAAAAFvhEzx0kfvOMY-w",       // public key: fine to be in this file
  email: "info@toucancreative.tech",
  timeoutSeconds: 120,   // give up waiting after this long
};

// What the visitor sees when something isn't right.
// "text: null" means the server's own message is used.
const MESSAGES = {
  expired:      { label: "Link expired", title: "This link has <em>expired.</em>", text: null, button: "Make a new concept", link: "concept.html" },
  already_sent: { label: "Already sent", title: "It's already in your <em>inbox.</em>", text: null, button: "Design another sculpture", link: "concept.html" },
  in_progress:  { label: "On its way", title: "Your design is on its <em>way.</em>", text: null, button: "Design another sculpture", link: "concept.html" },
  limit:        { label: "Daily limit", title: "That's today's <em>limit.</em>", text: null, button: "Email me", link: "mailto" },
  busy:         { label: "Taking a break", title: "Images are <em>resting.</em>", text: null, button: "Email me", link: "mailto" },
  off:          { label: "Sorry", title: "Images are <em>off.</em>", text: null, button: "Email me", link: "mailto" },
  failed:       { label: "Sorry", title: "That didn't <em>work.</em>", text: null, button: "Try again", link: "retry" },
  not_sent:     { label: "Sorry", title: "The email didn't <em>send.</em>", text: null, button: "Try again", link: "retry" },
  blocked:      { label: "Sorry", title: "Something went <em>wrong.</em>", text: "The page couldn't check your request. Please try again.", button: "Try again", link: "retry" },
  offline:      { label: "Sorry", title: "Couldn't <em>connect.</em>", text: "Please check your internet connection and try again.", button: "Try again", link: "retry" },
  slow:         { label: "Sorry", title: "That took too <em>long.</em>", text: "It may still arrive in a few minutes. If it doesn't, try again.", button: "Try again", link: "retry" },
  noCode:       { label: "Free design tool", title: "This link isn't <em>complete.</em>", text: "Please click the Verify button in the email again, or copy the whole link into your browser.", button: "Start the tool", link: "concept.html" },
};


/* =====================================================================
   Everything below here is the machinery. Edit with care.
   ===================================================================== */

(function () {
  const TEST_SITE_KEY = "1x00000000000000000000AA";   // Cloudflare's always-passes test key, used on your own computer
  const onMyComputer = ["localhost", "127.0.0.1"].includes(location.hostname);
  const $ = sel => document.querySelector(sel);
  const field = name => document.querySelector(`[data-field="${name}"]`);

  function showState(name) {
    document.querySelectorAll(".result-state").forEach(el => el.hidden = el.dataset.state !== name);
  }

  /* ---------- Progress steps while waiting ---------- */
  let progressTimer;
  function startProgress() {
    const started = Date.now();
    const steps = [...document.querySelectorAll(".progress-steps li")];
    const switchAt = [0, 1, 26, 34];                 // seconds: confirmed, images, PDF, sending
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

  function showSent(email) {
    field("sent-text").textContent = `Your mock-up images and a PDF of the whole design are on their way to ${email}.`;
    showState("sent");
  }

  function showMessage(kind, serverText) {
    const m = MESSAGES[kind] || MESSAGES.failed;
    field("message-label").textContent = m.label;
    field("message-title").innerHTML = m.title;              // titles are written here, not by visitors
    field("message-text").textContent = m.text || serverText || "Sorry, something went wrong. Please try again.";
    const btn = field("message-button");
    btn.textContent = m.button;
    btn.onclick = null;
    if (m.link === "mailto") btn.href = `mailto:${SETTINGS.email}?subject=Design%20tool`;
    else if (m.link === "retry") { btn.href = "#"; btn.onclick = e => { e.preventDefault(); location.reload(); }; }
    else btn.href = m.link;
    field("message-email").hidden = m.link === "mailto";
    showState("message");
  }

  /* ---------- The bot check ---------- */
  function getTurnstileToken(holder) {
    return new Promise((resolve, reject) => {
      const giveUp = setTimeout(() => reject(new Error("turnstile-timeout")), 20000);
      window.onTurnstileLoad = () => {
        window.turnstile.render(holder, {
          sitekey: onMyComputer ? TEST_SITE_KEY : SETTINGS.turnstileSiteKey,
          callback: token => { clearTimeout(giveUp); resolve(token); },
          "error-callback": () => { clearTimeout(giveUp); reject(new Error("turnstile-error")); },
        });
      };
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
      s.async = true;
      s.onerror = () => { clearTimeout(giveUp); reject(new Error("turnstile-load")); };
      document.head.appendChild(s);
    });
  }

  /* ---------- Start ---------- */
  async function verify(code) {
    showState("loading");
    startProgress();

    let token;
    try { token = await getTurnstileToken("#turnstile"); }
    catch { stopProgress(); return showMessage("blocked"); }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SETTINGS.timeoutSeconds * 1000);
    let data;
    try {
      const res = await fetch(SETTINGS.server.replace(/\/$/, "") + "/images/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code, turnstileToken: token }),
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
    if (data.status === "sent") return setTimeout(() => showSent(data.email || "your inbox"), 400);
    showMessage(MESSAGES[data.status] ? data.status : "failed", data.message);
  }

  const code = new URLSearchParams(location.search).get("t") || "";
  if (!/^[0-9a-f]{32}$/.test(code)) return showMessage("noCode");
  verify(code);
})();
