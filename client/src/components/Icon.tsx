// Professional, theme-matched line icons used across the site in place of
// emoji. All icons inherit `currentColor` so colour is set by the parent's
// text colour; pair with the `.icon-tile` neumorphic container for feature
// blocks. Keep the stroke style consistent (width 1.8, round caps/joins).

export type IconName =
  | 'dna'
  | 'brain'
  | 'dish'
  | 'syringe'
  | 'star'
  | 'heart'
  | 'stethoscope'
  | 'clinician'
  | 'hospital'
  | 'ai'
  | 'microscope'
  | 'clipboard'
  | 'banknote'
  | 'users'
  | 'tag'
  | 'trending'
  | 'scale'
  | 'flask'
  | 'clock';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export default function Icon({ name, className = 'h-6 w-6' }: { name: IconName; className?: string }) {
  const p = { viewBox: '0 0 24 24', className, 'aria-hidden': true };
  switch (name) {
    case 'dna':
      return (
        <svg {...p} {...stroke}>
          <path d="M8 2c0 4 8 6 8 10s-8 6-8 10" />
          <path d="M16 2c0 4-8 6-8 10s8 6 8 10" />
          <path d="M9.5 5h5M8.5 9h7M8.5 15h7M9.5 19h5" />
        </svg>
      );
    case 'brain':
      return (
        <svg {...p} {...stroke}>
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
          <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
          <path d="M17.6 6.5a3 3 0 0 0 .4-1.4M6 5.1a3 3 0 0 0 .4 1.4" />
          <path d="M6 18a4 4 0 0 1-2-.5M20 17.5a4 4 0 0 1-2 .5" />
        </svg>
      );
    case 'dish':
      return (
        <svg {...p} {...stroke}>
          <path d="M3 9h18" />
          <path d="M4.5 9v3c0 3.3 3.4 5 7.5 5s7.5-1.7 7.5-5V9" />
          <circle cx="10" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="13.5" cy="13.5" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'syringe':
      return (
        <svg {...p} {...stroke}>
          <path d="m18 2 4 4" />
          <path d="m17 7 3-3" />
          <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
          <path d="m9 11 4 4" />
          <path d="m5 19-3 3" />
          <path d="m14 4 6 6" />
        </svg>
      );
    case 'star':
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M12 2.5l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9l-5.7 3.7 1.4-6.3-4.8-4.3 6.4-.6z" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...p} fill="currentColor" stroke="none">
          <path d="M12 21s-7.5-4.7-10-9.2C.5 8.9 2.1 5 5.8 5 8 5 9.3 6.2 12 8.9 14.7 6.2 16 5 18.2 5c3.7 0 5.3 3.9 3.8 6.8C19.5 16.3 12 21 12 21z" />
        </svg>
      );
    case 'stethoscope':
      return (
        <svg {...p} {...stroke}>
          <path d="M6 3H5a2 2 0 0 0-2 2v4a5 5 0 0 0 10 0V5a2 2 0 0 0-2-2h-1" />
          <path d="M8 14v1a6 6 0 0 0 12 0v-3" />
          <circle cx="20" cy="10" r="2" />
        </svg>
      );
    case 'clinician':
      return (
        <svg {...p} {...stroke}>
          <circle cx="12" cy="7.5" r="4" />
          <path d="M5 21a7 7 0 0 1 14 0" />
          <path d="M12 11.5v3M10.5 13h3" />
        </svg>
      );
    case 'hospital':
      return (
        <svg {...p} {...stroke}>
          <path d="M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15" />
          <path d="M2 21h20" />
          <path d="M12 7v5M9.5 9.5h5" />
          <path d="M9.5 21v-3h5v3" />
        </svg>
      );
    case 'ai':
      return (
        <svg {...p} {...stroke}>
          <rect x="6" y="6" width="12" height="12" rx="2.5" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
          <path d="M9 2v2.5M15 2v2.5M9 19.5V22M15 19.5V22M2 9h2.5M2 15h2.5M19.5 9H22M19.5 15H22" />
        </svg>
      );
    case 'microscope':
      return (
        <svg {...p} {...stroke}>
          <path d="M6 18h8" />
          <path d="M3 22h18" />
          <path d="M14 22a7 7 0 0 0 0-14" />
          <path d="M9 14h2" />
          <path d="M9 12a2 2 0 0 1-2-2V7h6v3a2 2 0 0 1-2 2Z" />
          <path d="M12 7V4a1 1 0 0 0-1-1H9" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...p} {...stroke}>
          <rect x="8" y="2.5" width="8" height="4" rx="1" />
          <path d="M16 4.5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h2" />
          <path d="M8.5 11.5h7M8.5 15.5h7" />
        </svg>
      );
    case 'banknote':
      return (
        <svg {...p} {...stroke}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case 'users':
      return (
        <svg {...p} {...stroke}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...p} {...stroke}>
          <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" />
          <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'trending':
      return (
        <svg {...p} {...stroke}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case 'scale':
      return (
        <svg {...p} {...stroke}>
          <path d="M12 3v18" />
          <path d="M5 7h14M5 7 2 14a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z" />
          <path d="M7 21h10" />
        </svg>
      );
    case 'flask':
      return (
        <svg {...p} {...stroke}>
          <path d="M9 3h6" />
          <path d="M10 3v6l-4.4 8c-.6 1 .1 2.3 1.3 2.3h10.2c1.2 0 1.9-1.3 1.3-2.3L14 9V3" />
          <path d="M7.6 14h8.8" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...p} {...stroke}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    default:
      return null;
  }
}
