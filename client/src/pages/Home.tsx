import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarCard from '../components/CarCard';
import CarImage from '../components/CarImage';
import CarTypeIcon from '../components/CarTypeIcon';
import BrandLogo from '../components/BrandLogo';
import Spinner from '../components/Spinner';
import { gbp, statusLabel, isResearch } from '../utils/format';

const categories = [
  { label: 'MSC', icon: 'sparkle', carType: 'MSC', to: '/browse?body_type=MSC' },
  { label: 'iPSC', icon: 'sparkle', carType: 'iPSC', to: '/browse?body_type=iPSC' },
  { label: 'Exosome', icon: 'sparkle', carType: 'Exosome', to: '/browse?body_type=Exosome' },
  { label: 'Orthopedics', icon: 'bolt', to: '/browse?make=Orthopedics' },
  { label: 'Cardiology', icon: 'leaf', to: '/browse?make=Cardiology' },
  { label: 'Neurology', icon: 'sparkle', to: '/browse?make=Neurology' },
];

function ChipIcon({ name }: { name: string }) {
  const p = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
  };
  if (name === 'bolt') return <svg {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>;
  if (name === 'leaf')
    return (
      <svg {...p}>
        <path d="M4 20c0-8 6-14 16-14 0 10-6 14-14 14z" />
        <path d="M5 19c3-5 7-7 11-8" />
      </svg>
    );
  if (name === 'sparkle') return <svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>;
  return (
    <svg {...p}>
      <path d="M5 13l1.4-3.6A2 2 0 0 1 8.3 8h7.4a2 2 0 0 1 1.9 1.4L19 13" />
      <path d="M4 13h16v3H4z" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </svg>
  );
}

const budgets = [
  { label: 'Under £5k', to: '/browse?max_price=5000&sort=price_desc', accent: '#4285F4', make: 'Orthopedics', model: 'PRP Knee', year: 2024 },
  { label: 'Under £10k', to: '/browse?max_price=10000&sort=price_desc', accent: '#0ea5e9', make: 'Dental', model: 'Dental Pulp MSC', year: 2024 },
  { label: 'Under £20k', to: '/browse?max_price=20000&sort=price_desc', accent: '#0891b2', make: 'Cardiology', model: 'Cardiac MSC', year: 2024 },
  { label: 'Under £40k', to: '/browse?max_price=40000&sort=price_desc', accent: '#c0392b', make: 'Neurology', model: 'Intrathecal MSC', year: 2024 },
];

const carTypes = [
  { label: 'MSC', body: 'MSC', make: 'Orthopedics', model: 'Mesenchymal' },
  { label: 'HSC', body: 'HSC', make: 'Cardiology', model: 'Haematopoietic' },
  { label: 'iPSC', body: 'iPSC', make: 'Neurology', model: 'Induced pluripotent' },
  { label: 'Exosome', body: 'Exosome', make: 'Age Rejuvenation', model: 'Exosome' },
  { label: 'Immune cell', body: 'Immune cell', make: 'Pulmonology', model: 'Immune cell' },
  { label: 'PRP', body: 'PRP', make: 'Cosmetic', model: 'Platelet-rich plasma' },
];

const BRANDS = [
  'Age Rejuvenation', 'Dental', 'Orthopedics', 'Cardiology',
  'Gastroenterology', 'Neurology', 'Pulmonology', 'Cosmetic',
];

const usedModels = [
  'Knee Osteoarthritis MSC', 'MS Stem-Cell Transplant', 'Facial Fat Grafting + SVF',
  "Crohn's Fistula MSC", 'Cardiac Ischaemia MSC', 'Spinal Cord Injury MSC',
  'Hair Restoration Exosome', 'Rotator Cuff PRP', 'Type 1 Diabetes Islet iPSC',
  'COPD Lung MSC', 'Autism Cord-Blood Infusion', 'Anti-Ageing NK Cell',
  'Hip Osteoarthritis MSC', 'Parkinson’s iPSC Dopamine', 'Dental Pulp Regeneration',
  'Liver Cirrhosis MSC', 'Stroke Recovery MSC', 'Skin Rejuvenation Exosome',
  'Leukaemia HSC Transplant', 'Tendon Repair PRP',
];

const news = [
  'I have arthritis — could stem-cell therapy help me?',
  'The best regenerative therapies for joint pain, explained',
  'Living with MS: one patient’s stem-cell treatment journey',
  'How to know if you’re a candidate for cell therapy',
];

const videos = [
  'What are mesenchymal stem cells?',
  'Is stem-cell therapy right for arthritis?',
  'Understanding clinical-trial phases',
];

const evTools = [
  { label: 'Browse all regenerative therapies', to: '/browse' },
  { label: 'Explore active clinical trials', to: '/research' },
  { label: 'Compare therapies side by side', to: '/compare' },
  { label: 'How stem-cell treatment works', to: '/browse' },
];

const reviews = [
  { title: 'Back on my feet in weeks', body: 'After my knee MSC injection the pain eased and I could walk properly again. The team explained every step clearly.', author: 'C. T.', when: '38 minutes ago' },
  { title: 'Clear, honest guidance', body: 'They were upfront that my therapy was investigational and walked me through the evidence. No pressure at all.', author: 'Priya S.', when: '2 hours ago' },
  { title: 'Genuinely caring specialists', body: 'From consultation to follow-up everything was thorough. I finally felt listened to about my condition.', author: 'James W.', when: '5 hours ago' },
  { title: 'Would recommend to anyone', body: 'The consultation was free and I had a personalised protocol within days. The aftercare has been excellent.', author: 'Aisha R.', when: 'Yesterday' },
  { title: 'So easy to compare options', body: 'Lining up three therapies side by side made a daunting decision feel manageable. Brilliant service.', author: 'Mark D.', when: '2 days ago' },
];

const faqs = [
  { q: 'What is stem-cell therapy?', a: 'Stem-cell and regenerative therapies use living cells — such as mesenchymal stem cells, exosomes or platelet-rich plasma — to help repair or modulate damaged tissue. This site is an illustrative demo and not medical advice.' },
  { q: 'Are these therapies approved or experimental?', a: 'Some are established and offered routinely; many remain investigational and are only available within clinical research. Anything under research is clearly labelled throughout this demo.' },
  { q: 'How do I know if I’m a candidate?', a: 'Candidacy depends on your condition, health history and the specific protocol. Book a free, no-obligation consultation and a specialist team will assess your suitability.' },
  { q: 'What does treatment cost?', a: 'Costs vary by department, cell source and delivery route. Indicative prices and monthly financing are shown alongside each therapy; all figures here are sample data.' },
  { q: 'Is it safe?', a: 'Safety depends on the therapy, its evidence base and how it is delivered. Established treatments follow strict clinical governance; investigational ones carry additional uncertainty, which we discuss openly.' },
  { q: 'Can I join a clinical trial?', a: 'Yes — many investigational therapies recruit through our research programme. Visit the clinical-trials section to see what is currently open.' },
];

const steps = [
  { title: 'Assess & match', body: 'Share your condition and history so our specialists can match you to suitable therapies.', icon: '🔬' },
  { title: 'Personalised protocol', body: 'Receive a tailored treatment plan with clear costs, evidence and expected outcomes.', icon: '🧬' },
  { title: 'Treatment & follow-up', body: 'Undergo your therapy and stay supported with structured aftercare and monitoring.', icon: '🩺' },
];

type Tab = 'find' | 'sell' | 'reviews';

export default function Home() {
  const [featured, setFeatured] = useState<Car[]>([]);
  const [trending, setTrending] = useState<Car[]>([]);
  const [poster, setPoster] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('find');
  const [search, setSearch] = useState('');
  const [reg, setReg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCars({ sort: 'rating_desc', limit: 8 }).then(({ cars }) => setFeatured(cars)).finally(() => setLoading(false));
    api.getCars({ sort: 'rating_desc', limit: 6 }).then(({ cars }) => setTrending(cars));
    // Feature "Exosome IV Longevity" (Age Rejuvenation) in the poster.
    api.getCars({ search: 'Exosome IV Longevity', limit: 1 }).then(({ cars }) => setPoster(cars[0] ?? null));
  }, []);

  const onFind = (e: FormEvent) => {
    e.preventDefault();
    const q = encodeURIComponent(search.trim());
    // The "Read outcomes" tab surfaces our top-rated therapies.
    navigate(tab === 'reviews' ? `/browse?search=${q}&sort=rating_desc` : `/browse?search=${q}`);
  };
  const onSell = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/browse?search=${encodeURIComponent(reg.trim())}`);
  };

  const posterCar = poster ?? featured.find((c) => c.body_type === 'MSC') ?? featured[0];

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-clay-50 to-cream-200">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-clay-200/50 blur-3xl" />
        <div className="container-x relative py-10 sm:py-14">
          <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-ink-900 sm:text-6xl">
            Regenerate. Restore.
            <br />
            <span className="text-clay-500">Renew.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-700/70">
            Advanced stem-cell &amp; regenerative therapies from specialist clinical teams — matched to your condition.
          </p>

          {/* Tabbed search card */}
          <div className="mt-7 max-w-2xl overflow-hidden rounded-3xl bg-ink-900 p-5 shadow-card sm:p-7">
            <div className="flex gap-5 border-b border-white/10 sm:gap-8">
              {[
                { id: 'find' as Tab, label: 'Find a therapy' },
                { id: 'sell' as Tab, label: 'Book a consultation' },
                { id: 'reviews' as Tab, label: 'Read outcomes' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative pb-3 text-base font-bold transition sm:text-lg ${
                    tab === t.id ? 'text-white' : 'text-white/50'
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-clay-500" />
                  )}
                </button>
              ))}
            </div>

            {tab !== 'sell' ? (
              <>
                <form onSubmit={onFind} className="mt-5 flex items-center gap-2 rounded-full bg-white p-1.5">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tab === 'reviews' ? 'Search outcomes by therapy' : 'Search by condition or therapy'}
                    className="w-full bg-transparent px-4 py-3 text-ink-900 placeholder:text-ink-700/40 focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Search"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-clay-500 text-white transition hover:bg-clay-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4-4" strokeLinecap="round" />
                    </svg>
                  </button>
                </form>
                <p className="mt-3 text-sm text-white/60">
                  or let us help you{' '}
                  <Link to="/browse" className="font-bold text-white underline underline-offset-4">
                    Find a therapy
                  </Link>
                </p>
              </>
            ) : (
              <form onSubmit={onSell} className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-white/70">
                  Your condition or symptoms
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={reg}
                    onChange={(e) => setReg(e.target.value)}
                    placeholder="Enter your condition"
                    className="w-full rounded-full bg-white px-6 py-3.5 text-center text-lg font-bold tracking-wide text-ink-900 placeholder:text-ink-700/40 focus:outline-none"
                  />
                  <button type="submit" className="btn-primary shrink-0 rounded-full px-8 py-3.5">
                    Find therapies
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Category chips (horizontal scroll on mobile) */}
          <div className="-mx-4 mt-6 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <Link
                key={c.label}
                to={c.to}
                className="flex shrink-0 items-center gap-2 rounded-full bg-neutral-200 px-5 py-3 font-semibold text-ink-900 transition hover:bg-neutral-300"
              >
                {c.carType ? (
                  <CarTypeIcon type={c.carType} className="h-5 w-5 text-ink-900" />
                ) : (
                  <ChipIcon name={c.icon} />
                )}
                {c.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-700/70">
            <span className="flex items-center gap-1.5"><Check /> Rated 4.6/5 by 4,800+ patients</span>
            <span className="flex items-center gap-1.5"><Check /> Free &amp; no-obligation consultation</span>
          </div>
          <p className="mt-3 max-w-2xl text-sm italic text-ink-700/50">
            Illustrative demo — not medical advice. Therapies, costs and outcomes shown are sample data; investigational therapies are labelled.
          </p>
        </div>
      </section>

      {/* ---------- FEATURED THERAPY POSTER ---------- */}
      {posterCar && (
        <section className="container-x pt-10">
          <Link
            to={`/therapies/${posterCar.id}`}
            className="group relative block overflow-hidden rounded-3xl bg-ink-900 text-white"
          >
            <div className="absolute -right-10 top-0 h-72 w-72 rounded-full bg-clay-500/25 blur-3xl" />
            <div className="relative grid items-center gap-4 p-6 sm:p-10 md:grid-cols-2">
              <div>
                <span className="chip bg-white/10 text-white/80">Featured therapy</span>
                <h2 className="mt-4 font-display text-3xl font-extrabold uppercase leading-none sm:text-5xl">
                  {posterCar.model}
                </h2>
                <p className="mt-3 max-w-sm text-white/70">
                  {posterCar.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <span className="rounded-full bg-white px-6 py-3 font-display font-bold text-ink-900 transition group-hover:bg-clay-500 group-hover:text-white">
                    Learn more
                  </span>
                  <span className="text-sm text-white/70">
                    From <b className="text-white">{gbp(posterCar.price)}</b> · from{' '}
                    <b className="text-clay-300">{gbp(posterCar.monthly_price)}/mo</b>
                  </span>
                </div>
              </div>
              <CarImage
                accent={posterCar.accent}
                bodyType={posterCar.body_type}
                make={posterCar.make}
                model={posterCar.model}
                year={posterCar.year}
                angle={21}
                className="h-56 w-full rounded-2xl bg-transparent sm:h-72"
              />
            </div>
          </Link>
        </section>
      )}

      {/* ---------- FEATURED ---------- */}
      <section className="container-x py-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
              Top-rated therapies
            </h2>
            <p className="mt-1 text-ink-700/70">Hand-picked from our specialist teams.</p>
          </div>
          <Link to="/browse" className="btn-outline hidden px-5 py-2.5 text-sm sm:inline-flex">
            View all
          </Link>
        </div>
        {loading ? (
          <Spinner label="Loading therapies…" />
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- BROWSE BY BUDGET ---------- */}
      <section className="container-x pb-6">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
          Browse by budget
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {budgets.map((b) => (
            <Link
              key={b.label}
              to={b.to}
              className="card overflow-hidden transition hover:-translate-y-1 hover:shadow-card-hover"
            >
              <CarImage
                accent={b.accent}
                make={b.make}
                model={b.model}
                year={b.year}
                className="h-28 w-full sm:h-32"
              />
              <p className="p-4 font-display text-lg font-bold text-ink-900">{b.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- REGENERATIVE THERAPIES TRENDING (slider) ---------- */}
      {trending.length > 0 && (
        <section className="container-x py-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-clay-100 text-2xl">🧬</span>
            <div>
              <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
                Regenerative therapies trending
              </h2>
              <p className="text-ink-700/70">The most highly-rated protocols right now.</p>
            </div>
          </div>

          <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trending.map((car) => (
              <Link
                key={car.id}
                to={`/therapies/${car.id}`}
                className="group w-[300px] shrink-0 snap-start rounded-3xl bg-cream-200 p-5 transition hover:shadow-card-hover"
              >
                <h3 className="font-display text-xl font-bold text-ink-900">
                  {car.model}
                </h3>
                <p className="text-sm text-ink-700/70">{car.trim}</p>
                <span
                  className={`mt-3 inline-block rounded-lg px-3 py-1 text-sm font-bold ${
                    isResearch(car.condition) ? 'bg-clay-100 text-clay-700' : 'bg-ink-900 text-clay-300'
                  }`}
                >
                  {statusLabel(car.condition)}
                </span>
                <CarImage
                  accent={car.accent}
                  bodyType={car.body_type}
                  make={car.make}
                  model={car.model}
                  year={car.year}
                  className="my-4 h-36 w-full bg-transparent"
                />
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-sm">
                      From <b>{gbp(car.price)}</b>
                    </p>
                    <p className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-sm">
                      Finance from <b>{gbp(car.monthly_price)}</b>/mo
                    </p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-ink-900 text-white transition group-hover:bg-clay-500">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- CONSULTATION CTA ---------- */}
      <section className="container-x py-10">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-white sm:px-10">
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-clay-500/30 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">
                Not sure which therapy is right?
              </h2>
              <p className="mt-3 max-w-md text-white/70">
                Book a free, no-obligation consultation and our specialist team will assess your
                condition and match you to suitable regenerative therapies.
              </p>
              <Link to="/consultation" className="btn-primary mt-6 px-6 py-3">
                Book a consultation
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { k: '8', v: 'Specialties' },
                { k: '40+', v: 'Therapies' },
                { k: '5 mins', v: 'To book a consultation' },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                  <p className="font-display text-2xl font-extrabold text-clay-300">{s.k}</p>
                  <p className="mt-1 text-sm text-white/70">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- EXPLORE THERAPIES ---------- */}
      <section className="container-x py-10">
        <h2 className="font-display text-3xl font-extrabold uppercase text-ink-900 sm:text-4xl">
          Explore therapies
        </h2>

        <h3 className="mt-8 font-display text-xl font-bold text-ink-900 sm:text-2xl">
          Browse by category
        </h3>
        <div className="-mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {carTypes.map((t) => (
            <Link
              key={t.label}
              to={t.body ? `/browse?body_type=${encodeURIComponent(t.body)}` : '/browse'}
              className="group flex w-[180px] shrink-0 snap-start flex-col items-center overflow-hidden rounded-2xl border border-cream-300 bg-white p-3 transition hover:border-clay-400 hover:shadow-card"
            >
              <CarImage
                accent="#334155"
                bodyType={t.body || 'MSC'}
                make={t.make}
                model={t.model}
                year={2024}
                className="h-24 w-full"
              />
              <p className="mt-2 font-semibold text-ink-900">{t.label}</p>
            </Link>
          ))}
        </div>

        <h3 className="mt-12 font-display text-xl font-bold text-ink-900 sm:text-2xl">
          Browse by department
        </h3>
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {BRANDS.map((m) => (
            <Link
              key={m}
              to={`/browse?make=${encodeURIComponent(m)}`}
              className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-cream-200"
            >
              <BrandLogo make={m} />
              <span className="font-bold text-ink-900">{m}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- POPULAR THERAPIES ---------- */}
      <section className="container-x py-8">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
          Popular therapies
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {usedModels.map((m) => (
            <Link
              key={m}
              to={`/browse?search=${encodeURIComponent(m)}`}
              className="font-semibold text-ink-800 underline-offset-4 transition hover:text-clay-600 hover:underline"
            >
              {m}
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="container-x py-14">
        <div className="text-center">
          <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
            How StemCells Protocol works
          </h2>
          <p className="mt-2 text-ink-700/70">Three simple steps to personalised regenerative care.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="card p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-clay-100 text-2xl">
                  {s.icon}
                </span>
                <span className="font-display text-4xl font-extrabold text-cream-300">{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-ink-700/70">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- PATIENT REVIEWS (slider) ---------- */}
      <section className="container-x pb-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-clay-100 text-2xl">⭐</span>
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
              This is how care should feel
            </h2>
            <p className="text-ink-700/70">
              Our patients rate us as <b>‘Excellent’</b> on Trustpilot.
            </p>
          </div>
        </div>

        <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {reviews.map((r) => (
            <div
              key={r.title}
              className="w-[300px] shrink-0 snap-start rounded-2xl border border-cream-300 bg-white p-5 shadow-sm"
            >
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((n) => (
                  <span key={n} className="grid h-6 w-6 place-items-center bg-green-500 text-xs text-white">
                    ★
                  </span>
                ))}
              </div>
              <h3 className="mt-3 font-display font-bold text-ink-900">{r.title}</h3>
              <p className="mt-1 text-sm text-ink-700/70">{r.body}</p>
              <p className="mt-4 text-sm font-semibold text-ink-800">
                {r.author} <span className="font-normal text-ink-700/50">· {r.when}</span>
              </p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-center text-sm text-ink-700/70">
          Rated <b>4.6/5</b> based on <b>4,800+</b> reviews on{' '}
          <span className="font-semibold text-green-600">★ Trustpilot</span>
        </p>
      </section>

      {/* ---------- ACCREDITED & RESEARCH-LED ---------- */}
      <section className="container-x py-10">
        <div className="flex items-start gap-4">
          <span className="text-4xl text-clay-500">❤</span>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Accredited &amp; research-led
            </h2>
            <p className="mt-1 max-w-xl text-ink-700/70">
              We work with accredited specialist clinics and research-led cell-therapy laboratories
              across every department.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- WE MAKE REGENERATIVE CARE CLEAR ---------- */}
      <section className="container-x pb-10">
        <div className="rounded-3xl bg-ink-900 p-8 text-white sm:p-12">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-clay-500 text-3xl">
              🧑‍⚕️
            </span>
            <div>
              <h2 className="font-display text-3xl font-extrabold uppercase leading-tight sm:text-4xl">
                We make regenerative care clear
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-white/70">
                Our clinical team is here to make regenerative medicine easy to understand. Our
                detailed therapy overviews and plain-English patient guides have got you covered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- MOST-VIEWED THERAPIES ---------- */}
      {featured.length > 0 && (
        <section className="container-x pb-14">
          <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
            Most-viewed therapies
          </h2>
          <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.slice(0, 6).map((car) => (
              <Link
                key={car.id}
                to={`/therapies/${car.id}`}
                className="group w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-card transition hover:shadow-card-hover"
              >
                <CarImage
                  accent={car.accent}
                  bodyType={car.body_type}
                  make={car.make}
                  model={car.model}
                  year={car.year}
                  className="h-40 w-full"
                />
                <div className="p-4">
                  <h3 className="font-display text-lg font-bold text-ink-900 underline-offset-4 group-hover:underline">
                    {car.model}
                  </h3>
                  <span className="mt-2 inline-block rounded-lg bg-clay-100 px-2.5 py-1 text-sm font-extrabold text-clay-700">
                    {Math.round(car.rating * 2)}/10
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- PATIENT GUIDES + VIDEOS (dark) ---------- */}
      {featured.length > 0 && (
        <section className="bg-ink-900 py-14 text-white">
          <div className="container-x">
            <h2 className="font-display text-2xl font-extrabold uppercase sm:text-3xl">
              Patient guides and latest research
            </h2>
            <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {news.map((title, i) => {
                const car = featured[i % featured.length];
                return (
                  <Link
                    key={title}
                    to="/browse"
                    className="group w-[300px] shrink-0 snap-start"
                  >
                    <CarImage
                      accent={car.accent}
                      bodyType={car.body_type}
                      make={car.make}
                      model={car.model}
                      year={car.year}
                      className="h-44 w-full rounded-2xl"
                    />
                    <h3 className="mt-3 font-display text-lg font-bold underline-offset-4 group-hover:underline">
                      {title}
                    </h3>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 text-center">
              <Link to="/browse" className="btn bg-white px-6 py-3 text-ink-900 hover:bg-clay-500 hover:text-white">
                View more patient guides
              </Link>
            </div>

            <h2 className="mt-12 font-display text-2xl font-extrabold uppercase sm:text-3xl">
              Explainer videos
            </h2>
            <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {videos.map((title, i) => {
                const car = featured[(i + 2) % featured.length];
                return (
                  <Link key={title} to="/browse" className="group w-[320px] shrink-0 snap-start">
                    <div className="relative overflow-hidden rounded-2xl">
                      <CarImage
                        accent={car.accent}
                        bodyType={car.body_type}
                        make={car.make}
                        model={car.model}
                        year={car.year}
                        className="h-44 w-full"
                      />
                      <span className="absolute inset-0 grid place-items-center bg-black/20">
                        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-ink-900 transition group-hover:scale-110">
                          <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-0.5" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold underline-offset-4 group-hover:underline">
                      {title}
                    </h3>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------- EXPLORE REGENERATIVE MEDICINE ---------- */}
      {trending.length > 0 && (
        <section className="container-x py-14">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-clay-500 text-2xl text-white">
              🧬
            </span>
            <div>
              <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
                Explore regenerative medicine
              </h2>
              <p className="mt-1 text-ink-700/70">
                Check out our regenerative-medicine tools and patient guides.
              </p>
            </div>
          </div>

          <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {evTools.map((t, i) => {
              const car = trending[i % trending.length];
              return (
                <Link key={t.label} to={t.to} className="group w-[300px] shrink-0 snap-start">
                  <CarImage
                    accent={car.accent}
                    bodyType={car.body_type}
                    make={car.make}
                    model={car.model}
                    year={car.year}
                    className="h-44 w-full rounded-2xl"
                  />
                  <h3 className="mt-3 font-display text-lg font-bold text-ink-900 underline-offset-4 group-hover:underline">
                    {t.label}
                  </h3>
                </Link>
              );
            })}
          </div>

          <div className="mt-6">
            <Link to="/compare" className="btn-outline w-full justify-center py-3.5 sm:w-auto sm:px-8">
              Compare regenerative therapies
            </Link>
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      <section className="container-x py-14">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
          Frequently asked questions
        </h2>
        <div className="mt-6 divide-y divide-cream-300 overflow-hidden rounded-2xl border border-cream-300 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-display font-bold text-ink-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cream-200 text-clay-600 transition group-open:rotate-45">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="px-5 pb-5 text-ink-700/80">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-clay-500" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
