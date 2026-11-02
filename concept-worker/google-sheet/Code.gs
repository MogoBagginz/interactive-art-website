/* =====================================================================
   TOUCAN DESIGN TOOL — GOOGLE SHEET + EMAIL
   ---------------------------------------------------------------------
   This script lives inside your "Design tool leads" Google Sheet
   (Extensions → Apps Script). The design tool's server sends it every
   result; it adds a row to the "Concepts" tab and emails you a copy.

   Setup: see "Task 5" in concept-worker/README.md.
   The settings (SECRET, NOTIFY_EMAIL and, if needed, SHEET_ID) are kept
   in Project Settings → Script properties, not in this file.
   ===================================================================== */

const SHEET_NAME = "Concepts";

// The columns, in order. Columns you add to the right of these are left alone,
// so you can add your own (e.g. "Contacted?") freely.
const COLUMNS = [
  "Date", "ID", "Status", "Concept name", "Where", "Product", "Hard to see", "Interaction",
  "Message", "Size", "Date needed", "Budget", "The idea", "Written concept", "Technical outline",
  "Note (flag, problem or error)", "Attempts", "Visitor email", "Mock-up images",
];

// Which results get an email. "rephrase" (nonsense answers) is only added to the sheet.
// Results from the test page on your computer are emailed with "TEST" in the subject.
const EMAIL_FOR = ["ok", "flagged", "failed", "error"];


/* ---------- Receives a result from the server ---------- */
function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, error: "bad json" }); }
  if (!data || data.secret !== props.getProperty("SECRET")) return reply({ ok: false, error: "wrong secret" });

  // A visitor verified their email and got mock-up images: add their email to the concept's row and tell Murali
  if (data.action === "email") {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { addEmail(data); } finally { lock.releaseLock(); }
    const to = props.getProperty("NOTIFY_EMAIL");
    if (to) { try { sendLeadEmail(to, data); } catch (err) { console.error("Email failed: " + err); } }
    return reply({ ok: true });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    addRow(data);
  } finally {
    lock.releaseLock();
  }

  const notify = props.getProperty("NOTIFY_EMAIL");
  if (notify && EMAIL_FOR.includes(data.status)) {
    try { sendEmail(notify, data); } catch (err) { console.error("Email failed: " + err); }
  }
  return reply({ ok: true });
}


/* ---------- The sheet ---------- */
// The spreadsheet this script is attached to (made via Extensions → Apps Script),
// or, for a script made separately, the one whose ID is in the SHEET_ID script property.
function getBook() {
  const attached = SpreadsheetApp.getActiveSpreadsheet();
  if (attached) return attached;
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("This script isn't attached to a spreadsheet. Add a SHEET_ID script property (see the README).");
  return SpreadsheetApp.openById(id.trim());
}

function getSheet() {
  const book = getBook();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < COLUMNS.length) {
    // An older sheet: add any new column headings on the right
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight("bold");
  }
  return sheet;
}

// Puts the visitor's email (and image links) on the row with this concept ID
function addEmail(d) {
  const sheet = getSheet();
  const emailCol = COLUMNS.indexOf("Visitor email") + 1, imagesCol = COLUMNS.indexOf("Mock-up images") + 1;
  const noteCol = COLUMNS.indexOf("Note (flag, problem or error)") + 1;
  const last = sheet.getLastRow();
  const ids = last > 1 ? sheet.getRange(2, 2, last - 1, 1).getValues().map(r => String(r[0])) : [];
  const at = ids.lastIndexOf(String(d.id));
  if (at === -1) {
    // Row not found (e.g. deleted): add a new one
    addRow({ ...d, status: "images", note: d.note || "" });   // addRow marks test rows itself
    const row = sheet.getLastRow();
    sheet.getRange(row, emailCol).setValue(safe(d.email || ""));
    sheet.getRange(row, imagesCol).setValue(links(d));
    return;
  }
  const row = at + 2;
  const before = String(sheet.getRange(row, emailCol).getValue() || "");
  const emails = before && before !== d.email ? before + ", " + d.email : d.email;
  sheet.getRange(row, emailCol).setValue(safe(emails || ""));
  if (d.images && d.images.length) sheet.getRange(row, imagesCol).setValue(links(d));
  if (d.note) sheet.getRange(row, noteCol).setValue(safe(d.note));
}

// The design PDF and image links, one per line
function links(d) {
  return [d.pdf ? "PDF: " + d.pdf : "", ...(d.images || [])].filter(Boolean).join("\n");
}

function sendLeadEmail(to, d) {
  const c = d.concept || {};
  const prefix = d.testMode ? "[Design tool TEST] " : "[Design tool] ";
  const failed = !!d.note && !(d.images && d.images.length);
  const lines = [
    failed ? d.email + " asked for mock-up images, but they couldn't be made: " + d.note
           : d.email + " verified their email and asked for mock-up images" + (c.name ? " of " + c.name : "") + ". They've been emailed the images and the design PDF.",
    "",
  ];
  if (d.pdf) lines.push("DESIGN PDF", d.pdf, "");
  if (d.images && d.images.length) lines.push("IMAGES", ...d.images, "");
  if (c.name) lines.push("Concept: " + c.name, c.idea || "", "");
  lines.push("Concept ID: " + (d.id || ""), "Spreadsheet: " + getBook().getUrl());
  MailApp.sendEmail({
    to: to,
    replyTo: d.email,
    subject: prefix + (failed ? "Images failed for " : "New lead: ") + d.email + (c.name ? " (" + c.name + ")" : ""),
    body: lines.join("\n"),
  });
}

function addRow(d) {
  const a = d.answers || {}, c = d.concept || {}, o = d.outline || {};
  const status = d.testMode ? `test (${d.status})` : d.status;
  const row = [
    new Date(), d.id || "", status, c.name || "", a.place || "", a.product || "", a.invisible || "",
    (a.interaction || []).join(", "), a.message || "", a.size || "", a.date || "", a.budget || "",
    c.idea || "", conceptText(c), outlineText(o), d.note || "", d.attempts || "", "", "",
  ].map(safe);
  getSheet().appendRow(row);
}

// Text from visitors must never run as a spreadsheet formula
function safe(v) {
  if (typeof v !== "string") return v;
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function conceptText(c) {
  if (!c || !c.name) return "";
  return [
    "What visitors do: " + (c.visitors_do || ""),
    "What happens: " + (c.what_happens || ""),
    "What it says about your product: " + (c.says_about_product || ""),
    "Size, materials and where it stands: " + (c.size_materials_place || ""),
  ].join("\n\n");
}

function outlineText(o) {
  if (!o || !o.senses) return "";
  const rows = [["Senses", o.senses], ["Control unit", o.control_unit], ["Light", o.light], ["Sound", o.sound],
                ["Connections", o.connections], ["Power and safety", o.power_safety], ["What we'd test first", o.test_first]];
  return rows.filter(r => r[1]).map(r => r[0] + ": " + r[1]).join("\n\n");
}


/* ---------- The email to you ---------- */
function sendEmail(to, d) {
  const a = d.answers || {}, c = d.concept || {};
  const titles = {
    ok: "New concept: " + (c.name || "untitled"),
    flagged: "New concept (check it): " + (c.name || "untitled"),
    failed: "Design tool couldn't make a concept",
    error: "Design tool error",
  };
  const lines = [];
  if (d.status === "flagged") lines.push("The visitor saw this concept, but the reviewer had one doubt:", d.note || "", "");
  if (d.status === "failed" || d.status === "error") lines.push("The visitor got an apology. " + (d.note || ""), "");
  lines.push(
    "THEIR ANSWERS",
    "Where: " + (a.place || ""),
    "Product: " + (a.product || ""),
    "Hard to see: " + (a.invisible || ""),
    "Interaction: " + (a.interaction || []).join(", "),
    "Message: " + (a.message || ""),
    "Size: " + (a.size || ""),
    "Date needed: " + (a.date || ""),
    "Budget: " + (a.budget || ""),
    "",
  );
  if (c.name) {
    lines.push("THE CONCEPT: " + c.name, c.idea || "", "", conceptText(c), "", "TECHNICAL OUTLINE", outlineText(d.outline || {}), "");
  }
  lines.push("Concept ID: " + (d.id || ""), "Spreadsheet: " + getBook().getUrl());
  const prefix = d.testMode ? "[Design tool TEST] " : "[Design tool] ";
  MailApp.sendEmail({ to: to, subject: prefix + (titles[d.status] || d.status), body: lines.join("\n") });
}


function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


/* ---------- Run this once from the editor to test (▷ Run, with "testSetup" selected) ---------- */
function testSetup() {
  const sample = {
    id: "test0001", status: "ok", testMode: false, attempts: 1, note: "",
    answers: { place: "Trade-show stand", product: "Test product", invisible: "Test", interaction: ["Touch"],
               message: "Test message", size: "Human height", date: "No date yet", budget: "Not sure yet" },
    concept: { name: "Test Concept", idea: "A test row from the setup check.", visitors_do: "Nothing.", what_happens: "A row appears.",
               says_about_product: "Your setup works.", size_materials_place: "In your spreadsheet." },
    outline: { senses: "None.", control_unit: "Google.", light: "None.", sound: "", connections: "The internet.",
               power_safety: "5 V, 1 A.", test_first: "This." },
  };
  addRow(sample);
  const notify = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL");
  if (notify) sendEmail(notify, sample);
  Logger.log("Added a test row" + (notify ? " and emailed " + notify : " (no NOTIFY_EMAIL set, so no email)"));
}
