import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Car } from '../types';
import CarImage from '../components/CarImage';
import StarRating from '../components/StarRating';
import Icon from '../components/Icon';
import { gbp } from '../utils/format';
import { Link } from 'react-router-dom';

const MAX = 3;

export default function Compare() {
  const [allCars, setAllCars] = useState<Car[]>([]);
  const [selected, setSelected] = useState<Car[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.getCars({ limit: 48 }).then(({ cars }) => setAllCars(cars));
  }, []);

  const results = useMemo(() => {
    const chosen = new Set(selected.map((c) => c.id));
    const q = query.toLowerCase().trim();
    return allCars
      .filter((c) => !chosen.has(c.id))
      .filter((c) => !q || `${c.make} ${c.model} ${c.trim}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allCars, selected, query]);

  const add = (car: Car) => {
    if (selected.length >= MAX) return;
    setSelected((s) => [...s, car]);
    setQuery('');
  };
  const remove = (id: number) => setSelected((s) => s.filter((c) => c.id !== id));

  const rows: { label: string; get: (c: Car) => string; highlight?: 'min' | 'max' }[] = [
    { label: 'Treatment cost', get: (c) => gbp(c.price), highlight: 'min' },
    { label: 'Financing /mo', get: (c) => `${gbp(c.monthly_price)}/mo`, highlight: 'min' },
    { label: 'Outcome score', get: (c) => `${c.rating.toFixed(1)} / 5`, highlight: 'max' },
    { label: 'Cell source', get: (c) => c.fuel_type },
    { label: 'Delivery route', get: (c) => c.transmission },
    { label: 'Category', get: (c) => c.body_type },
    { label: 'Offered since', get: (c) => String(c.year) },
    {
      label: 'Trial phase',
      get: (c) => (c.condition === 'new' || c.doors === 4 ? 'Established' : `Phase ${c.doors}`),
    },
    { label: 'Reported success', get: (c) => (c.power_bhp ? `${c.power_bhp}%` : '—'), highlight: 'max' },
    { label: 'Typical sessions', get: (c) => (c.zero_to_sixty ? String(c.zero_to_sixty) : '—'), highlight: 'min' },
    { label: 'Recovery (days)', get: (c) => (c.top_speed ? `${c.top_speed} days` : '—'), highlight: 'max' },
    { label: 'Follow-up (months)', get: (c) => (c.economy_mpg ? `${c.economy_mpg} months` : '—') },
    { label: 'Cell dose', get: (c) => (c.seats ? `${c.seats}M cells` : '—') },
  ];

  // Compute which cell wins for numeric highlight rows.
  const numericValue = (c: Car, label: string): number | null => {
    switch (label) {
      case 'Treatment cost': return c.price;
      case 'Financing /mo': return c.monthly_price;
      case 'Outcome score': return c.rating;
      case 'Reported success': return c.power_bhp;
      case 'Typical sessions': return c.zero_to_sixty;
      case 'Recovery (days)': return c.top_speed;
      default: return null;
    }
  };

  const bestId = (label: string, dir: 'min' | 'max'): number | null => {
    const vals = selected
      .map((c) => ({ id: c.id, v: numericValue(c, label) }))
      .filter((x) => x.v != null) as { id: number; v: number }[];
    if (vals.length < 2) return null;
    return vals.reduce((best, cur) =>
      dir === 'min' ? (cur.v < best.v ? cur : best) : (cur.v > best.v ? cur : best)
    ).id;
  };

  return (
    <div className="container-x py-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-extrabold text-ink-900">Compare therapies</h1>
        <p className="mt-1 text-ink-700/70">
          Add up to {MAX} therapies side by side to see how they stack up on cost, outcomes and protocol.
        </p>
      </div>

      {/* Add car search */}
      {selected.length < MAX && (
        <div className="mt-6 max-w-xl">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add a therapy to compare…"
            className="input"
          />
          {query && (
            <div className="card mt-2 divide-y divide-cream-300 overflow-hidden">
              {results.length === 0 && (
                <p className="p-4 text-sm text-ink-700/60">No therapies found.</p>
              )}
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => add(c)}
                  className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-cream-100"
                >
                  <CarImage accent={c.accent} bodyType={c.body_type} make={c.make} model={c.model} year={c.year} className="h-12 w-20 rounded-lg" />
                  <div>
                    <p className="font-semibold text-ink-900">
                      {c.model}
                    </p>
                    <p className="text-sm text-ink-700/60">
                      {c.trim} · {gbp(c.price)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <span className="icon-tile mx-auto h-16 w-16"><Icon name="scale" className="h-8 w-8" /></span>
          <h3 className="mt-3 font-display text-xl font-bold">No therapies to compare yet</h3>
          <p className="mt-1 text-ink-700/70">Search above to add your first therapy.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="w-40 p-3 text-left align-bottom" />
                {selected.map((c) => (
                  <th key={c.id} className="p-3 align-top">
                    <div className="card overflow-hidden text-left">
                      <div className="relative">
                        <CarImage accent={c.accent} bodyType={c.body_type} className="h-28 w-full" />
                        <button
                          onClick={() => remove(c.id)}
                          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-ink-700 shadow-sm hover:text-clay-600"
                          aria-label="Remove"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-3">
                        <Link
                          to={`/therapies/${c.id}`}
                          className="font-display font-bold text-ink-900 hover:text-clay-600"
                        >
                          {c.model}
                        </Link>
                        <div className="mt-1">
                          <StarRating rating={c.rating} size={12} />
                        </div>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const winner = row.highlight ? bestId(row.label, row.highlight) : null;
                return (
                  <tr key={row.label}>
                    <td className="border-b border-cream-300 p-3 text-sm font-semibold text-ink-700/70">
                      {row.label}
                    </td>
                    {selected.map((c) => (
                      <td
                        key={c.id}
                        className={`border-b border-cream-300 p-3 text-center text-sm font-semibold ${
                          winner === c.id ? 'text-clay-600' : 'text-ink-900'
                        }`}
                      >
                        {row.get(c)}
                        {winner === c.id && <span className="ml-1 text-xs">★</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
