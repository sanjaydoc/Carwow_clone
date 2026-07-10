import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSaved } from '../context/SavedContext';

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition ${
    isActive ? 'text-clay-600' : 'text-ink-700/70'
  }`;

const menuLinks = [
  { to: '/browse', label: 'Buy a car' },
  { to: '/browse?condition=new', label: 'New cars' },
  { to: '/browse?condition=used', label: 'Used cars' },
  { to: '/browse?fuel_type=Electric', label: 'Electric cars' },
  { to: '/sell', label: 'Sell my car' },
  { to: '/compare', label: 'Compare cars' },
  { to: '/saved', label: 'Saved cars' },
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
            {menuLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                onClick={close}
                className="flex items-center justify-between border-b border-cream-300 px-5 py-4 font-display text-lg font-bold text-ink-900"
              >
                {l.label}
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-500" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
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
        <NavLink to="/" className={itemClass} end onClick={close}>
          <HomeIcon />
          Home
        </NavLink>
        <NavLink to="/browse" className={itemClass} onClick={close}>
          <CarIcon />
          Buy
        </NavLink>
        <NavLink to="/sell" className={itemClass} onClick={close}>
          <TagIcon />
          Sell
        </NavLink>
        <NavLink to="/saved" className={itemClass} onClick={close}>
          <span className="relative">
            <HeartIcon />
            {count > 0 && (
              <span className="absolute -right-2 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-clay-500 px-1 text-[9px] font-bold text-white">
                {count}
              </span>
            )}
          </span>
          Saved
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

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function CarIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13" />
      <path d="M3 13h18v4H3z" />
      <circle cx="7" cy="17" r="1.5" />
      <circle cx="17" cy="17" r="1.5" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5c0-1.4 1.1-2.2 2.5-2.2s2.5.8 2.5 2c0 2-2.5 1.8-2.5 3.4" />
      <circle cx="12" cy="16.2" r="0.6" fill="currentColor" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 2 4.9 5.3 4.9c2 0 3.4 1.1 4.2 2.4h.9c.8-1.3 2.2-2.4 4.2-2.4 3.3 0 5 3.5 3.3 6.9C19.5 16.4 12 21 12 21z" />
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
