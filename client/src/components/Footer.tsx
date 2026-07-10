import { Link } from 'react-router-dom';

const columns = [
  {
    title: 'Buy',
    links: [
      { label: 'New cars', to: '/browse?condition=new' },
      { label: 'Used cars', to: '/browse?condition=used' },
      { label: 'Electric cars', to: '/browse?fuel_type=Electric' },
      { label: 'Compare cars', to: '/compare' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { label: 'Sell my car', to: '/sell' },
      { label: 'How it works', to: '/sell' },
      { label: 'Car valuation', to: '/sell' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', to: '/' },
      { label: 'Careers', to: '/' },
      { label: 'Help centre', to: '/' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-cream-300 bg-cream-200">
      <div className="container-x py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-extrabold text-ink-900">
                car<span className="text-clay-500">wow</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-700/70">
              The stress-free way to buy, sell and compare cars. Get the best price from trusted
              dealers.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-bold text-ink-900">{col.title}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-ink-700/70 transition hover:text-clay-600"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-cream-300 pt-6 text-sm text-ink-700/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Carwow clone. A demo project.</p>
          <p>Built with React, Vite &amp; Node.js.</p>
        </div>
      </div>
    </footer>
  );
}
