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

      {/* ---------- CARWOW VS PAID SITES ---------- */}
      <section className="mt-16 rounded-3xl bg-clay-500 px-4 py-12 text-white sm:px-8">
        <h2 className="text-center font-display text-3xl font-extrabold uppercase sm:text-4xl">
          Carwow vs. paid sites
        </h2>
        <div className="mx-auto mt-8 max-w-3xl overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 overflow-hidden rounded-2xl bg-cream-100 text-ink-900">
            <thead>
              <tr>
                <th className="p-4" />
                <th className="bg-white p-4 text-center font-display text-lg font-extrabold">carwow</th>
                <th className="p-4 text-center font-display font-bold">Motorway</th>
                <th className="p-4 text-center font-display font-bold">WeBuyAnyCar</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Completely free to sell', true, false, false],
                ['Sell & buy from one platform', true, false, false],
                ['Multiple offers for your car', true, true, false],
                ['Free home collection', true, true, false],
                ['Free same-day payment', true, true, false],
              ].map((r, i) => (
                <tr key={i as number}>
                  <td className="border-t border-cream-300 p-4 text-sm font-semibold">{r[0] as string}</td>
                  {[r[1], r[2], r[3]].map((v, j) => (
                    <td key={j} className={`border-t border-cream-300 p-4 text-center ${j === 0 ? 'bg-white' : ''}`}>
                      {v ? <span className="text-xl text-green-500">✓</span> : <span className="text-xl text-red-500">✕</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- MAKE YOUR SALE WORTH IT ---------- */}
      <section className="py-16 text-center">
        <h2 className="font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Make your sale worth it
        </h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {[
            { icon: '💷', title: 'Worth the money', body: 'Sell your car for an average of £1,000 more than part-exchange, completely free.' },
            { icon: '⏱️', title: 'Worth your time', body: 'Same-day payment and free collection at a time which suits you.' },
            { icon: '📋', title: 'Worth great support', body: 'Your own car-selling checklist and free specialist guides at your fingertips.' },
          ].map((b) => (
            <div key={b.title}>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-clay-100 text-3xl">{b.icon}</div>
              <h3 className="mt-4 font-display text-xl font-bold text-ink-900">{b.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-ink-700/70">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- SELL MY CAR FAQS ---------- */}
      <section className="pb-12">
        <h2 className="text-center font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Sell my car FAQs
        </h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {[
            { q: 'How do I sell my car with carwow?', a: 'Enter your registration or car details for a free valuation, then trusted dealers make you offers. Accept your favourite and arrange free collection.' },
            { q: 'Is it free?', a: 'Yes — selling your car with carwow is completely free, with no hidden fees.' },
            { q: 'How long does it take to sell?', a: 'Many sellers receive offers within minutes and complete the sale within a day or two.' },
            { q: 'What information do I need to sell my car with you?', a: 'Just your registration, mileage and a few details about the car’s condition.' },
            { q: 'What types of cars do you buy?', a: 'Dealers buy almost anything — petrol, diesel, hybrid and electric, new or used.' },
            { q: 'Can I sell my car with outstanding finance?', a: 'Yes. Any outstanding finance is settled from the sale price when you complete.' },
            { q: 'Can I sell a car with a private reg plate?', a: 'Absolutely — you can retain your private plate before the sale completes.' },
            { q: 'How can I contact carwow for help?', a: 'Visit our support centre or reach the Help Centre Monday–Saturday.' },
          ].map((f) => (
            <details key={f.q} className="group rounded-2xl bg-cream-200 px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-clay-600 transition group-open:rotate-180">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </summary>
              <p className="pb-4 text-ink-700/80">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 text-center">
          <h3 className="font-display text-2xl font-extrabold text-ink-900">Got a less frequent question?</h3>
          <p className="mt-1 text-ink-700/70">We can help</p>
          <a href="#" onClick={(e) => e.preventDefault()} className="btn-primary mt-5 px-8 py-3.5">
            Visit support centre
          </a>
        </div>
      </section>

      {/* ---------- CAR SELLING GUIDES ---------- */}
      <section className="pb-16">
        <h2 className="text-center font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Car selling guides
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-ink-700/70">
          Need a hand? Our short guides are full of useful tips to help you sell your car.
        </p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
          {[
            'How to sell a car for parts',
            'How to sell a car quickly',
            "How to sell a deceased person's car",
            'How to sell a modified car',
            'Best ways to sell a car',
            'Cars that hold their value best',
          ].map((g) => (
            <a
              key={g}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="rounded-2xl bg-cream-200 px-5 py-4 text-center font-display font-bold text-ink-900 transition hover:bg-clay-100 hover:text-clay-700"
            >
              {g}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
