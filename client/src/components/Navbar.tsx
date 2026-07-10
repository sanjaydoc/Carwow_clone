import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSaved } from '../context/SavedContext';

const links = [
  { to: '/buy', label: 'Buy a car' },
  { to: '/sell', label: 'Sell my car' },
  { to: '/compare', label: 'Compare' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useSaved();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-sm font-semibold rounded-full transition ${
      isActive ? 'text-clay-600 bg-clay-50' : 'text-ink-800 hover:text-clay-600'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-cream-300 bg-cream-100/85 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <Logo />
          <span className="font-display text-xl font-extrabold tracking-tight text-ink-900">
            car<span className="text-clay-500">wow</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/saved" className="btn-ghost relative">
            <HeartIcon />
            Saved
            {count > 0 && (
              <span className="ml-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-clay-500 px-1 text-xs font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-clay-100 font-bold text-clay-700">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="btn-outline px-4 py-2 text-sm"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary px-5 py-2.5 text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-lg md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-cream-300 bg-cream-100 md:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={navClass}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            <NavLink to="/saved" className={navClass} onClick={() => setOpen(false)}>
              Saved {count > 0 && `(${count})`}
            </NavLink>
            <div className="mt-2 flex gap-2">
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                    navigate('/');
                  }}
                  className="btn-outline flex-1 py-2 text-sm"
                >
                  Log out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn-outline flex-1 py-2 text-sm"
                    onClick={() => setOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary flex-1 py-2 text-sm"
                    onClick={() => setOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8">
      <rect width="64" height="64" rx="14" fill="#D97757" />
      <path
        d="M12 38c0-2 1-3 3-3l3-8c1-3 3-4 6-4h16c3 0 5 1 6 4l3 8c2 0 3 1 3 3v7c0 1-1 2-2 2h-3c-1 0-2-1-2-2v-2H19v2c0 1-1 2-2 2h-3c-1 0-2-1-2-2z"
        fill="#fff"
      />
      <circle cx="20" cy="41" r="3" fill="#D97757" />
      <circle cx="44" cy="41" r="3" fill="#D97757" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 2 4.9 5.3 4.9c2 0 3.4 1.1 4.2 2.4h.9c.8-1.3 2.2-2.4 4.2-2.4 3.3 0 5 3.5 3.3 6.9C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
