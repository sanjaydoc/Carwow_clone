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
    title: 'New car reviews',
    links: [
      ['Car reviews', '/browse?condition=new&sort=rating_desc'],
      ['By make', '/browse?condition=new'],
      ['By type', '/browse?condition=new'],
      ['By popular models', '/browse?sort=rating_desc'],
      ['How we test cars', '/browse'],
    ],
  },
  {
    title: 'Used cars',
    links: [
      ['Used cars', '/browse?condition=used'],
      ['By make', '/browse?condition=used'],
      ['By type', '/browse?condition=used'],
      ['By popular models', '/browse?condition=used&sort=rating_desc'],
      ['By popular location', '/browse?condition=used'],
      ['Car history checker', '/browse?condition=used'],
    ],
  },
  {
    title: 'Car leasing',
    links: [
      ['Carwow Leasey', '/browse?sort=monthly_asc'],
      ['Car leasing', '/browse?sort=monthly_asc'],
      ['Business car leasing', '/browse?sort=monthly_asc'],
      ['By make', '/browse?sort=monthly_asc'],
      ['By type', '/browse?sort=monthly_asc'],
      ['By popular models', '/browse?sort=monthly_asc'],
    ],
  },
  {
    title: 'Car deals',
    links: [
      ['New car deals', '/browse?condition=new&sort=price_asc'],
      ['By make', '/browse?condition=new'],
      ['By popular models', '/browse?condition=new&sort=rating_desc'],
      ['By latest deals', '/ev-deals'],
    ],
  },
  {
    title: 'Sell my car',
    links: [
      ['Sell my car', '/sell'],
      ['By popular location', '/sell'],
      ['By popular makes', '/sell'],
      ['Value my car', '/sell'],
      ['Sell my van', '/sell'],
    ],
  },
  {
    title: 'Car guides and news',
    links: [
      ['Car news and advice', '/'],
      ['Car tools', '/compare'],
    ],
  },
  { title: 'Car insurance', to: '/car-insurance' },
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
              car<span className="text-clay-500">wow</span>
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

      {/* Floating "sell your car" banner */}
      <Link
        to="/sell"
        className="fixed inset-x-3 bottom-[84px] z-40 block rounded-full bg-clay-500 py-2.5 text-center text-sm font-bold text-white shadow-lg underline decoration-2 underline-offset-2 md:hidden"
      >
        Sell your car fast, fair, and totally free
      </Link>

      {/* Floating bottom navigation */}
      <nav className="fixed inset-x-3 bottom-3 z-40 flex h-[64px] items-stretch overflow-hidden rounded-2xl border border-cream-300 bg-white/95 shadow-[0_8px_30px_rgba(20,20,19,0.18)] backdrop-blur md:hidden">
        <NavLink to="/buy" className={itemClass} onClick={close}>
          <span className="relative">
            <HeartIcon />
            {count > 0 && (
              <span className="absolute -right-2 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-clay-500 px-1 text-[9px] font-bold text-white">
                {count}
              </span>
            )}
          </span>
          Buying
        </NavLink>
        <NavLink to="/sell" className={itemClass} onClick={close}>
          <PoundIcon />
          Selling
        </NavLink>
        <NavLink to="/ev-deals" className={itemClass} onClick={close}>
          <BoltIcon />
          EV Deals
        </NavLink>
        <NavLink to={user ? '/saved' : '/login'} className={itemClass} onClick={close}>
          <UserIcon />
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

function PoundIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M13.8 8.6c-.6-.6-1.6-.7-2.3-.2-.6.4-.9 1.2-.7 2l.4 1.8c.2.8-.1 1.6-.7 2.1M9.3 12.3h3.4M8.9 16h5.8"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg {...iconProps} fill="currentColor" stroke="none">
      <path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z" />
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
function HeartIcon() {
  // A car silhouette with a heart centred on the body (carwow "Buying").
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 15.2v-1c0-.45.25-.85.66-1.03l1.34-.57 1.5-3A2 2 0 0 1 7.8 8.5h8.4a2 2 0 0 1 1.8 1.1l1.5 3 1.34.57c.41.18.66.58.66 1.03v1" />
      <path d="M2.5 15.2h19" />
      <circle cx="7" cy="16.4" r="1.7" />
      <circle cx="17" cy="16.4" r="1.7" />
      <path
        fill="currentColor"
        stroke="none"
        d="M12 10.1c-.55-.62-1.45-.78-2.12-.3-.78.56-.78 1.55-.13 2.2L12 14.2l2.25-2.2c.65-.65.65-1.64-.13-2.2-.67-.48-1.57-.32-2.12.3z"
      />
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
