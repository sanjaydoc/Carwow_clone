import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSaved } from '../context/SavedContext';

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition ${
    isActive ? 'text-clay-600' : 'text-ink-700/70'
  }`;

export default function MobileNav() {
  const { user } = useAuth();
  const { count } = useSaved();

  return (
    <>
      {/* Sticky "sell your car" banner, mirrors the reference site */}
      <Link
        to="/sell"
        className="fixed inset-x-0 bottom-[60px] z-40 block bg-clay-500 py-2.5 text-center text-sm font-bold text-white underline decoration-2 underline-offset-2 md:hidden"
      >
        Sell your car fast, fair, and totally free
      </Link>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] items-stretch border-t border-cream-300 bg-white md:hidden">
        <NavLink to="/" className={itemClass} end>
          <HomeIcon />
          Home
        </NavLink>
        <NavLink to="/browse" className={itemClass}>
          <CarIcon />
          Buy
        </NavLink>
        <NavLink to="/sell" className={itemClass}>
          <TagIcon />
          Sell
        </NavLink>
        <NavLink to="/saved" className={itemClass}>
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
        <NavLink to={user ? '/saved' : '/login'} className={itemClass}>
          <UserIcon />
          {user ? 'Account' : 'Log in'}
        </NavLink>
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
      <path d="M12 2v4M12 18v4M6 12H2M22 12h-4" opacity="0" />
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
function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}
