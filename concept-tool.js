/* =====================================================================
   CONCEPT TOOL — makes the questions on concept.html work
   ---------------------------------------------------------------------
   The questions themselves are written in concept.html.
   This file shows them one at a time, checks each answer,
   and sends everything to the tool's server.

   You normally don't need to edit this file, except CONCEPT_SERVER below.
   ===================================================================== */


/* ---------------------------------------------------------------------
   WHERE THE ANSWERS ARE SENT  — leave empty until the tool's server exists
   When the server is ready, put its address here, e.g.
     const CONCEPT_SERVER = "https://concept.toucancreative.tech";
   While it's empty, the form works but the last step says the tool
   isn't live yet, and nothing is sent anywhere.
   --------------------------------------------------------------------- */
const CONCEPT_SERVER = "";


/* =====================================================================
   Everything below here is the machinery. Edit with care.
   ===================================================================== */

(function () {
  const form = document.querySelector("[data-concept-tool]");
  if (!form) return;
  form.classList.add("is-live");   // without JavaScript, every question simply shows at once

  const steps = [...form.querySelectorAll(".tool-step")];
  const questions = steps.filter(s => !["details", "code", "done"].includes(s.dataset.type));
  const total = questions.length;
  const count = form.querySelector(".tool-count");
  const error = form.querySelector(".tool-error");
  const back = form.querySelector(".tool-back");
  const next = form.querySelector(".tool-next");
  const bar = document.querySelector(".tool-progress span");
  let current = 0;

  /* ---------- Showing one step ---------- */
  function show(i, focus = true) {
    current = i;
    const step = steps[i];
    const type = step.dataset.type;
    steps.forEach(s => s.hidden = s !== step);
    error.textContent = "";

    const qNumber = questions.indexOf(step);
    count.textContent = qNumber >= 0 ? `Question ${qNumber + 1} of ${total}` : type === "details" ? "Last step" : "";
    bar.style.width = `${Math.min(qNumber >= 0 ? qNumber : total, total) / total * 100}%`;

    back.hidden = i === 0 || type === "code" || type === "done";
    next.hidden = type === "done";
    next.textContent = type === "details" ? "Create my concept" : type === "code" ? "Confirm" : "Next";

    const email = form.elements.email.value.trim();
    form.querySelectorAll("[data-show-email]").forEach(el => el.textContent = email);

    if (focus) step.querySelector("textarea, input:not([disabled])")?.focus({ preventScroll: true });
  }

  /* ---------- Checking an answer ---------- */
  function problemWith(step) {
    const type = step.dataset.type;
    const el = name => form.elements[name];

    if (type === "text") {
      return step.querySelector("textarea").value.trim().length < 3 ? "Please write a few words." : null;
    }
    if (type === "choice") return step.querySelector("input:checked") ? null : "Please pick one.";
    if (type === "multi") return step.querySelector("input:checked") ? null : "Please pick at least one.";
    if (type === "date") {
      return el("no_date").checked || el("date").value ? null : "Please pick a date, or tick \"No date yet\".";
    }
    if (type === "details") {
      if (!el("name").value.trim() || !el("company").value.trim()) return "Please add your name and company.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el("email").value.trim())) return "Please check your email address.";
      if (!el("consent").checked) return "Please tick the box to agree.";
      return null;
    }
    if (type === "code") return /^\d{6}$/.test(el("code").value.trim()) ? null : "Please enter the 6-digit code.";
    return null;
  }

  /* ---------- Collecting the answers ---------- */
  function collect() {
    const data = new FormData(form);
    const answers = {};
    questions.forEach(step => {
      const names = [...new Set([...step.querySelectorAll("[name]")].map(e => e.name))];
      names.forEach(n => {
        const all = data.getAll(n).map(v => String(v).trim()).filter(Boolean);
        if (n === "no_date") return;
        answers[n] = step.dataset.type === "multi" ? all : (all[0] || "");
      });
    });
    if (form.elements.no_date.checked) answers.date = "No date yet";
    const details = {};
    ["name", "company", "email", "role"].forEach(n => details[n] = String(data.get(n) || "").trim());
    return { answers, details };
  }

  /* ---------- Talking to the server ---------- */
  async function send(path, payload) {
    if (!CONCEPT_SERVER) throw new Error("not-live");
    const res = await fetch(CONCEPT_SERVER.replace(/\/$/, "") + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const reply = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(reply.message || "failed");
    return reply;
  }

  function serverError(e) {
    if (e.message === "not-live") return "The concept tool isn't live yet. Please email info@toucancreative.tech instead.";
    if (e.message === "failed") return "Something went wrong. Please try again in a minute.";
    return e.message;   // a message from the server, e.g. "That code isn't right."
  }

  /* ---------- Next ---------- */
  async function goNext() {
    const step = steps[current];
    const problem = problemWith(step);
    if (problem) { error.textContent = problem; return; }
    const type = step.dataset.type;

    if (type === "details" || type === "code") {
      const label = next.textContent;
      next.disabled = true;
      next.textContent = type === "details" ? "Sending…" : "Checking…";
      try {
        if (type === "details") await send("/start", collect());
        else await send("/verify", { email: form.elements.email.value.trim(), code: form.elements.code.value.trim() });
        show(current + 1);
      } catch (e) {
        error.textContent = serverError(e);
        next.textContent = label;
      }
      next.disabled = false;
      return;
    }

    show(current + 1);
    form.closest(".tool-card").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  form.addEventListener("submit", e => { e.preventDefault(); goNext(); });
  back.addEventListener("click", () => show(Math.max(0, current - 1)));

  // Picking a single choice moves straight on
  form.querySelectorAll('.tool-step[data-type="choice"] input').forEach(r =>
    r.addEventListener("change", () => setTimeout(goNext, 180)));

  // "No date yet" switches the date box off
  form.elements.no_date.addEventListener("change", e => { form.elements.date.disabled = e.target.checked; });

  // Enter in a text box moves on (Shift+Enter for a new line)
  form.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey && e.target.tagName === "TEXTAREA") { e.preventDefault(); goNext(); }
  });

  show(0, false);
})();
