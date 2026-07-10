import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarCard from '../components/CarCard';
import CarImage from '../components/CarImage';
import Spinner from '../components/Spinner';

const categories = [
  { label: 'Electric', icon: '⚡', to: '/browse?fuel_type=Electric' },
  { label: 'Hybrid', icon: '🔋', to: '/browse?fuel_type=Hybrid' },
  { label: 'New', icon: '✨', to: '/browse?condition=new' },
  { label: 'Used', icon: '🚗', to: '/browse?condition=used' },
  { label: 'SUVs', icon: '🚙', to: '/browse?body_type=SUV' },
  { label: 'Saloons', icon: '🚘', to: '/browse?body_type=Saloon' },
];

const budgets = [
  { label: 'Under £25k', to: '/browse?max_price=25000&sort=price_desc', accent: '#2563eb' },
  { label: 'Under £30k', to: '/browse?max_price=30000&sort=price_desc', accent: '#C15F3C' },
  { label: 'Under £40k', to: '/browse?max_price=40000&sort=price_desc', accent: '#dc2626' },
  { label: 'Under £50k', to: '/browse?max_price=50000&sort=price_desc', accent: '#64748b' },
];

const carTypes = [
  { label: 'SUVs', type: 'SUV', accent: '#334155' },
  { label: 'Hatchbacks', type: 'Hatchback', accent: '#0891b2' },
  { label: 'Saloons', type: 'Saloon', accent: '#7c3b25' },
  { label: 'Estates', type: 'Estate', accent: '#16a34a' },
];

const steps = [
  { title: 'Search & compare', body: 'Browse thousands of new and used cars with expert reviews.', icon: '🔍' },
  { title: 'Get the best offers', body: 'Trusted dealers compete to give you their best price.', icon: '🏷️' },
  { title: 'Buy with confidence', body: 'Choose your offer and get your car delivered to your door.', icon: '🔑' },
];

type Tab = 'find' | 'sell';

export default function Home() {
  const [featured, setFeatured] = useState<Car[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('find');
  const [search, setSearch] = useState('');
  const [reg, setReg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCars({ sort: 'rating_desc', limit: 8 }).then(({ cars }) => setFeatured(cars)).finally(() => setLoading(false));
    api.getFilters().then((f) => setMakes(f.makes));
  }, []);

  const onFind = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/browse?search=${encodeURIComponent(search.trim())}`);
  };
  const onSell = (e: FormEvent) => {
    e.preventDefault();
    navigate('/sell', { state: { reg } });
  };

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-clay-50 to-cream-200">
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-clay-200/50 blur-3xl" />
        <div className="container-x relative py-10 sm:py-14">
          <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-ink-900 sm:text-6xl">
            Browse, buy, sell
            <br />
            <span className="text-clay-500">all in one place</span>
          </h1>

          {/* Tabbed search card */}
          <div className="mt-7 max-w-2xl overflow-hidden rounded-3xl bg-ink-900 p-5 shadow-card sm:p-7">
            <div className="flex gap-6 border-b border-white/10">
              {[
                { id: 'find' as Tab, label: 'Find a car' },
                { id: 'sell' as Tab, label: 'Sell my car' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative pb-3 text-lg font-bold transition ${
                    tab === t.id ? 'text-white' : 'text-white/50'
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-clay-500" />
                  )}
                </button>
              ))}
              <Link
                to="/compare"
                className="ml-auto hidden self-center pb-3 text-lg font-bold text-white/50 transition hover:text-white sm:block"
              >
                Compare
              </Link>
            </div>

            {tab === 'find' ? (
              <form onSubmit={onFind} className="mt-5 flex items-center gap-2 rounded-full bg-white p-1.5">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by make or model"
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
            ) : (
              <form onSubmit={onSell} className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-white/70">
                  Your vehicle registration
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={reg}
                    onChange={(e) => setReg(e.target.value.toUpperCase())}
                    placeholder="ENTER REG"
                    className="w-full rounded-full bg-white px-6 py-3.5 text-center text-lg font-bold tracking-widest text-ink-900 placeholder:text-ink-700/40 focus:outline-none"
                  />
                  <button type="submit" className="btn-primary shrink-0 rounded-full px-8 py-3.5">
                    Value my car
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
                className="flex shrink-0 items-center gap-2 rounded-full border border-ink-900/10 bg-white px-5 py-3 font-semibold text-ink-800 shadow-sm transition hover:border-clay-400 hover:text-clay-600"
              >
                <span className="text-lg">{c.icon}</span>
                {c.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-700/70">
            <span className="flex items-center gap-1.5"><Check /> Rated 4.4/5 by 82,000+ drivers</span>
            <span className="flex items-center gap-1.5"><Check /> Free &amp; no obligation</span>
          </div>
        </div>
      </section>

      {/* ---------- FEATURED ---------- */}
      <section className="container-x py-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
              Top-rated cars
            </h2>
            <p className="mt-1 text-ink-700/70">Hand-picked highlights from our expert reviews.</p>
          </div>
          <Link to="/browse" className="btn-outline hidden px-5 py-2.5 text-sm sm:inline-flex">
            View all
          </Link>
        </div>
        {loading ? (
          <Spinner label="Loading cars…" />
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
              <CarImage accent={b.accent} className="h-28 w-full sm:h-32" />
              <p className="p-4 font-display text-lg font-bold text-ink-900">{b.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- SELL CTA ---------- */}
      <section className="container-x py-10">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-white sm:px-10">
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-clay-500/30 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">
                Sell your car for more
              </h2>
              <p className="mt-3 max-w-md text-white/70">
                Most sellers get an average £1,000 more vs part-exchange. Let trusted dealers
                compete to buy your car — free and with no obligation.
              </p>
              <Link to="/sell" className="btn-primary mt-6 px-6 py-3">
                Value my car
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { k: '4,500+', v: 'Verified dealers' },
                { k: '£1,000', v: 'More on average' },
                { k: '5 mins', v: 'To your offer' },
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

      {/* ---------- BROWSE BY CAR TYPE ---------- */}
      <section className="container-x py-6">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
          Browse by car type
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {carTypes.map((t) => (
            <Link
              key={t.label}
              to={`/browse?body_type=${t.type}`}
              className="card flex flex-col items-center overflow-hidden p-4 transition hover:-translate-y-1 hover:shadow-card-hover"
            >
              <CarImage accent={t.accent} bodyType={t.type} className="h-24 w-full" />
              <p className="mt-3 font-display text-lg font-bold text-ink-900">{t.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- BROWSE BY MANUFACTURER ---------- */}
      <section className="container-x py-8">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
          Browse by manufacturer
        </h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {makes.map((m) => (
            <Link
              key={m}
              to={`/browse?make=${encodeURIComponent(m)}`}
              className="rounded-full border border-ink-900/10 bg-white px-5 py-2.5 font-semibold text-ink-800 transition hover:border-clay-400 hover:text-clay-600"
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
            How carwow works
          </h2>
          <p className="mt-2 text-ink-700/70">Three simple steps to your next car.</p>
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

      {/* ---------- TRUST ---------- */}
      <section className="container-x pb-16">
        <div className="card flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex gap-1 text-2xl">{'★★★★★'}</div>
          <p className="font-display text-xl font-bold text-ink-900">
            Rated <span className="text-clay-600">4.4 / 5</span> based on 82,488 reviews
          </p>
          <p className="max-w-lg text-ink-700/70">
            Our customers rate us as ‘Excellent’. We connect you with all the major manufacturers and
            thousands of hand-picked dealers.
          </p>
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
