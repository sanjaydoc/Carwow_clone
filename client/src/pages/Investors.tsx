import { Link } from 'react-router-dom';

const FOUNDER = {
  name: 'Dr. Sanjay Anbu',
  role: 'Founder',
  email: 'dr.sanjayanbu@gmail.com',
  // Both numbers are India (+91) and both have WhatsApp.
  phones: [
    { raw: '6385371758', display: '+91 63853 71758' },
    { raw: '6385181758', display: '+91 63851 81758' },
  ],
};

const highlights = [
  {
    icon: '🧬',
    title: 'ER-100 — flagship therapy',
    body: 'Partial epigenetic reprogramming to reset biological age at the cellular level, backed by a detailed investor briefing.',
  },
  {
    icon: '🏥',
    title: '11 departments, 58+ therapies',
    body: 'A broad regenerative-medicine platform spanning Age Rejuvenation, Cardiology, Neurology, Orthopedics and more.',
  },
  {
    icon: '🤖',
    title: 'AI-first patient experience',
    body: 'A multilingual AI care assistant that reads ECGs, scans and lab reports — lowering the cost of patient triage.',
  },
];

export default function Investors() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700">📈 For investors</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          Invest in the future of regenerative medicine
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          StemCells Protocol is building a regenerative-medicine hospital and platform around
          partial epigenetic reprogramming and stem-cell therapies. We welcome conversations with
          strategic and financial investors.
        </p>
      </div>

      {/* Highlights */}
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
        {highlights.map((h) => (
          <div key={h.title} className="card p-6">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-clay-100 text-3xl">{h.icon}</div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{h.title}</h3>
            <p className="mt-2 text-sm text-ink-700/70">{h.body}</p>
          </div>
        ))}
      </div>

      {/* Founder contact */}
      <div className="mx-auto mt-14 max-w-2xl">
        <div className="card overflow-hidden">
          <div className="bg-ink-900 p-8 text-white">
            <span className="chip bg-clay-500 text-white">Founder</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">Let's talk</h2>
            <p className="mt-2 text-white/70">
              For investment enquiries and partnership opportunities, reach the founder directly.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-clay-100 font-display text-2xl font-bold text-clay-700">
                {FOUNDER.name.charAt(0)}
              </span>
              <div>
                <p className="font-display text-xl font-bold text-ink-900">{FOUNDER.name}</p>
                <p className="text-sm text-ink-700/60">{FOUNDER.role}, StemCells Protocol</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <a
                href={`mailto:${FOUNDER.email}`}
                className="flex items-center gap-3 rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-clay-100 text-clay-600">
                  <MailIcon />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700/50">Email</span>
                  <span className="block truncate font-semibold text-ink-900">{FOUNDER.email}</span>
                </span>
              </a>

              {FOUNDER.phones.map((p) => (
                <a
                  key={`tel-${p.raw}`}
                  href={`tel:+91${p.raw}`}
                  className="flex items-center gap-3 rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-clay-300 hover:bg-clay-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-clay-100 text-clay-600">
                    <PhoneIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700/50">Phone</span>
                    <span className="block font-semibold text-ink-900">{p.display}</span>
                  </span>
                </a>
              ))}

              {FOUNDER.phones.map((p) => (
                <a
                  key={`wa-${p.raw}`}
                  href={`https://wa.me/91${p.raw}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-cream-300 px-5 py-4 transition hover:border-green-300 hover:bg-green-50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-green-100 text-green-600">
                    <WhatsAppIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-ink-700/50">WhatsApp</span>
                    <span className="block font-semibold text-ink-900">{p.display}</span>
                  </span>
                </a>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-ink-700/50">
              StemCells Protocol is a demo project. Figures and therapies shown across the site are
              illustrative and not medical advice.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="btn-outline px-6 py-3">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm0 18.02c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.14.82.84-3.06-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.7 8.24-8.24 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43l-.48-.01c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.15 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}
