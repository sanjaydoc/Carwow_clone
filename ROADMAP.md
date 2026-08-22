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

## 🔨 In progress (this batch)
- **Voice input** — patients speak their question (Web Speech API); mic button in the composer.
- **Multi-language** — assistant replies in the same language the patient writes in.
- **Conversation memory** — follow-up questions in context (already sends history; polishing).
- **Save / export chat** — download the conversation (or a medicine/scan summary) as **PDF**, **Word (.doc)**, and **plain text**.

## 🗺️ Planned / ideas
- Admin dashboard — view sign-ups, consultation requests, chat volume
- Structured "consultation handoff" — chat summary pre-fills the consultation form (after dashboard)
- Email capture / lead follow-up (Web3Forms or backend)
- Analytics — popular questions, usage trends
- Accessibility pass (screen-reader labels, keyboard nav, contrast)
- Optional: stronger model tier toggle for complex scan reads
