# StemCells Protocol — Roadmap

Live at **https://stemcellsprotocol.com** · AI chat via a secure Cloudflare Worker (auto-deploys from `chat-worker/`).

## ✅ Shipped
- Custom domain (stemcellsprotocol.com) + HTTPS
- AI chat assistant (collapsible, theme-matched, streaming, markdown rendering)
- File upload — images & PDF
- ECG / X-ray / MRI / prescription / lab-report reading with plain-language patient summaries
- Full-length replies (SSE piped through Worker; parsing on the client)
- Rate limiting (20 req/min per IP via KV) + encrypted API key + $20/mo spend cap
- Auto-deploy for both site (GitHub Pages) and Worker (Workers Builds)
- Voice input, multi-language (typing/voice/replies), chat export (PDF/Word/text)
- **Visitor analytics** — Cloudflare Web Analytics (visitors, time-on-site, pages)
- **Data capture** — consultations, sign-ups & chat logs saved to Supabase (RLS insert-only + consent)
- **Admin dashboard** (`/#/admin`) — serverless, Supabase-Auth login, admin-only reads of all submissions

## 🗺️ Planned / ideas
- Dashboard polish — date filters, CSV export, search, charts/trends
- Full Supabase Auth for patients (replace the localStorage mock login)
- Structured "consultation handoff" — chat summary pre-fills the consultation form
- Data retention/deletion controls + published privacy policy (DPDP/GDPR)
- Email/WhatsApp notification when a new consultation arrives
- Email capture / lead follow-up (Web3Forms or backend)
- Analytics — popular questions, usage trends
- Accessibility pass (screen-reader labels, keyboard nav, contrast)
- Optional: stronger model tier toggle for complex scan reads
