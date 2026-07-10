import { useState } from 'react';

const whyBlocks = [
  { icon: '💷', title: 'Save money', body: "Drivers could save up to £518* a year by comparing quotes — money back in your pocket, not your insurer's." },
  { icon: '📝', title: 'A few quick questions', body: 'Enter your reg, answer a few quick questions, and get tailored quotes in minutes.' },
  { icon: '🛡️', title: '140+ trusted insurers', body: 'Compare quotes from major names and specialist providers all in one place — no calling around.' },
];

const steps = [
  { n: '01', title: 'Enter your reg', body: 'Pop in your registration and a few quick details about you and your driving.' },
  { n: '02', title: 'Compare quotes', body: 'We search 140+ UK insurers and show you tailored prices.' },
  { n: '03', title: 'Buy and drive', body: "Choose the cover that suits you, buy directly with the insurer, and you're sorted." },
];

const covers = [
  {
    tab: 'Third Party Only',
    badge: 'Minimum cover',
    badgeClass: 'bg-cream-300 text-ink-800',
    title: 'Third Party Only',
    body: 'The minimum level of cover required by UK law. Covers damage you cause to other people, their vehicles, or their property — but not your own car.',
    included: ['Damage to other vehicles', 'Damage to other property', 'Injury to other people'],
    not: ['Damage to your own car', 'Theft', 'Fire damage'],
  },
  {
    tab: 'Third Party, Fire & Theft',
    badge: 'Mid-tier',
    badgeClass: 'bg-ink-900 text-white',
    title: 'Third Party, Fire & Theft',
    body: 'Includes everything in third party only, plus cover if your car is stolen or damaged by fire.',
    included: ['Damage to other vehicles', 'Damage to other property', 'Theft of your car', 'Fire damage to your car'],
    not: ['Accidental damage', 'Vandalism (sometimes)'],
  },
  {
    tab: 'Comprehensive',
    badge: 'Highest cover',
    badgeClass: 'bg-clay-500 text-white',
    title: 'Comprehensive',
    body: 'The highest level of cover. Protects you, other drivers, and your own vehicle — including accidental damage. Often surprisingly affordable.',
    included: ['Everything in TPFT', 'Accidental damage', 'Windscreen cover (often)'],
    not: ['Mechanical breakdown', 'Wear and tear'],
  },
];

const tips = [
  { title: 'Shop around at renewal', body: 'Loyalty rarely pays — comparing quotes is the single biggest lever on price.' },
  { title: 'Pay annually if you can', body: 'Monthly instalments usually carry interest, making your cover more expensive overall.' },
  { title: 'Increase your voluntary excess', body: 'A higher excess typically lowers your premium, but only commit to what you can comfortably pay.' },
  { title: 'Build up your no-claims discount', body: 'Every claim-free year can knock more off your premium.' },
  { title: 'Improve security', body: 'Approved alarms, immobilisers, and parking off-road can all bring premiums down.' },
];

const faqs = [
  { q: 'How much can I save by comparing car insurance?', a: 'Many drivers save hundreds a year — 51% of consumers could save £518.14* by comparing quotes.' },
  { q: 'Is the comparison service really free?', a: 'Yes, comparing quotes is completely free to use.' },
  { q: 'Will comparing affect my credit score?', a: 'No — getting quotes uses a soft search that does not affect your credit score.' },
  { q: 'How long does it take to get quotes?', a: 'Usually just a few minutes once you enter your reg and a few details.' },
  { q: 'Which insurers will I see?', a: 'You’ll see quotes from 140+ UK insurers, from major names to specialists.' },
  { q: 'Can I buy a policy on the same day?', a: 'Yes — you can choose a quote and buy directly with the insurer straight away.' },
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
            Why compare car insurance through carwow
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
            Get insurance in three simple steps
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
            Get quotes
          </a>
        </div>
      </section>

      {/* Types of cover */}
      <section className="bg-cream-200 py-14">
        <div className="container-x">
          <p className="font-display font-bold text-ink-700/60">Types of cover</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
            What kind of car insurance do you need?
          </h2>
          <p className="mt-3 max-w-2xl text-ink-700/70">
            Three levels of cover, defined by what they protect. Comprehensive is the most common — and often
            the cheapest, surprisingly enough.
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
        <p className="font-display font-bold text-ink-700/60">Save more</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Tips for a cheaper quote
        </h2>
        <p className="mt-3 max-w-2xl text-ink-700/70">
          Five quick levers we’d pull if we were you. Some are common sense, some less obvious — all of them
          could work.
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
            Ready to see what you could save?
          </h2>
          <p className="mt-3 text-white/70">
            Enter your reg and compare quotes from 140+ UK car insurance providers in minutes.
          </p>
          <div className="mx-auto mt-7 max-w-md rounded-3xl bg-gradient-to-b from-clay-100 to-cream-200 p-4">
            <input
              placeholder="ENTER REG"
              className="w-full rounded-xl bg-white px-6 py-4 text-center text-lg font-bold tracking-widest text-ink-900 placeholder:text-ink-700/40 focus:outline-none"
            />
            <button className="mt-3 w-full rounded-xl bg-ink-900 py-4 font-display text-lg font-bold text-clay-400">
              Get quotes
            </button>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="container-x py-14">
        <h2 className="text-center font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Car insurance FAQs
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
        <p className="mx-auto mt-8 max-w-3xl text-sm text-ink-700/60">
          *51% of consumers could save £518.14 on their car insurance. The saving was calculated by comparing
          the cheapest price found with the average of the next four cheapest prices quoted by insurance
          providers. Based on representative cost savings from June 2025 data. Savings depend on your individual
          circumstances.
        </p>
      </section>
    </div>
  );
}
