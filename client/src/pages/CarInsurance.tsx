import { useState } from 'react';
import { Link } from 'react-router-dom';

const whyBlocks = [
  { icon: '💷', title: 'Transparent pricing', body: 'Clear, itemised care-package costs up front — no surprises, with flexible financing options where you need them.' },
  { icon: '🤝', title: 'Coordinated care', body: 'One team coordinates your consultations, imaging, and treatment across every department involved.' },
  { icon: '🩺', title: 'Ongoing follow-up', body: 'Structured follow-up and aftercare are built into every package, so your recovery is supported long after treatment.' },
];

const steps = [
  { n: '01', title: 'Assess', body: 'A specialist reviews your condition and history to understand what care is right for you.' },
  { n: '02', title: 'Plan & fund', body: 'We build a personalised care plan with transparent costs and financing options that suit you.' },
  { n: '03', title: 'Treat & follow up', body: 'You receive treatment from the right specialists, with structured follow-up and aftercare throughout.' },
];

const covers = [
  {
    tab: 'Essential',
    badge: 'Entry package',
    badgeClass: 'bg-cream-300 text-ink-800',
    title: 'Essential',
    body: 'The core package for exploring treatment. Covers your initial specialist consultation and assessment, with a clear plan and costs for any next steps.',
    included: ['Initial specialist consultation', 'Condition assessment', 'Personalised care plan'],
    not: ['Follow-up consultations', 'Diagnostic imaging', 'Priority scheduling'],
  },
  {
    tab: 'Standard',
    badge: 'Most chosen',
    badgeClass: 'bg-ink-900 text-white',
    title: 'Standard',
    body: 'Everything in Essential, plus the imaging and follow-up care most treatment plans need — with financing available to spread the cost.',
    included: ['Initial specialist consultation', 'Diagnostic imaging', 'Two follow-up consultations', 'Financing options'],
    not: ['Priority scheduling', 'Extended aftercare programme'],
  },
  {
    tab: 'Premium',
    badge: 'Full support',
    badgeClass: 'bg-clay-500 text-white',
    title: 'Premium',
    body: 'Our most complete package. Coordinated care across departments with priority scheduling and an extended aftercare programme for your full recovery.',
    included: ['Everything in Standard', 'Priority scheduling', 'Extended aftercare programme', 'Dedicated care coordinator'],
    not: ['Unrelated conditions', 'Travel and accommodation'],
  },
];

const tips = [
  { title: 'Start with an assessment', body: 'A specialist assessment is the single biggest lever on getting the right plan — and avoiding paying for care you do not need.' },
  { title: 'Ask about financing early', body: 'Spreading the cost over monthly instalments can make the right package affordable from day one.' },
  { title: 'Bundle related treatments', body: 'Combining consultations, imaging, and follow-up in one package is usually better value than paying for each separately.' },
  { title: 'Keep your records together', body: 'Bringing prior scans and notes to your consultation can reduce repeat imaging and lower your overall cost.' },
  { title: 'Use your follow-ups', body: 'Every included follow-up is part of what you have paid for — use them to get the most from your care and recovery.' },
];

const faqs = [
  { q: 'What is included in a care package?', a: 'Each package bundles consultations, and depending on the tier, imaging, follow-ups, and aftercare — all priced transparently up front.' },
  { q: 'Is choosing a package free?', a: 'Yes, comparing packages and getting an indicative quote is completely free, with no obligation to proceed.' },
  { q: 'Can I spread the cost?', a: 'Yes — financing options are available on our Standard and Premium packages to spread the cost over monthly instalments.' },
  { q: 'How long does it take to get a quote?', a: 'Usually just a few minutes once you share a few details about your condition and preferred care.' },
  { q: 'Can I upgrade my package later?', a: 'Yes — you can move to a higher tier at any point, and we will apply what you have already paid towards it.' },
  { q: 'Can I start treatment straight away?', a: 'Once a specialist confirms suitability at your consultation, treatment can often be scheduled quickly, with priority scheduling on Premium.' },
];

export default function CarInsurance() {
  const [active, setActive] = useState(0);
  const cover = covers[active];

  return (
    <div>
      {/* Why compare */}
      <section className="bg-cream-200 py-14">
        <div className="container-x">
          <h1 className="text-center font-display text-3xl font-extrabold uppercase leading-tight text-ink-900 sm:text-5xl">
            Why choose StemCells <span className="text-clay-500">Protocol</span> care
          </h1>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {whyBlocks.map((b) => (
              <div key={b.title} className="card p-7">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-green-200 text-3xl">{b.icon}</div>
                <h3 className="mt-5 font-display text-xl font-bold text-ink-900">{b.title}</h3>
                <p className="mt-2 text-ink-700/70">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink-900 py-14 text-white">
        <div className="container-x">
          <p className="font-display text-lg font-bold text-clay-400">How it works</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold uppercase sm:text-4xl">
            Your care in three simple steps
          </h2>
          <div className="mt-8 divide-y divide-white/10">
            {steps.map((s) => (
              <div key={s.n} className="py-6">
                <p className="font-display text-lg font-bold text-clay-400">Step {s.n}</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold uppercase">{s.title}</h3>
                <p className="mt-2 text-white/70">{s.body}</p>
              </div>
            ))}
          </div>
          <a href="#quote" className="btn-primary mt-6 w-full justify-center py-4 text-base sm:w-auto sm:px-10">
            Get a care-package quote
          </a>
        </div>
      </section>

      {/* Types of cover */}
      <section className="bg-cream-200 py-14">
        <div className="container-x">
          <p className="font-display font-bold text-ink-700/60">Care packages</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
            Which care package is right for you?
          </h2>
          <p className="mt-3 max-w-2xl text-ink-700/70">
            Three levels of support, defined by what they include. Standard is the most chosen — most treatment
            plans need imaging and follow-up care.
          </p>

          <div className="mt-8 flex gap-6 overflow-x-auto border-b border-ink-900/10 pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {covers.map((c, i) => (
              <button
                key={c.tab}
                onClick={() => setActive(i)}
                className={`relative whitespace-nowrap pb-3 font-display text-lg font-bold transition ${
                  active === i ? 'text-ink-900' : 'text-ink-700/40'
                }`}
              >
                {c.tab}
                {active === i && <span className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-ink-900" />}
              </button>
            ))}
          </div>

          <div className="card mt-6 p-6 sm:p-8">
            <span className={`chip ${cover.badgeClass}`}>{cover.badge}</span>
            <h3 className="mt-4 font-display text-3xl font-extrabold uppercase text-ink-900">{cover.title}</h3>
            <p className="mt-3 max-w-2xl text-ink-700/80">{cover.body}</p>

            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              <div>
                <h4 className="font-display font-bold text-ink-900">What's included</h4>
                <ul className="mt-3 space-y-3">
                  {cover.included.map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-green-400">✓</span>
                      <span className="text-ink-800">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-display font-bold text-ink-900">What's not</h4>
                <ul className="mt-3 space-y-3">
                  {cover.not.map((t) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-red-500">✕</span>
                      <span className="text-ink-800">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="container-x py-14">
        <p className="font-display font-bold text-ink-700/60">Get more from your package</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Making the most of your care & financing
        </h2>
        <p className="mt-3 max-w-2xl text-ink-700/70">
          Five simple ways to get the best value and outcome from your care package. Some are common sense, some
          less obvious — all of them can help.
        </p>
        <div className="mt-8 divide-y divide-cream-300">
          {tips.map((t, i) => (
            <div key={t.title} className="flex gap-5 py-6">
              <span className="font-display text-4xl font-extrabold text-cream-300">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-display text-xl font-bold text-ink-900">{t.title}</h3>
                <p className="mt-1 max-w-xl text-ink-700/70">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ready to see savings */}
      <section id="quote" className="bg-ink-900 py-14 text-white">
        <div className="container-x max-w-2xl text-center">
          <p className="font-display text-lg font-bold text-clay-400">Ready when you are</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold uppercase sm:text-4xl">
            Ready to plan your care?
          </h2>
          <p className="mt-3 text-white/70">
            Tell us a little about your condition and get an indicative care-package quote in minutes.
          </p>
          <div className="mx-auto mt-7 max-w-md rounded-3xl bg-gradient-to-b from-clay-100 to-cream-200 p-4">
            <input
              placeholder="AREA OF CONCERN"
              className="w-full rounded-xl bg-white px-6 py-4 text-center text-lg font-bold tracking-widest text-ink-900 placeholder:text-ink-700/40 focus:outline-none"
            />
            <Link
              to="/consultation"
              className="mt-3 flex w-full items-center justify-center rounded-xl bg-ink-900 py-4 font-display text-lg font-bold text-clay-400"
            >
              Get a care-package quote
            </Link>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="container-x py-14">
        <h2 className="text-center font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Care & financing FAQs
        </h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {faqs.map((f) => (
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
        <p className="mx-auto mt-8 max-w-3xl text-sm italic text-ink-700/60">
          Illustrative demo — not medical advice. Costs and outcomes are sample data. Care-package prices shown
          are examples only; your actual plan and cost depend on your individual condition and are confirmed by a
          specialist at consultation.
        </p>
      </section>
    </div>
  );
}
