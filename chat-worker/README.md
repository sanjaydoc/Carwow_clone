# StemCells Protocol — chat proxy (Cloudflare Worker)

The website is a **static** GitHub Pages site, so it cannot safely hold an
Anthropic API key (anything in the frontend bundle is public). This tiny Worker
is the secure middle layer: the browser talks to the Worker, the Worker holds
the key and talks to Anthropic. **The key never reaches the browser.**

```
Browser (GitHub Pages)  →  this Worker (holds ANTHROPIC_API_KEY)  →  Anthropic API
```

## Deploy (5 minutes)

1. **Install Wrangler & log in**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Set your API key as an encrypted secret** (from this folder)
   ```bash
   cd chat-worker
   wrangler secret put ANTHROPIC_API_KEY
   # paste your key when prompted
   ```

3. **Set allowed origins** — edit `wrangler.toml` → `ALLOWED_ORIGINS` so it lists
   your live site (and localhost for dev), e.g.
   `https://sanjaydoc.github.io,http://localhost:5173`.

4. **Deploy**
   ```bash
   wrangler deploy
   ```
   Wrangler prints a URL like `https://stemcells-chat.<your-subdomain>.workers.dev`.

5. **Point the site at the Worker.** Two options:
   - **Build-time (recommended):** create `client/.env` with
     `VITE_CHAT_ENDPOINT=https://stemcells-chat.<your-subdomain>.workers.dev`
     then rebuild: `npm run build:pages` and commit `docs/`.
   - **Runtime (no rebuild):** add this line to `docs/index.html` before the app
     script — handy for flipping the endpoint without rebuilding:
     ```html
     <script>window.STEMCELLS_CHAT_ENDPOINT = "https://stemcells-chat.<your-subdomain>.workers.dev";</script>
     ```

That's it — the chat widget on the homepage goes live.

## Optional: rate limiting

To throttle abuse (default 20 requests/min per IP):
```bash
wrangler kv namespace create RATE_LIMIT
```
Paste the returned `id` into `wrangler.toml` under `[[kv_namespaces]]`, uncomment
that block, and `wrangler deploy` again.

## Cost & model

- Free tier: **100,000 requests/day** on Cloudflare Workers.
- Model defaults to a current Claude Sonnet (`DEFAULT_MODEL` in `worker.js`).
  For lower cost, set `MODEL` in `wrangler.toml` to a Haiku model; for maximum
  quality use an Opus model. You pay Anthropic per token separately.

## Scope & safety

The system prompt (in `worker.js`) constrains the assistant to StemCells
Protocol, regenerative medicine, and general medicine / allopathy — primary &
emergency care, OTC & prescription drugs, and post-operative surgical care. It
gives **educational** information, redirects emergencies to local emergency
services, and does **not** issue individualized diagnoses or prescriptions.
Edit `SYSTEM_PROMPT` to adjust tone or scope, then redeploy.
