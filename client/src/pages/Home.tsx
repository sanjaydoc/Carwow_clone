import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarCard from '../components/CarCard';
import CarImage from '../components/CarImage';
import Spinner from '../components/Spinner';
import { gbp } from '../utils/format';

const categories = [
  { label: 'Electric', icon: '⚡', to: '/browse?fuel_type=Electric' },
  { label: 'Hybrid', icon: '🔋', to: '/browse?fuel_type=Hybrid' },
  { label: 'New', icon: '✨', to: '/browse?condition=new' },
  { label: 'Used', icon: '🚗', to: '/browse?condition=used' },
  { label: 'SUVs', icon: '🚙', to: '/browse?body_type=SUV' },
  { label: 'Saloons', icon: '🚘', to: '/browse?body_type=Saloon' },
];

const budgets = [
  { label: 'Under £25k', to: '/browse?max_price=25000&sort=price_desc', accent: '#ea580c', make: 'Toyota', model: 'Yaris', year: 2024 },
  { label: 'Under £30k', to: '/browse?max_price=30000&sort=price_desc', accent: '#0ea5e9', make: 'Volkswagen', model: 'Golf', year: 2024 },
  { label: 'Under £40k', to: '/browse?max_price=40000&sort=price_desc', accent: '#0891b2', make: 'Ford', model: 'Puma', year: 2024 },
  { label: 'Under £50k', to: '/browse?max_price=50000&sort=price_desc', accent: '#c0392b', make: 'Tesla', model: 'Model 3', year: 2024 },
];

const carTypes = [
  { label: 'SUVs', type: 'SUV', accent: '#334155', make: 'Kia', model: 'Sportage', year: 2024 },
  { label: 'Hatchbacks', type: 'Hatchback', accent: '#0891b2', make: 'Volkswagen', model: 'Golf', year: 2024 },
  { label: 'Saloons', type: 'Saloon', accent: '#7c3b25', make: 'BMW', model: '3 Series', year: 2024 },
  { label: 'Estates', type: 'Estate', accent: '#16a34a', make: 'Skoda', model: 'Octavia', year: 2024 },
];

const usedModels = [
  'Audi A4', 'BMW 3 Series', 'Tesla Model 3', 'Volkswagen Golf', 'Ford Focus',
  'Ford Puma', 'Kia Sportage', 'Toyota Corolla', 'Nissan Qashqai', 'Hyundai Ioniq 5',
  'Mercedes-Benz A-Class', 'Volvo XC40', 'MINI Cooper', 'Honda Civic', 'Peugeot 3008',
  'Skoda Octavia', 'Toyota Yaris', 'Kia EV6', 'BMW X3', 'Land Rover Defender',
];

const news = [
  'I have £300 per month to spend on a car — what can I get?',
  'The best electric cars for 2026, road-tested',
  'Living with a hybrid: one month and 1,200 miles',
  'How to get the best price when you sell your car',
];

const videos = [
  'New EV mega-test: which one goes furthest?',
  'Hot hatch drag race — you pick the winner',
  "We review the UK's best-selling SUV",
];

const reviews = [
  { title: 'Sold my car in 3 days', body: 'I sold my car through carwow and bought a new one too. The whole process was smooth and I got a great price.', author: 'C. T.', when: '38 minutes ago' },
  { title: 'Best price, zero hassle', body: 'Dealers competed for my business and I saved over £3,000 versus the RRP. No haggling at all.', author: 'Priya S.', when: '2 hours ago' },
  { title: 'Genuinely excellent service', body: 'From search to delivery everything was clear and fast. The reviews helped me pick the right car.', author: 'James W.', when: '5 hours ago' },
  { title: 'Would recommend to anyone', body: 'Got four offers within minutes of listing my car. Collection was free and payment was instant.', author: 'Aisha R.', when: 'Yesterday' },
  { title: 'So easy to compare', body: 'Being able to line up three cars side by side made the decision simple. Brilliant tool.', author: 'Mark D.', when: '2 days ago' },
];

const steps = [
  { title: 'Search & compare', body: 'Browse thousands of new and used cars with expert reviews.', icon: '🔍' },
  { title: 'Get the best offers', body: 'Trusted dealers compete to give you their best price.', icon: '🏷️' },
  { title: 'Buy with confidence', body: 'Choose your offer and get your car delivered to your door.', icon: '🔑' },
];

type Tab = 'find' | 'sell' | 'reviews';

export default function Home() {
  const [featured, setFeatured] = useState<Car[]>([]);
  const [trending, setTrending] = useState<Car[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('find');
  const [search, setSearch] = useState('');
  const [reg, setReg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getCars({ sort: 'rating_desc', limit: 8 }).then(({ cars }) => setFeatured(cars)).finally(() => setLoading(false));
    api.getCars({ fuel_type: 'Electric', sort: 'rating_desc', limit: 8 }).then(({ cars }) => setTrending(cars));
    api.getFilters().then((f) => setMakes(f.makes));
  }, []);

  const onFind = (e: FormEvent) => {
    e.preventDefault();
    const q = encodeURIComponent(search.trim());
    // The "Read reviews" tab surfaces our top-rated cars.
    navigate(tab === 'reviews' ? `/browse?search=${q}&sort=rating_desc` : `/browse?search=${q}`);
  };
  const onSell = (e: FormEvent) => {
    e.preventDefault();
    navigate('/sell', { state: { reg } });
  };

  const posterCar = featured.find((c) => c.body_type === 'SUV') ?? featured[0];

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
            <div className="flex gap-5 border-b border-white/10 sm:gap-8">
              {[
                { id: 'find' as Tab, label: 'Find a car' },
                { id: 'sell' as Tab, label: 'Sell my car' },
                { id: 'reviews' as Tab, label: 'Read reviews' },
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
                    placeholder={tab === 'reviews' ? 'Search reviews by model' : 'Search by make or model'}
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
                    Find a car
                  </Link>
                </p>
              </>
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

      {/* ---------- FEATURED DEAL POSTER ---------- */}
      {posterCar && (
        <section className="container-x pt-10">
          <Link
            to={`/cars/${posterCar.id}`}
            className="group relative block overflow-hidden rounded-3xl bg-ink-900 text-white"
          >
            <div className="absolute -right-10 top-0 h-72 w-72 rounded-full bg-clay-500/25 blur-3xl" />
            <div className="relative grid items-center gap-4 p-6 sm:p-10 md:grid-cols-2">
              <div>
                <span className="chip bg-white/10 text-white/80">Featured deal</span>
                <h2 className="mt-4 font-display text-3xl font-extrabold uppercase leading-none sm:text-5xl">
                  {posterCar.make} {posterCar.model}
                </h2>
                <p className="mt-3 max-w-sm text-white/70">
                  {posterCar.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <span className="rounded-full bg-white px-6 py-3 font-display font-bold text-ink-900 transition group-hover:bg-clay-500 group-hover:text-white">
                    Configure yours
                  </span>
                  <span className="text-sm text-white/70">
                    Cash from <b className="text-white">{gbp(posterCar.price)}</b> · from{' '}
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

      {/* ---------- ELECTRIC IS TRENDING (slider) ---------- */}
      {trending.length > 0 && (
        <section className="container-x py-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-clay-100 text-2xl">⚡</span>
            <div>
              <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
                Electric is trending
              </h2>
              <p className="text-ink-700/70">Say hello to the hottest deals on the market.</p>
            </div>
          </div>

          <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trending.map((car) => (
              <Link
                key={car.id}
                to={`/cars/${car.id}`}
                className="group w-[300px] shrink-0 snap-start rounded-3xl bg-cream-200 p-5 transition hover:shadow-card-hover"
              >
                <h3 className="font-display text-xl font-bold text-ink-900">
                  {car.make} {car.model}
                </h3>
                <p className="text-sm text-ink-700/70">{car.trim}</p>
                <span className="mt-3 inline-block rounded-lg bg-ink-900 px-3 py-1 text-sm font-bold text-clay-300">
                  Avg saving {gbp(Math.round(car.price * 0.08))} off RRP
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
                      Cash from <b>{gbp(car.price)}</b>
                    </p>
                    <p className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-sm">
                      Lease from <b>{gbp(car.monthly_price)}</b>/mo
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
              <CarImage
                accent={t.accent}
                bodyType={t.type}
                make={t.make}
                model={t.model}
                year={t.year}
                className="h-24 w-full"
              />
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

      {/* ---------- POPULAR USED MODELS ---------- */}
      <section className="container-x py-8">
        <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
          Popular used car models
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {usedModels.map((m) => (
            <Link
              key={m}
              to={`/browse?search=${encodeURIComponent(m)}&condition=used`}
              className="font-semibold text-ink-800 underline-offset-4 transition hover:text-clay-600 hover:underline"
            >
              Used {m}
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

      {/* ---------- CUSTOMER REVIEWS (slider) ---------- */}
      <section className="container-x pb-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-clay-100 text-2xl">⭐</span>
          <div>
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
              This is how it should feel
            </h2>
            <p className="text-ink-700/70">
              Our customers rate us as <b>‘Excellent’</b> on Trustpilot.
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
          Rated <b>4.4/5</b> based on <b>82,488</b> reviews on{' '}
          <span className="font-semibold text-green-600">★ Trustpilot</span>
        </p>
      </section>

      {/* ---------- PARTNERS WE TRUST ---------- */}
      <section className="container-x py-10">
        <div className="flex items-start gap-4">
          <span className="text-4xl text-clay-500">❤</span>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              With partners we trust
            </h2>
            <p className="mt-1 max-w-xl text-ink-700/70">
              We connect you with all the major manufacturers and thousands of hand-picked dealers.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- WE MAKE CAR CHANGING EASY ---------- */}
      <section className="container-x pb-10">
        <div className="rounded-3xl bg-ink-900 p-8 text-white sm:p-12">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-clay-500 text-3xl">
              🧑‍💼
            </span>
            <div>
              <h2 className="font-display text-3xl font-extrabold uppercase leading-tight sm:text-4xl">
                We make car changing easy
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-white/70">
                We're here with a team of expert writers to make car-changing easy. Our detailed car
                reviews and helpful news and advice articles have got you covered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- MOST POPULAR CAR REVIEWS ---------- */}
      {featured.length > 0 && (
        <section className="container-x pb-14">
          <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
            Most popular car reviews
          </h2>
          <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.slice(0, 6).map((car) => (
              <Link
                key={car.id}
                to={`/cars/${car.id}`}
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
                    {car.make} {car.model} Review
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

      {/* ---------- NEWS + VIDEOS (dark) ---------- */}
      {featured.length > 0 && (
        <section className="bg-ink-900 py-14 text-white">
          <div className="container-x">
            <h2 className="font-display text-2xl font-extrabold uppercase sm:text-3xl">
              Helpful advice and latest car news
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
                View more car news
              </Link>
            </div>

            <h2 className="mt-12 font-display text-2xl font-extrabold uppercase sm:text-3xl">
              Latest videos
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
