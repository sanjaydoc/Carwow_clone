import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/client';
import type { SellResult } from '../types';
import { gbp } from '../utils/format';
import StarRating from '../components/StarRating';
import { useAuth } from '../context/AuthContext';
import { saveRow } from '../api/supabase';

const departments = [
  'Dental',
  'Orthopedics',
  'Cardiology',
  'Gastroenterology',
  'Neurology',
  'Pulmonology',
  'Cosmetic',
  'Age Rejuvenation',
];

const urgencyOptions = [
  { value: 'excellent', label: 'Just exploring' },
  { value: 'good', label: 'Planning treatment' },
  { value: 'fair', label: 'Ongoing condition' },
  { value: 'poor', label: 'Urgent' },
];

export default function Sell() {
  const { user } = useAuth();
  const location = useLocation();
  const initialReg = (location.state as { reg?: string })?.reg || '';
  const [form, setForm] = useState({
    reg: initialReg,
    make: '',
    model: '',
    condition: 'good',
    name: user?.name || '',
    email: user?.email || '',
  });
  const [result, setResult] = useState<SellResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('Please tick the consent box so we can contact you about your enquiry.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Save the enquiry to the clinic database (insert-only, RLS-protected).
      await saveRow('consultations', {
        name: form.name,
        email: form.email,
        department: form.make,
        condition: form.model || form.reg,
        notes: form.reg,
        consent: true,
      });
      const res = await api.sell({
        reg: form.reg,
        make: form.make,
        model: form.model,
        year: new Date().getFullYear(),
        mileage: 0,
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
                {result.submission.make} · {result.submission.model}
              </p>
              <p className="mt-2 text-sm uppercase tracking-wide text-clay-300">
                Indicative starting cost (from)
              </p>
              <p className="font-display text-5xl font-extrabold">
                {gbp(result.submission.estimated_value)}
              </p>
              {best && (
                <p className="mt-2 text-white/80">
                  Best matched option:{' '}
                  <span className="font-bold text-clay-300">from {gbp(best.offer_amount)}</span>
                </p>
              )}
            </div>

            <div className="p-6">
              <h2 className="font-display text-xl font-bold text-ink-900">
                Indicative options from {result.offers.length} matched specialists
              </h2>
              <p className="mt-1 text-sm text-ink-700/70">
                Indicative only — a specialist will confirm suitability and cost at consultation.
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
                          <span className="chip bg-clay-500 text-white">Best match</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-ink-700/70">
                        <StarRating rating={offer.dealer_rating} size={12} />
                        <span>· {offer.distance_mi} miles away</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-display text-2xl font-extrabold text-ink-900">
                        from {gbp(offer.offer_amount)}
                      </p>
                      <button className="btn-primary px-5 py-2.5 text-sm">Enquire</button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setResult(null)}
                className="btn-outline mt-6 w-full py-3"
              >
                Start another enquiry
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
          <span className="chip bg-clay-100 text-clay-700">🩺 Free, no-obligation consultation</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900">
            Book a consultation
          </h1>
          <p className="mt-4 text-lg text-ink-700/80">
            Tell us about your condition and our specialist network will share indicative options —
            in minutes, with no obligation.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Matched to the right specialists',
              'Indicative costs up front',
              'No obligation to proceed',
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
          <h2 className="font-display text-xl font-bold text-ink-900">Your details</h2>

          <div>
            <label className="label">Reference (optional)</label>
            <input
              value={form.reg}
              onChange={(e) => set('reg', e.target.value.toUpperCase())}
              placeholder="Any reference number"
              className="input tracking-widest"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Department</label>
              <select
                required
                value={form.make}
                onChange={(e) => set('make', e.target.value)}
                className="input"
              >
                <option value="" disabled>
                  Select a department
                </option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Area of concern / condition</label>
              <input
                required
                value={form.model}
                onChange={(e) => set('model', e.target.value)}
                placeholder="e.g. Knee osteoarthritis"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Urgency</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {urgencyOptions.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => set('condition', c.value)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                    form.condition === c.value
                      ? 'border-clay-500 bg-clay-50 text-clay-700'
                      : 'border-cream-300 text-ink-700 hover:border-clay-300'
                  }`}
                >
                  {c.label}
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

          <label className="flex items-start gap-2.5 text-sm text-ink-700/80">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-clay-500"
            />
            <span>
              I consent to StemCells Protocol storing the details I've entered and contacting me about
              my enquiry. I understand this is not a diagnosis.
            </span>
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
            {loading ? 'Finding specialists…' : 'Book a consultation'}
          </button>
          <p className="text-center text-xs text-ink-700/50">
            No obligation. We'll never sell your details.
          </p>
        </form>
      </div>

      {/* ---------- STEMCELLS PROTOCOL VS GOING DIRECT ---------- */}
      <section className="mt-16 rounded-3xl bg-clay-500 px-4 py-12 text-white sm:px-8">
        <h2 className="text-center font-display text-3xl font-extrabold uppercase sm:text-4xl">
          StemCells Protocol vs. going direct
        </h2>
        <div className="mx-auto mt-8 max-w-3xl overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 overflow-hidden rounded-2xl bg-cream-100 text-ink-900">
            <thead>
              <tr>
                <th className="p-4" />
                <th className="bg-white p-4 text-center font-display text-lg font-extrabold">StemCells Protocol</th>
                <th className="p-4 text-center font-display font-bold">Single clinic</th>
                <th className="p-4 text-center font-display font-bold">DIY search</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Compare multiple specialists', true, false, false],
                ['Indicative costs up front', true, false, false],
                ['One place for every department', true, false, false],
                ['Independent guidance', true, false, false],
                ['No obligation', true, true, false],
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
          Make the most of your consultation
        </h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {[
            { icon: '🩺', title: 'Come prepared', body: 'Note your symptoms, timeline, and any prior scans so the specialist can advise you quickly.' },
            { icon: '⏱️', title: 'Save time', body: 'Get matched to the right specialists and indicative options in minutes, with no obligation.' },
            { icon: '📋', title: 'Ask the right questions', body: 'Our patient guides help you understand your therapy options before you decide.' },
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
          Consultation FAQs
        </h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {[
            { q: 'How does a consultation work?', a: 'Tell us about your condition and our specialist network shares indicative options. Book a consultation and a specialist confirms suitability, plan, and cost.' },
            { q: 'Is it free?', a: 'Sharing your details and receiving indicative options is completely free, with no obligation.' },
            { q: 'Will you share my data?', a: 'We only share your details with matched specialists to arrange your consultation. We will never sell your data.' },
            { q: 'Do I have to proceed?', a: 'No — the options we share are indicative and there is no obligation to book or proceed with any treatment.' },
            { q: 'Which conditions do you cover?', a: 'We cover eight departments including Dental, Orthopedics, Cardiology, Neurology, Cosmetic, and Age Rejuvenation.' },
            { q: 'Are these therapies approved?', a: 'Availability varies by therapy — some are established and others are under research. A specialist will explain what applies to you.' },
            { q: 'How soon can I be seen?', a: 'Many patients are matched to specialists within minutes and can book a consultation within days.' },
            { q: 'How do I contact you?', a: 'Reach our patient support team through the support centre, Monday to Saturday.' },
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

      {/* ---------- PATIENT GUIDES ---------- */}
      <section className="pb-16">
        <h2 className="text-center font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Patient guides
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-ink-700/70">
          Need a hand? Our short guides help you prepare for a consultation and understand your options.
        </p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
          {[
            'How to prepare for your consultation',
            'Understanding stem-cell therapies',
            'Cell sources: autologous vs allogeneic',
            'What to expect from your treatment',
            'Questions to ask your specialist',
            'Financing your care package',
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
