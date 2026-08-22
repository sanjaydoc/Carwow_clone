# Deploy the chat proxy — browser only (no terminal, no Node)

Follow this on your laptop. It takes ~10 minutes and uses only the Cloudflare
and Anthropic websites. You never type your API key anywhere except Cloudflare's
own secret box.

At the end you'll have a Worker URL. **Send me that URL and I'll connect the
website to it for you** (or do the last section yourself).

---

## What you need first

1. **A Cloudflare account** (free) — sign up at <https://dash.cloudflare.com/sign-up> if you don't have one.
2. **An Anthropic API key** with billing/credits — from <https://console.anthropic.com> → **API Keys** → **Create Key**. Copy it somewhere safe for a minute; it starts with `sk-ant-`.
   - Cloudflare is free, but the actual AI replies are billed by Anthropic per use, so add a little credit under **Billing** in the Anthropic console.

---

## Step 1 — Create the Worker

1. Go to <https://dash.cloudflare.com> and log in.
2. In the left menu click **Workers & Pages**.
3. Click **Create application** → **Create Worker**.
4. Name it **`stemcells-chat`** (or anything you like). Click **Deploy**.
   - It deploys a placeholder "Hello World" worker — that's expected.

## Step 2 — Paste in the real code

1. On the Worker's page click **Edit code** (top right).
2. Delete everything in the editor.
3. Open the file **`chat-worker/worker.js`** from the repo, copy **all** of it, and paste it into the editor.
   - View it on GitHub: `https://github.com/sanjaydoc/Stemcellsprotocol/blob/main/chat-worker/worker.js` → click the **Copy raw file** icon.
4. Click **Deploy** (top right of the editor). Confirm if asked.

## Step 3 — Add your key and settings

1. Go back to the Worker's main page → **Settings** tab → **Variables and Secrets** (older UIs: **Settings → Variables**).
2. Under **Secrets** (or "Environment Variables" with the **Encrypt** toggle ON):
   - Click **Add** → Name: **`ANTHROPIC_API_KEY`** → Value: paste your `sk-ant-…` key → make sure it's marked **Secret/Encrypted** → **Save**.
3. Under **Variables** (plain text, NOT encrypted):
   - Click **Add** → Name: **`ALLOWED_ORIGINS`** → Value: **`https://sanjaydoc.github.io`** → **Save**.
   - *(Optional)* Add **`MODEL`** = `claude-sonnet-4-5-20250929` to pin the model. Leave it out to use the default.
4. If it asks you to **redeploy** to apply variables, do it (or hit **Deploy** once more on the editor page).

## Step 4 — Copy your Worker URL

On the Worker's main page you'll see its URL, like:

```
https://stemcells-chat.<your-subdomain>.workers.dev
```

Copy it. **This is the only thing I need to finish the setup.**

---

## Step 5 — Connect the website

**Easiest:** paste your Worker URL to me in chat and I'll wire it into the site,
rebuild, and push — done.

**Or do it yourself on GitHub (no terminal):**

1. Open `docs/index.html` in the repo on GitHub → click the **pencil (Edit)** icon.
2. Find the line `<div id="root"></div>` (near the bottom).
3. Immediately **above** it, add this line — replacing the URL with yours:
   ```html
   <script>window.STEMCELLS_CHAT_ENDPOINT = "https://stemcells-chat.<your-subdomain>.workers.dev";</script>
   ```
4. Scroll down → **Commit changes** to the `main` branch.
5. Wait ~1 minute for GitHub Pages to redeploy, then hard-refresh the site.

> Note: this line lives in `docs/index.html`. If the site is later rebuilt with
> `npm run build:pages`, re-add it, **or** set `VITE_CHAT_ENDPOINT` in
> `client/.env` before building so it's baked in permanently. (I can set that up.)

---

## Step 6 — Test it

1. Open <https://sanjaydoc.github.io/Stemcellsprotocol/>.
2. In the hero, click **"Ask our AI care assistant"**.
3. Ask something like *"What is ER-100 age reversal?"* — you should see a
   streaming reply. Try attaching an image or PDF too.

If you get an error: re-check that `ANTHROPIC_API_KEY` is saved as a **Secret**,
that `ALLOWED_ORIGINS` exactly matches your site origin (no trailing slash), and
that your Anthropic account has credit.

---

## Optional — stop abuse (recommended for a public endpoint)

Add simple per-IP rate limiting so bots can't run up your Anthropic bill:

1. Cloudflare dashboard → **Storage & Databases** → **KV** → **Create a namespace**, name it `RATE_LIMIT`.
2. Back in the Worker → **Settings → Variables and Secrets → KV Namespace Bindings** → **Add binding**:
   - Variable name: **`RATE_LIMIT`** → Namespace: the one you just made → **Save**.
3. Redeploy. The Worker now allows ~20 messages/minute per visitor.
