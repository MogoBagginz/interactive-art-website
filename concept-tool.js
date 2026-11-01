/* =====================================================================
   CONCEPT TOOL — makes the questions on concept.html work
   ---------------------------------------------------------------------
   The questions themselves are written in concept.html.
   This file shows them one at a time and checks each answer.
   After the last question it keeps the answers in the browser
   (for this visit only) and opens concept-result.html, which asks
   the server for the concept.

   You normally don't need to edit this file.
   ===================================================================== */

(function () {
  const form = document.querySelector("[data-concept-tool]");
  if (!form) return;
  form.classList.add("is-live");   // without JavaScript, the page asks visitors to email instead

  const STORE = "toucan-concept-answers";
  const steps = [...form.querySelectorAll(".tool-step")];
  const total = steps.length;
  const count = form.querySelector(".tool-count");
  const error = form.querySelector(".tool-error");
  const back = form.querySelector(".tool-back");
  const next = form.querySelector(".tool-next");
  const bar = document.querySelector(".tool-progress span");
  let current = 0;

  /* ---------- Showing one question ---------- */
  function show(i, focus = true) {
    current = i;
    steps.forEach(s => s.hidden = s !== steps[i]);
    error.textContent = "";
    count.textContent = `Question ${i + 1} of ${total}`;
    bar.style.width = `${i / total * 100}%`;
    back.hidden = i === 0;
    next.textContent = i === total - 1 ? "Create my concept" : "Next";
    if (focus) steps[i].querySelector("textarea, input:not([disabled])")?.focus({ preventScroll: true });
  }

  /* ---------- Checking an answer ---------- */
  function problemWith(step) {
    const type = step.dataset.type;
    if (type === "text") return step.querySelector("textarea").value.trim().length < 3 ? "Please write a few words." : null;
    if (type === "choice") return step.querySelector("input:checked") ? null : "Please pick one.";
    if (type === "multi") return step.querySelector("input:checked") ? null : "Please pick at least one.";
    if (type === "date") return form.elements.no_date.checked || form.elements.date.value ? null : "Please pick a date, or tick \"No date yet\".";
    return null;
  }

  /* ---------- Collecting and remembering the answers ---------- */
  function collect() {
    const data = new FormData(form);
    const answers = {};
    steps.forEach(step => {
      const names = [...new Set([...step.querySelectorAll("[name]")].map(e => e.name))].filter(n => n !== "no_date");
      names.forEach(n => {
        const all = data.getAll(n).map(v => String(v).trim()).filter(Boolean);
        answers[n] = step.dataset.type === "multi" ? all : (all[0] || "");
      });
    });
    if (form.elements.no_date.checked) answers.date = "No date yet";
    return answers;
  }

  function save(answers) {
    try { sessionStorage.setItem(STORE, JSON.stringify(answers)); return true; } catch { return false; }
  }

  // Coming back to edit: fill in the answers they gave before
  function restore() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(STORE) || "null"); } catch { saved = null; }
    if (!saved) return;
    Object.entries(saved).forEach(([name, value]) => {
      if (name === "date") {
        if (value === "No date yet") { form.elements.no_date.checked = true; form.elements.date.disabled = true; }
        else form.elements.date.value = value;
        return;
      }
      const values = Array.isArray(value) ? value : [value];
      form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach(el => {
        if (el.type === "radio" || el.type === "checkbox") el.checked = values.includes(el.value);
        else el.value = values[0] || "";
      });
    });
  }

  /* ---------- Next ---------- */
  function goNext() {
    const problem = problemWith(steps[current]);
    if (problem) { error.textContent = problem; return; }
    if (current < total - 1) {
      show(current + 1);
      form.closest(".tool-card").scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    // Last question answered: open the answers page
    if (!save(collect())) {
      error.textContent = "Your browser is blocking this tool from keeping your answers. Please allow site data, or email info@toucancreative.tech.";
      return;
    }
    next.disabled = true;
    location.href = "concept-result.html";
  }

  form.addEventListener("submit", e => { e.preventDefault(); goNext(); });
  form.addEventListener("input", () => { error.textContent = ""; });   // a correction clears the message
  back.addEventListener("click", () => show(Math.max(0, current - 1)));

  // Picking a single choice moves straight on (except on the last question, which has the button)
  form.querySelectorAll('.tool-step[data-type="choice"] input').forEach(r =>
    r.addEventListener("change", () => { if (current < total - 1) setTimeout(goNext, 180); }));

  // "No date yet" switches the date box off
  form.elements.no_date.addEventListener("change", e => { form.elements.date.disabled = e.target.checked; });

  // Enter in a text box moves on (Shift+Enter for a new line)
  form.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey && e.target.tagName === "TEXTAREA") { e.preventDefault(); goNext(); }
  });

  // Back/forward cache: re-enable the button if they come back to this page
  window.addEventListener("pageshow", () => { next.disabled = false; });

  restore();
  show(0, false);
})();
