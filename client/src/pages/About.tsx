import { Link } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';

const pillars: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'dish',
    title: 'Regenerative therapies today',
    body: 'MSC and IV-exosome treatments across departments — the near-term, revenue-generating clinic.',
  },
  {
    icon: 'dna',
    title: 'Age-reversal platform',
    body: 'Persona Reversal — our partial-reprogramming (OSK) programme, delivered via IV exosomes. The long-term pipeline.',
  },
  {
    icon: 'ai',
    title: 'AI-first, personalised',
    body: 'A patient uploads a digital version of their DNA; our AI care assistant orchestrates therapy design tailored to their own genome.',
  },
];

const values: { title: string; body: string }[] = [
  { title: 'Personalised, not one-size-fits-all', body: 'Every protocol is matched to the individual — their condition, their genome, their goals.' },
  { title: 'Evidence & honesty', body: 'Established therapies are labelled separately from investigational ones, with clear disclaimers throughout.' },
  { title: 'Safety by design', body: 'Controlled, transient interventions with defined stopping points — rejuvenate, then stop.' },
];

export default function About() {
  return (
    <div className="container-x py-10">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip bg-clay-100 text-clay-700"><Icon name="hospital" className="h-3.5 w-3.5" /> About us</span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
          Regenerate, restore, renew — tailored to you
        </h1>
        <p className="mt-4 text-lg text-ink-700/80">
          StemCells Protocol is a regenerative-medicine venture built around one idea: that the future of
          healthcare is personalised. We pair a stem-cell therapy clinic with an AI-driven platform advancing
          partial epigenetic reprogramming — the science of resetting biological age at the cellular level.
        </p>
      </div>

      {/* What we do */}
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="card p-6">
            <div className="icon-tile h-14 w-14"><Icon name={p.icon} className="h-7 w-7" /></div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{p.title}</h3>
            <p className="mt-2 text-sm text-ink-700/70">{p.body}</p>
          </div>
        ))}
      </div>

      {/* Phased mission */}
      <div className="mx-auto mt-14 max-w-4xl">
        <div className="card overflow-hidden">
          <div className="bg-ink-900 p-8 text-white">
            <span className="chip bg-clay-500 text-white">Our approach</span>
            <h2 className="mt-3 font-display text-2xl font-extrabold">A phased model</h2>
            <p className="mt-2 max-w-2xl text-white/70">
              We enter through a real clinic delivering established regenerative therapies, then compound that
              trust and cashflow into an age-reversal pipeline with a defined regulatory path.
            </p>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            <div className="p-6 sm:p-8">
              <span className="chip bg-clay-100 text-clay-700">Phase 1 · Clinic</span>
              <p className="mt-3 text-sm text-ink-700/75">
                MSC &amp; IV-exosome therapies, consultations and diagnostics — near-term care and revenue that
                builds our brand, clinical data and patient community.
              </p>
            </div>
            <div className="border-t border-cream-200 p-6 sm:border-l sm:border-t-0 sm:p-8">
              <span className="chip bg-clay-100 text-clay-700">Phase 2 · Platform</span>
              <p className="mt-3 text-sm text-ink-700/75">
                Our Persona Reversal programme — OSK partial-reprogramming delivered via IV exosomes —
                advanced toward first-in-human on a contained lead indication.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="mx-auto mt-14 max-w-4xl">
        <h2 className="text-center font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">What we stand for</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="card p-6">
              <h3 className="font-display text-base font-bold text-ink-900">{v.title}</h3>
              <p className="mt-2 text-sm text-ink-700/70">{v.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-14 max-w-3xl text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/consultation" className="btn-primary px-6 py-3">Book a consultation</Link>
          <Link to="/investors" className="btn-outline px-6 py-3">For investors</Link>
        </div>
        <p className="mt-6 text-xs text-ink-700/50">
          StemCells Protocol is a demo project. Therapies, figures and outcomes shown across the site are
          illustrative sample data — not medical advice, and not an offer of treatment.
        </p>
      </div>
    </div>
  );
}
