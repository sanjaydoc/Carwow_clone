// Self-contained line-art medical icons (no network, no external CDN).
// Departments map to the `make` field; therapy categories map to `body_type`.
import type { ReactNode } from 'react';

export const DEPARTMENTS = [
  'Age Rejuvenation',
  'Diabetes',
  'HIV',
  'Autoimmune',
  'Dental',
  'Orthopedics',
  'Cardiology',
  'Gastroenterology',
  'Neurology',
  'Pulmonology',
  'Cosmetic',
] as const;

export const CATEGORIES = ['MSC', 'HSC', 'iPSC', 'Exosome', 'Immune cell', 'PRP'] as const;

function deptPaths(name: string): ReactNode {
  switch (name) {
    case 'Dental':
      return (
        <path d="M12 3.2c-2.2-1.2-5-.8-6 1.2-1 2-.4 5 .4 8 .5 2 .8 4.5 1.6 6 .6 1.1 1.6.9 1.9-.3.3-1.2.4-3 1.1-3s.8 1.8 1.1 3c.3 1.2 1.3 1.4 1.9.3.8-1.5 1.1-4 1.6-6 .8-3 1.4-6 .4-8-1-2-3.8-2.4-6-1.2Z" />
      );
    case 'Orthopedics':
      return (
        <>
          <path d="M8.8 8.8 15.2 15.2" />
          <circle cx="6.8" cy="6.8" r="2.1" />
          <circle cx="9.2" cy="5" r="2.1" />
          <circle cx="17.2" cy="17.2" r="2.1" />
          <circle cx="14.8" cy="19" r="2.1" />
        </>
      );
    case 'Cardiology':
      return (
        <>
          <path d="M12 20s-6.5-4-9-8.2C1.5 9 3 6 6 6c1.8 0 3 1 3.7 2h.6C11 7 12.2 6 14 6c3 0 4.5 3 3 5.8C18.5 16 12 20 12 20z" />
          <path d="M6 12h2.5l1.3-2 1.6 4 1.4-3 1 1H18" />
        </>
      );
    case 'Gastroenterology':
      return (
        <path d="M8 3.5v3.6c0 1.6 1.1 2.6 2.7 2.8C13.4 10.2 15.5 11 15.5 14.5S13 20 10.2 20c-2.4 0-4.2-1.5-4.6-3.6M15.5 14.5c1.5.1 2.6 1.1 2.6 2.6" />
      );
    case 'Neurology':
      return (
        <>
          <path d="M12 5.4v14.2" />
          <path d="M12 6a2.5 2.5 0 0 0-4.8-1A2.4 2.4 0 0 0 5 8a2.5 2.5 0 0 0-.3 4.4A2.4 2.4 0 0 0 7 16a2.3 2.3 0 0 0 3 2" />
          <path d="M12 6a2.5 2.5 0 0 1 4.8-1A2.4 2.4 0 0 1 19 8a2.5 2.5 0 0 1 .3 4.4A2.4 2.4 0 0 1 17 16a2.3 2.3 0 0 1-3 2" />
        </>
      );
    case 'Pulmonology':
      return (
        <>
          <path d="M12 3v7" />
          <path d="M12 10c-1-1.6-3.2-2-4.2.1-1 2-1.4 5-1.2 7.6.1 1.3 1.5 2 2.7 1.4C11 15.2 12 14 12 12" />
          <path d="M12 10c1-1.6 3.2-2 4.2.1 1 2 1.4 5 1.2 7.6-.1 1.3-1.5 2-2.7 1.4C13 15.2 12 14 12 12" />
        </>
      );
    case 'Cosmetic':
      return (
        <>
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
          <circle cx="17.5" cy="16.5" r="1.4" />
        </>
      );
    case 'Age Rejuvenation':
      return (
        <>
          <path d="M7 3c0 5 10 6 10 9s-10 4-10 9" />
          <path d="M17 3c0 5-10 6-10 9s10 4 10 9" />
          <line x1="8.6" y1="6.8" x2="15.4" y2="6.8" />
          <line x1="9.6" y1="12" x2="14.4" y2="12" />
          <line x1="8.6" y1="17.2" x2="15.4" y2="17.2" />
        </>
      );
    case 'Diabetes':
      return (
        <>
          <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
          <path d="M9.2 13.5a3 3 0 0 0 2 3" />
        </>
      );
    case 'Autoimmune':
      return (
        <>
          <path d="M12 3l7 3v5c0 4.6-3 7.7-7 9-4-1.3-7-4.4-7-9V6z" />
          <path d="M9.3 12l1.9 1.9L15 10" />
        </>
      );
    case 'HIV':
      // Awareness ribbon: a looped top with two crossing tails.
      return (
        <>
          <path d="M12 12.5c-2.4-2.2-4-4.1-4-6.1A2.6 2.6 0 0 1 12 4a2.6 2.6 0 0 1 4 2.4c0 2-1.6 3.9-4 6.1z" />
          <path d="M10.4 11.2 8 21" />
          <path d="M13.6 11.2 16 21" />
        </>
      );
    default:
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <circle cx="15.6" cy="8.4" r="1" />
        </>
      );
  }
}

function categoryPaths(name: string): ReactNode {
  switch (name) {
    case 'HSC':
      return (
        <>
          <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
          <path d="M9 14a3 3 0 0 0 2 3" />
        </>
      );
    case 'iPSC':
      return (
        <>
          <circle cx="12" cy="12" r="6.5" />
          <path d="M18 8.5A6.5 6.5 0 1 0 19 13" />
          <path d="M19 5.5v3.2h-3.2" />
        </>
      );
    case 'Exosome':
      return (
        <>
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="11" cy="11" r="1.1" />
          <circle cx="14" cy="13.5" r="1.1" />
        </>
      );
    case 'Immune cell':
      return <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />;
    case 'PRP':
      return (
        <>
          <path d="M9 3h6M10 3v14a2 2 0 0 0 4 0V3" />
          <line x1="10" y1="11.5" x2="14" y2="11.5" />
        </>
      );
    default: // MSC — mesenchymal stem cell
      return (
        <>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3" />
          <circle cx="15.6" cy="8.4" r="1" />
        </>
      );
  }
}

interface GlyphProps {
  className?: string;
  strokeWidth?: number;
}

export function DepartmentIcon({ name, className = '', strokeWidth = 1.7 }: { name: string } & GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={`${name} icon`}
    >
      {deptPaths(name)}
    </svg>
  );
}

export function CategoryIcon({ name, className = '', strokeWidth = 1.7 }: { name: string } & GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={`${name} icon`}
    >
      {categoryPaths(name)}
    </svg>
  );
}

export function ResearchFlask({ className = '', strokeWidth = 1.7 }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="research icon"
    >
      <path d="M9 3h6" />
      <path d="M10 3v6l-4.5 8c-.6 1 .1 2.3 1.3 2.3h10.4c1.2 0 1.9-1.3 1.3-2.3L14 9V3" />
      <line x1="7.5" y1="14" x2="16.5" y2="14" />
    </svg>
  );
}
