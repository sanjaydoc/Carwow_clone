import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import type { SellResult } from '../types';
import { gbp, num } from '../utils/format';
import StarRating from '../components/StarRating';
import { useAuth } from '../context/AuthContext';

const conditions = ['excellent', 'good', 'fair', 'poor'];

export default function Sell() {
  const { user } = useAuth();
  const location = useLocation();
  const initialReg = (location.state as { reg?: string })?.reg || '';
  const [form, setForm] = useState({
    reg: initialReg,
    make: '',
    model: '',
    year: '2020',
    mileage: '',
    condition: 'good',
    name: user?.name || '',
    email: user?.email || '',
  });
  const [result, setResult] = useState<SellResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.sell({
        reg: form.reg,
        make: form.make,
        model: form.model,
        year: Number(form.year),
        mileage: Number(form.mileage),
        condition: form.condition,
        name: form.name,
        email: form.email,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const best = result.offers[0];
    return (
      <div className="container-x py-10">
        <div className="mx-auto max-w-3xl">
          <div className="card overflow-hidden">
            <div className="bg-ink-900 p-8 text-white">
              <p className="text-white/60">
                {result.submission.year} {result.submission.make} {result.submission.model} ·{' '}
                {num(result.submission.mileage)} miles
              </p>
              <p className="mt-2 text-sm uppercase tracking-wide text-clay-300">Estimated value</p>
              <p className="font-display text-5xl font-extrabold">
                {gbp(result.submission.estimated_value)}
              </p>
              {best && (
                <p className="mt-2 text-white/80">
                  Best dealer offer:{' '}
                  <span className="font-bold text-clay-300">{gbp(best.offer_amount)}</span>
                </p>
              )}
            </div>

            <div className="p-6">
              <h2 className="font-display text-xl font-bold text-ink-900">
                {result.offers.length} dealers want to buy your car
              </h2>
              <p className="mt-1 text-sm text-ink-700/70">
                These offers are guaranteed and free to accept. Sorted by best price.
              </p>

              <div className="mt-5 space-y-3">
                {result.offers.map((offer, i) => (
                  <div
                    key={offer.id}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      i === 0 ? 'border-clay-300 bg-clay-50' : 'border-cream-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-ink-900">{offer.dealer_name}</p>
                        {i === 0 && (
                          <span className="chip bg-clay-500 text-white">Best offer</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-ink-700/70">
                        <StarRating rating={offer.dealer_rating} size={12} />
                        <span>· {offer.distance_mi} miles away</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-display text-2xl font-extrabold text-ink-900">
                        {gbp(offer.offer_amount)}
                      </p>
                      <button className="btn-primary px-5 py-2.5 text-sm">Accept</button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setResult(null)}
                className="btn-outline mt-6 w-full py-3"
              >
                Value another car
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="chip bg-clay-100 text-clay-700">💷 Free car valuation</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900">
            Sell your car for the best price
          </h1>
          <p className="mt-4 text-lg text-ink-700/80">
            Tell us about your car and our network of trusted dealers will compete to buy it. Get
            your offers in minutes — with no obligation to sell.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Get up to £1,000 more than part-exchange',
              'Dealers come to you — free collection',
              'Secure, fast payment once you accept',
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-ink-800">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-clay-100 text-clay-600">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-ink-900">Your car details</h2>

          <div>
            <label className="label">Registration (optional)</label>
            <input
              value={form.reg}
              onChange={(e) => set('reg', e.target.value.toUpperCase())}
              placeholder="AB12 CDE"
              className="input tracking-widest"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Make</label>
              <input
                required
                value={form.make}
                onChange={(e) => set('make', e.target.value)}
                placeholder="e.g. Volkswagen"
                className="input"
              />
            </div>
            <div>
              <label className="label">Model</label>
              <input
                required
                value={form.model}
                onChange={(e) => set('model', e.target.value)}
                placeholder="e.g. Golf"
                className="input"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Year</label>
              <select value={form.year} onChange={(e) => set('year', e.target.value)} className="input">
                {Array.from({ length: 26 }, (_, i) => 2026 - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mileage</label>
              <input
                required
                type="number"
                min={0}
                value={form.mileage}
                onChange={(e) => set('mileage', e.target.value)}
                placeholder="e.g. 32000"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Condition</label>
            <div className="grid grid-cols-4 gap-2">
              {conditions.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => set('condition', c)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-semibold capitalize transition ${
                    form.condition === c
                      ? 'border-clay-500 bg-clay-50 text-clay-700'
                      : 'border-cream-300 text-ink-700 hover:border-clay-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Your name</label>
              <input
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Jane Doe"
                className="input"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane@example.com"
                className="input"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
            {loading ? 'Getting your offers…' : 'Get my free valuation'}
          </button>
          <p className="text-center text-xs text-ink-700/50">
            No obligation. We'll never sell your details.
          </p>
        </form>
      </div>
    </div>
  );
}
