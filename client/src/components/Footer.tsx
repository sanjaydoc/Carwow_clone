import { Link } from 'react-router-dom';
import InstallButton from './InstallButton';

const linkCols = [
  [
    { label: 'About us', to: '/about' },
    { label: 'Our specialists', to: '/specialists' },
    { label: 'Research & trials', to: '/research' },
    { label: 'Patient stories', to: '/' },
    { label: 'Contact us', to: '/investors' },
  ],
  [
    { label: 'Safety & accreditation', to: '/safety' },
    { label: 'Care packages', to: '/care' },
    { label: 'Browse therapies', to: '/browse' },
    { label: 'Book a consultation', to: '/consultation' },
    { label: 'Compare therapies', to: '/compare' },
    { label: 'Investors', to: '/investors' },
  ],
];

export default function Footer() {
  return (
    <footer className="bg-ink-900 text-white">
      <div className="container-x py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr]">
          {/* Help centre + socials */}
          <div>
            <div className="mb-5 flex items-center gap-2">
              <span className="font-display text-2xl font-extrabold">
                StemCells <span className="text-clay-400">Protocol</span>
              </span>
            </div>
            <h4 className="font-display text-lg font-bold underline decoration-clay-400 decoration-2 underline-offset-4">
              Help Centre
            </h4>
            <div className="mt-3 space-y-0.5 text-sm text-white/70">
              <p>Monday to Friday 9.00 – 18.00</p>
              <p>Saturday 9.00 – 17.30</p>
              <p>Sundays &amp; Bank Holidays closed</p>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <a href="mailto:dr.sanjay@stemcellsprotocol.com" className="block text-white/80 underline-offset-4 transition hover:text-clay-300 hover:underline">
                dr.sanjay@stemcellsprotocol.com
              </a>
              <a href="mailto:dr.sanjayanbu@gmail.com" className="block text-white/70 underline-offset-4 transition hover:text-clay-300 hover:underline">
                dr.sanjayanbu@gmail.com
              </a>
            </div>
            <div className="mt-5 flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-clay-500"
                >
                  {s.icon}
                </a>
              ))}
            </div>
            <InstallButton className="mt-5 inline-flex items-center gap-2 rounded-full bg-clay-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-clay-600" />
          </div>

          {/* Link columns */}
          {linkCols.map((col, i) => (
            <ul key={i} className="space-y-3 pt-2">
              {col.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-white/80 underline-offset-4 transition hover:text-clay-300 hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>

        {/* Patient rating */}
        <div className="mt-12 flex flex-col items-center gap-2 border-t border-white/10 pt-8 text-center">
          <p className="text-lg">
            Rated <span className="font-bold">4.6/5</span> from{' '}
            <span className="font-bold">4,800+</span> patient reviews
          </p>
          <div className="flex items-center gap-2">
            <span className="text-green-400">★</span>
            <span className="font-semibold">Trustpilot</span>
            <span className="flex gap-0.5">
              {[0, 1, 2, 3].map((n) => (
                <span key={n} className="grid h-5 w-5 place-items-center bg-green-500 text-xs text-white">
                  ★
                </span>
              ))}
              <span className="grid h-5 w-5 place-items-center bg-green-500/40 text-xs text-white">★</span>
            </span>
          </div>
        </div>

        {/* Legal */}
        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-white/60">
          <p>© {new Date().getFullYear()} StemCells Protocol. All rights reserved.</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {legal.map((l) => (
              <a key={l} href="#" onClick={(e) => e.preventDefault()} className="underline-offset-4 hover:text-white hover:underline">
                {l}
              </a>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4">
            {countries.map((c) => (
              <span key={c.label} className="flex items-center gap-2 text-white/70">
                <span className="text-lg">{c.flag}</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

const legal = [
  'Terms & conditions',
  'Manage cookies & privacy',
  'Medical disclaimer',
  'Patient data & GDPR',
  'Privacy policy',
  'Complaints procedure',
  'Safeguarding policy',
  'Accessibility notice',
  'Code of practice',
];

const countries = [
  { flag: '🇬🇧', label: 'UK' },
  { flag: '🇩🇪', label: 'Germany' },
  { flag: '🇪🇸', label: 'Spain' },
];

const iconCls = 'h-5 w-5';
const facebookIcon = (
  <svg viewBox="0 0 24 24" className={iconCls} fill="currentColor">
    <path d="M13 22v-8h2.7l.4-3H13V9c0-.9.3-1.5 1.6-1.5H16V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.7 1.4-3.7 3.9V11H7.5v3H10v8h3z" />
  </svg>
);
const socials = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/share/1KwtnA4Pkh/',
    icon: facebookIcon,
  },
  {
    label: 'X (Twitter)',
    href: 'https://x.com/Stemcellspvclg',
    icon: (
      <svg viewBox="0 0 24 24" className={iconCls} fill="currentColor">
        <path d="M17.5 3h3l-6.6 7.6L21.8 21h-6l-4.7-6.1L5.7 21h-3l7-8.1L2.5 3h6.1l4.2 5.6L17.5 3zm-1 16h1.6L8.1 4.7H6.4L16.5 19z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/stemcells_protocol',
    icon: (
      <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@stemcellsprotocol',
    icon: (
      <svg viewBox="0 0 24 24" className={iconCls} fill="currentColor">
        <path d="M23 12s0-3.2-.4-4.7c-.2-.8-.9-1.5-1.7-1.7C19.3 5.2 12 5.2 12 5.2s-7.3 0-8.9.4c-.8.2-1.5.9-1.7 1.7C1 8.8 1 12 1 12s0 3.2.4 4.7c.2.8.9 1.5 1.7 1.7 1.6.4 8.9.4 8.9.4s7.3 0 8.9-.4c.8-.2 1.5-.9 1.7-1.7C23 15.2 23 12 23 12zM9.7 15.3V8.7l5.7 3.3-5.7 3.3z" />
      </svg>
    ),
  },
  {
    label: 'Telegram',
    href: 'https://t.me/stemcellsprotocol',
    icon: (
      <svg viewBox="0 0 24 24" className={iconCls} fill="currentColor">
        <path d="M21.9 4.3 18.9 19c-.2 1-.8 1.2-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7L18.4 5c.4-.3-.1-.5-.6-.2L6.3 12l-4.6-1.4c-1-.3-1-1 .2-1.5l18-6.9c.8-.3 1.5.2 1.2 1.6z" />
      </svg>
    ),
  },
];
