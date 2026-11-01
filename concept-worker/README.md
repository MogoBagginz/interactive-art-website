# Design tool server

The server behind the free design tool (`concept.html`). It runs on Cloudflare as the Worker **concept-tool**:
https://concept-tool.mugz-wood.workers.dev

| File | What it is |
|------|------------|
| `worker.js` | The server. Settings, the parts list and the AI rules are at the top. |
| `test.html` | A test page for trying the server from your computer. Not part of the website. |

Secrets (the Anthropic API key, the Turnstile secret key) live only in Cloudflare, never in these files.

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

Tip: to see the "you've made 5 concepts today" message without making 5 concepts, set `DAILY_LIMIT` to `1`,
make one concept, then try again. Delete it afterwards.

## Changing the parts list or rules

Edit `PARTS` or `RULES` at the top of `worker.js`, then repeat step 2 (paste and Deploy).

## If something goes wrong

Worker → **Observability / Logs** (live logs) shows errors, e.g. "Setup missing" if the `LIMITS` binding
or one of the two secrets isn't there.
