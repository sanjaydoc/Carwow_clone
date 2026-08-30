import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSaved } from '../context/SavedContext';

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition ${
    isActive ? 'text-clay-600' : 'text-ink-700/70'
  }`;

interface MenuSection {
  title: string;
  to?: string; // direct link (no dropdown)
  links?: [string, string][];
}

const menuSections: MenuSection[] = [
  {
    title: 'Therapies by department',
    links: [
      ['All therapies', '/browse'],
      ['Established therapies', '/browse?condition=new'],
      ['By department', '/therapies'],
      ['Compare therapies', '/compare'],
      ['How it works', '/therapies'],
    ],
  },
  {
    title: 'Conditions we treat',
    links: [
      ['Dental', '/browse?make=Dental'],
      ['Orthopedics', '/browse?make=Orthopedics'],
      ['Cardiology', '/browse?make=Cardiology'],
      ['Neurology', '/browse?make=Neurology'],
      ['Pulmonology', '/browse?make=Pulmonology'],
      ['All departments', '/browse'],
    ],
  },
  {
    title: 'Regenerative categories',
    links: [
      ['Mesenchymal (MSC)', '/browse?body_type=MSC'],
      ['Haematopoietic (HSC)', '/browse?body_type=HSC'],
      ['iPSC therapies', '/browse?body_type=iPSC'],
      ['Exosome therapies', '/browse?body_type=Exosome'],
      ['Immune-cell therapies', '/browse?body_type=Immune cell'],
    ],
  },
  { title: 'Protocol Simulator', to: '/simulator' },
  { title: 'Clinical trials & research', to: '/research' },
  { title: 'Care packages & financing', to: '/care' },
  {
    title: 'Book a consultation',
    links: [
      ['Book a consultation', '/consultation'],
      ['Check candidacy', '/consultation'],
      ['Talk to a specialist', '/consultation'],
    ],
  },
  {
    title: 'Patient guides & news',
    links: [
      ['Guides & advice', '/'],
      ['Compare therapies', '/compare'],
    ],
  },
  { title: 'Investors', to: '/investors' },
];

export default function MobileNav() {
  const { user, logout } = useAuth();
  const { count } = useSaved();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  return (
    <>
      {/* Full-screen menu sheet */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-cream-100 md:hidden">
          <div className="flex items-center justify-between border-b border-cream-300 px-4 py-4">
            <span className="font-display text-xl font-extrabold text-ink-900">
              StemCells <span className="text-clay-500">Protocol</span>
            </span>
            <button
              onClick={close}
              aria-label="Close menu"
              className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto">
            {menuSections.map((s) =>
              s.to ? (
                <Link
                  key={s.title}
                  to={s.to}
                  onClick={close}
                  className="block border-b border-cream-300 px-5 py-4 font-display text-lg font-bold text-ink-900"
                >
                  {s.title}
                </Link>
              ) : (
                <details key={s.title} className="group border-b border-cream-300">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-display text-lg font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
                    {s.title}
                    <svg viewBox="0 0 24 24" className="h-5 w-5 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="bg-cream-100 pb-2">
                    {s.links!.map(([label, to]) => (
                      <Link
                        key={label}
                        to={to}
                        onClick={close}
                        className="block px-8 py-3 text-ink-800 transition hover:text-clay-600"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </details>
              )
            )}
          </nav>

          <div className="border-t border-cream-300 p-4">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-clay-100 font-bold text-clay-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-ink-900">{user.name}</p>
                  <p className="text-sm text-ink-700/60">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    close();
                    navigate('/');
                  }}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" onClick={close} className="btn-outline flex-1 justify-center py-3 text-sm">
                  Log in
                </Link>
                <Link to="/register" onClick={close} className="btn-primary flex-1 justify-center py-3 text-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating "book a consultation" banner */}
      <Link
        to="/consultation"
        className="fixed inset-x-3 bottom-[84px] z-40 block rounded-full bg-clay-500 py-2.5 text-center text-sm font-bold text-white shadow-lg underline decoration-2 underline-offset-2 md:hidden"
      >
        Book a free, no-obligation consultation
      </Link>

      {/* Floating bottom navigation */}
      <nav className="fixed inset-x-3 bottom-3 z-40 flex h-[64px] items-stretch overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-[0_8px_30px_rgba(20,20,19,0.18)] md:hidden">
        <NavLink to="/therapies" className={itemClass} onClick={close}>
          <CellIcon />
          Therapies
        </NavLink>
        <NavLink to="/consultation" className={itemClass} onClick={close}>
          <CalendarIcon />
          Consult
        </NavLink>
        <NavLink to="/research" className={itemClass} onClick={close}>
          <FlaskIcon />
          Research
        </NavLink>
        <NavLink to={user ? '/saved' : '/login'} className={itemClass} onClick={close}>
          <span className="relative">
            <UserIcon />
            {count > 0 && (
              <span className="absolute -right-2 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-clay-500 px-1 text-[9px] font-bold text-white">
                {count}
              </span>
            )}
          </span>
          {user ? 'Account' : 'Log in'}
        </NavLink>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition ${
            menuOpen ? 'text-clay-600' : 'text-ink-700/70'
          }`}
        >
          <MenuIcon />
          Menu
        </button>
      </nav>
    </>
  );
}

const iconProps = {
  className: 'h-5 w-5',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

function CellIcon() {
  // Stem cell: membrane, nucleus and a small budding daughter cell.
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="13" r="6.5" />
      <circle cx="11" cy="13" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="6.5" r="2" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="5" width="16" height="16" rx="2.5" />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
      <path d="M12 12.5v4M10 14.5h4" />
    </svg>
  );
}
function FlaskIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 3h6" />
      <path d="M10 3v6l-4.4 8c-.6 1 .1 2.3 1.3 2.3h10.2c1.2 0 1.9-1.3 1.3-2.3L14 9V3" />
      <path d="M7.6 14h8.8" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
