import { Link, useNavigate } from 'react-router-dom';

const options = [
  { label: 'By department', to: '/browse' },
  { label: 'Established therapies', to: '/browse?condition=new' },
  { label: 'Clinical trials & research', to: '/research' },
  { label: 'Compare therapies', to: '/compare' },
];

export default function Buying() {
  const navigate = useNavigate();

  return (
    <div className="container-x max-w-2xl py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 font-display text-lg font-bold text-ink-900 hover:text-clay-600"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <h1 className="mt-6 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
        What are you looking for?
      </h1>

      <div className="mt-6 space-y-3">
        {options.map((o) => (
          <Link
            key={o.label}
            to={o.to}
            className="flex items-center justify-between rounded-2xl border border-ink-900/15 bg-white px-6 py-5 font-display text-lg font-bold text-ink-900 transition hover:border-clay-400 hover:text-clay-600 hover:shadow-card"
          >
            {o.label}
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-clay-500" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl font-extrabold text-ink-900">
        Not sure where to start?
      </h2>
      <Link
        to="/consultation"
        className="mt-4 flex items-center justify-center rounded-2xl border border-ink-900/15 bg-white px-6 py-5 font-display text-lg font-bold text-ink-900 transition hover:border-clay-400 hover:text-clay-600 hover:shadow-card"
      >
        Book a consultation
      </Link>
    </div>
  );
}
