# Design tool server

The server behind the free design tool (`concept.html`). It runs on Cloudflare as the Worker **concept-tool**:
https://concept-tool.mugz-wood.workers.dev

| File | What it is |
|------|------------|
| `worker.js` | The server. Settings, the parts list and the AI rules are at the top. |
| `test.html` | A test page for trying the server from your computer. Not part of the website. |
| `google-sheet/Code.gs` | The script inside your Google Sheet that adds rows and emails you (Task 5 below). |

Secrets (the Anthropic API key, the Turnstile secret key) live only in Cloudflare, never in these files.

**Versions.** Each part has its own version number, raised every time a changed copy goes live:
- Website: `SITE_VERSION` in `script.js` (M0.0.1, M0.0.2…)
- Server: `VERSION` in `worker.js` (CF0.0.1…). Opening the server address shows the live version.
- Google Sheet script: `VERSION` in `google-sheet/Code.gs` (GS0.0.2…)

---

## First-time setup

### 1. Create the counter store (KV)

The server uses it to count each visitor's 5 concepts a day and the monthly total.

1. Cloudflare dashboard → **Storage & Databases → KV → Create** (the wording may differ slightly).
2. Name it `concept-tool-limits` and create it.
3. Open the **concept-tool** Worker → **Bindings** (sometimes under **Settings**) → **Add binding** → **KV namespace**.
4. **Variable name:** `LIMITS` (exactly this). **KV namespace:** `concept-tool-limits`. Save / Deploy.

### 2. Put the code in

1. Open the **concept-tool** Worker → **Edit code** (top right).
2. Click into the code on the left, select everything (Ctrl+A) and delete it.
3. Open `worker.js` from this folder, copy everything, and paste it in.
4. Click **Deploy**.
5. Open https://concept-tool.mugz-wood.workers.dev. It should say: *Toucan design tool server is running.*

### 3. Turn on test mode (temporary)

Lets the test page on your computer talk to the server.

Worker → **Settings → Variables and Secrets → Add**:
- Type **Text**, name `ALLOW_LOCAL_TEST`, value `yes`. Deploy.

### 4. Run the test page

In a terminal, in the website folder:
```
cd concept-worker
python3 -m http.server 8000
```
Then open **http://localhost:8000/test.html** in your browser and click **Create concept**.
It takes roughly 20–40 seconds (the concept is written, checked and reviewed). Edit the answers to try other startups.
Each successful test uses one of today's 5 concepts and costs a few cents.

Stop the little server with Ctrl+C in the terminal when you're done.

### 5. Turn test mode off again

Worker → **Settings → Variables and Secrets** → delete `ALLOW_LOCAL_TEST`. Deploy.
Do this before the tool goes live.

---

## Optional settings (Worker → Settings → Variables and Secrets, type Text)

| Name | Default | What it does |
|------|---------|--------------|
| `DAILY_LIMIT` | `5` | Concepts per visitor per day |
| `MONTHLY_LIMIT` | `300` | Concepts per month in total, then the tool pauses until next month |
| `ALLOW_LOCAL_TEST` | (off) | `yes` lets the test page on your computer use the server |
| `IMAGES_PER_DAY` | `5` | "Verify" emails per visitor per day (images are only made once per concept) |
| `MONTHLY_IMAGE_LIMIT` | `150` | Mock-up image requests per month in total (about $0.07 each, so at most about $10) |

Secrets (type **Secret**): `ANTHROPIC_API_KEY`, `TURNSTILE_SECRET_KEY`, for the Google Sheet `SHEET_URL` and `SHEET_SECRET` (Task 5),
and for mock-up images `GEMINI_API_KEY` and `RESEND_API_KEY` (Task 6).

Tip: to see the "you've made 5 concepts today" message without making 5 concepts, set `DAILY_LIMIT` to `1`,
make one concept, then try again. Delete it afterwards.

## Changing the parts list or rules

Edit `PARTS` or `RULES` at the top of `worker.js`, then repeat step 2 (paste and Deploy).

## If something goes wrong

Worker → **Observability / Logs** (live logs) shows errors, e.g. "Setup missing" if the `LIMITS` binding
or one of the two secrets isn't there.

---

## Task 5: Google Sheet and email to you

Every result is added as a row to a Google Sheet, and concepts (plus failures) are emailed to you.
"Please rephrase" results only go in the sheet. The script that does this is `google-sheet/Code.gs`.

### A. Make the sheet and add the script

1. Signed in to your Google account, go to **sheets.new** and name the sheet `Design tool leads`.
2. **Extensions → Apps Script.** Delete the code that's there, paste in everything from `google-sheet/Code.gs`, and click **Save** (the disk icon). Name the project `Design tool leads` if it asks.
3. Click **Project Settings** (the gear on the left) → **Script properties → Add script property**, and add two:
   - `SECRET`: a long random password, letters and numbers only (make one with a password manager). You'll paste the same one into Cloudflare.
   - `NOTIFY_EMAIL`: where the emails go, e.g. `info@toucancreative.tech`.
   - `SHEET_ID`: only needed if the script was made on script.google.com instead of from the sheet's
     **Extensions → Apps Script** menu. It's the long code in the sheet's address, between `/d/` and `/edit`.
   Click **Save script properties**.

### B. Test it

1. Go back to the **Editor** (`< >` on the left). In the bar at the top, choose `testSetup` in the function list and click **Run**.
2. Google asks for permission. Click **Review permissions**, choose your account, then **Advanced → Go to Design tool leads (unsafe)** → **Allow**. ("Unsafe" only means Google hasn't reviewed your own script.)
3. Check: a **Concepts** tab with one "Test Concept" row, and an email "[Design tool] New concept: Test Concept". Delete the test row afterwards if you like.

### C. Put it online for the server

1. **Deploy → New deployment.** Click the gear next to "Select type" → **Web app**.
2. Description: `design tool`. **Execute as: Me.** **Who has access: Anyone.** Click **Deploy**.
3. Copy the **Web app URL** (it ends in `/exec`).

### D. Connect the server

1. Cloudflare → the **concept-tool** Worker → **Settings → Variables and Secrets → Add**, two **Secrets**:
   - `SHEET_URL`: the Web app URL
   - `SHEET_SECRET`: the same password as `SECRET` in step A3
2. Paste the new `worker.js` into the Worker (Edit code) and **Deploy**.
3. Make a concept from your computer. You should get a row marked `test (ok)` and an email starting "[Design tool TEST]".

### If you change Code.gs later

Paste the new code, Save, then **Deploy → Manage deployments → ✎ (edit) → Version: New version → Deploy**.
The Web app URL stays the same, so nothing changes in Cloudflare.

### Sheet columns

Date · ID · Status · Concept name · Where · Product · Hard to see · Interaction · Message · Size · Date needed · Budget ·
The idea · Written concept · Technical outline · Note (flag, problem or error) · Attempts · Visitor email · Mock-up images

Status is `ok`, `flagged` (shown, but the reviewer had one doubt: check these), `failed`, `error` or `rephrase`.
Rows from your computer say `test (…)`. You can add your own columns to the right (e.g. "Contacted?").
"Visitor email" and "Mock-up images" fill in when a visitor verifies their email and gets the images (Task 6).

---

## Task 6: Mock-up images (with email verification)

How it works for the visitor:
1. On the answers page they enter their email and click **Generate mock-up images**. The page says
   **Check your email**, and the server emails them a **Verify** link from info@toucancreative.tech (Resend).
   The email explains that clicking it sends the mock-up images and a PDF of the whole design.
2. They click **Verify**. It opens `concept-verify.html` on the website, which says **Email confirmed** and shows
   progress while the server makes 2 images with Google Gemini and a PDF of the whole design (about 30–45 seconds).
3. The design email arrives: the images, the written concept, your "take it further" offer, and the PDF attached.
   Then the server adds their email, the image links and the PDF link to the concept's row in your sheet, and emails
   you "New lead: …". So only **verified** emails become leads.

Nothing costly happens until they click, so a fake email costs nothing. The link works for 24 hours and only once
(clicking it again says "already sent"). The images aren't shown on the page, so only a real inbox gets them.
Each set of images costs about $0.07; `MONTHLY_IMAGE_LIMIT` caps the total. Images and PDFs stay online for 30 days.

### A. Gemini (makes the images)

1. Go to **aistudio.google.com** and sign in with your Google account → **Get API key → Create API key**.
2. Image generation isn't on Google's free tier, so the key's project needs billing: in AI Studio, click
   **Set up billing** next to the key and follow the steps.
3. Recommended: in Google Cloud → **Billing → Budgets & alerts**, create a budget of e.g. €15/month with email alerts.
   (Google's budgets warn you but don't stop spending; the server's `MONTHLY_IMAGE_LIMIT` is the hard stop.)
4. Copy the key.

### B. Resend (sends the email from info@toucancreative.tech)

1. Sign up at **resend.com**.
2. **Domains → Add domain** → `toucancreative.tech`. Choose the EU region (Frankfurt) if offered.
   **Don't turn on "Receiving"**: your info@ mail must keep going through Cloudflare Email Routing to Gmail.
3. Add the DNS records by hand. Keep Resend's DNS page (Domains → toucancreative.tech) open in one tab, and
   Cloudflare → toucancreative.tech → **DNS → Records** in another. For each record on Resend's page, click
   **Add record** in Cloudflare, pick the **Type**, then use Resend's copy buttons for **Name** and **Content**
   (the long values are shortened on screen, so never type them). Leave TTL on Auto and click **Save**.
   - **TXT** `resend._domainkey` (DKIM: proves the email is really from you)
   - **CNAME** `send` and **CNAME** `rsend` (SPF: lets Resend send for you). Switch **Proxy status** off,
     to **DNS only** (grey cloud)
   - **TXT** `_dmarc` (optional but recommended: Gmail trusts mail more with it). Skip it if Cloudflare already
     has a `_dmarc` record
   These only use new names, so your info@ email records (Cloudflare Email Routing) aren't touched.
   Leave **Enable receiving** on Resend switched off.
4. Click **Verify DNS Records** and wait until the domain shows **Verified** (often minutes, up to a day).
5. **API Keys → Create API key**: permission **Sending access**, domain `toucancreative.tech`. Copy it.

### C. Connect the server

1. Cloudflare → the **concept-tool** Worker → **Settings → Variables and Secrets → Add**, two **Secrets**:
   - `GEMINI_API_KEY`: the Gemini key
   - `RESEND_API_KEY`: the Resend key
2. Paste the new `worker.js` into the Worker (Edit code) and **Deploy**.

### D. Update the Google Sheet script

Paste the new `google-sheet/Code.gs` into Apps Script, **Save**, then
**Deploy → Manage deployments → ✎ → Version: New version → Deploy**. (It adds a "Mock-up images" column by itself.)

### E. Test it

1. On your computer (test mode on), run `python3 -m http.server 8000` in the **website** folder (not concept-worker),
   and open http://localhost:8000/concept.html. Answer the questions.
2. On the answers page, enter **your own email** and click **Generate mock-up images**. The page should say
   **Check your email**.
3. Open the "Verify your email…" email and click **Verify**. In test mode the link opens `localhost:8000`, so
   click it on the same computer while the little server is still running.
4. The page should say **Email confirmed**, tick through the steps, then **Sent. Check your inbox.**
5. You should get the design email with the images and the PDF attached, see your email plus the PDF and image
   links in the concept's row, and get a "[Design tool TEST] New lead: …" email.

Before Resend is set up, test mode puts the Verify link in the browser's console (F12) instead of emailing it.
If something fails, the browser's console (F12) shows the reason, and so do the Worker's Logs.

Images and PDFs stay online for 30 days (`keepImagesDays` in `worker.js`), then their links stop working.
The PDF itself is attached to the visitor's email, so their copy never expires.

