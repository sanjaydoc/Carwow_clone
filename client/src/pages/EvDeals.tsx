import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarImage from '../components/CarImage';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import { gbp, statusLabel } from '../utils/format';

function EvDealCard({ car, wide = false }: { car: Car; wide?: boolean }) {
  return (
    <Link
      data-card
      to={`/therapies/${car.id}`}
      className={`group flex flex-col rounded-3xl bg-white shadow-card p-5 transition hover:shadow-card-hover ${
        wide ? '' : 'w-[300px] shrink-0 snap-start sm:w-[320px]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-xl font-extrabold leading-tight text-ink-900">
          {car.model}
        </h3>
        <span className="chip shrink-0 bg-clay-100 text-clay-700"><Icon name="microscope" className="h-3.5 w-3.5" /> {statusLabel(car.condition)}</span>
      </div>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-ink-700/70">{car.description?.split('.')[0]}.</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-md bg-clay-200 px-2 py-0.5 text-sm font-extrabold text-clay-900">
          {car.body_type}
        </span>
        <span className="text-sm font-semibold text-ink-900 underline underline-offset-4">
          {car.fuel_type} cells
        </span>
      </div>

      <div className="relative my-4">
        <CarImage
          accent={car.accent}
          bodyType={car.body_type}
          make={car.make}
          model={car.model}
          year={car.year}
          className="h-44 w-full bg-transparent"
        />
        <span className="absolute bottom-2 left-2 w-fit rounded-lg bg-ink-900/90 px-3 py-1 text-xs font-bold text-clay-300 backdrop-blur">
          Under research
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 rounded-2xl bg-white p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/50">Indicative cost</p>
          <p className="font-display font-extrabold text-ink-900">
            from {gbp(car.price)}{' '}
            <span className="whitespace-nowrap font-semibold text-ink-700/70">(Finance {gbp(car.monthly_price)}/mo)</span>
          </p>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink-900 text-white transition group-hover:bg-clay-500">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function ScrollBtn({ dir, onClick }: { dir: -1 | 1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === -1 ? 'Previous therapies' : 'Next therapies'}
      className="grid h-11 w-11 place-items-center rounded-full border border-ink-900/15 bg-white text-ink-900 transition hover:border-clay-400 hover:bg-clay-50 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d={dir === -1 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

const filters = ['Department', 'Category', 'Cell source', 'Delivery route'];

export default function EvDeals() {
  const [evs, setEvs] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-card]');
    const step = card ? card.offsetWidth + 20 : 340; // card width + gap
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  useEffect(() => {
    api
      .getCars({ condition: 'used', limit: 48 })
      .then(({ cars }) => setEvs(cars))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink-900 text-white">
        <div className="container-x py-14">
          <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl">
            Active research — <span className="text-clay-400">therapies under investigation</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/70">
            Explore the stem-cell therapies our partner clinics are studying in clinical trials.
          </p>
          <div className="mt-7 flex max-w-md flex-col gap-3">
            <Link to="/browse" className="btn-primary justify-center py-4 text-base">
              Browse all therapies
            </Link>
            <Link
              to="/consultation"
              className="btn justify-center rounded-full bg-white/10 py-4 text-base font-semibold text-white transition hover:bg-white/20"
            >
              Book a consultation
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <Spinner label="Loading research therapies…" />
      ) : (
        <>
          {/* Latest trial openings */}
          <section className="container-x py-12">
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="icon-tile h-11 w-11"><Icon name="microscope" className="h-6 w-6" /></span>
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-clay-600 sm:text-3xl">
                    Latest trial openings
                  </h2>
                  <p className="text-ink-700/70">New investigational therapies as they open.</p>
                </div>
              </div>
              <div className="hidden shrink-0 gap-2 sm:flex">
                <ScrollBtn dir={-1} onClick={() => scrollByCard(-1)} />
                <ScrollBtn dir={1} onClick={() => scrollByCard(1)} />
              </div>
            </div>
            <div
              ref={scroller}
              className="-mx-4 mt-6 flex snap-x scroll-px-4 gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {evs.slice(0, 12).map((car) => (
                <EvDealCard key={car.id} car={car} />
              ))}
            </div>
            <p className="mt-1 text-center text-xs text-ink-700/50 sm:hidden">← Swipe to see more →</p>
          </section>

          {/* All investigational therapies */}
          <section className="container-x pb-16">
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
              All investigational therapies
            </h2>
            <p className="mt-1 text-ink-700/70">Find out more information on the therapies under research below.</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-clay-400"
                >
                  {f}
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>

            <p className="mt-6 font-display text-xl font-extrabold text-ink-900">{evs.length} therapies found</p>

            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {evs.map((car) => (
                <EvDealCard key={car.id} car={car} wide />
              ))}
            </div>

            <p className="mt-6 text-sm italic text-ink-700/70">
              Investigational therapies are experimental and offered within clinical-trial settings.
            </p>
          </section>

          {/* Not sure if a trial suits you? */}
          <section className="container-x pb-16">
            <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-white sm:px-10">
              <div className="absolute -right-10 top-0 h-64 w-64 rounded-full bg-clay-500/25 blur-3xl" />
              <div className="relative max-w-lg">
                <h2 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">
                  Not sure if a trial suits you?
                </h2>
                <p className="mt-3 text-white/70">Speak to a specialist. Personalised guidance. No obligation.</p>
                <Link to="/consultation" className="btn mt-6 rounded-full bg-white px-8 py-3.5 font-bold text-ink-900 hover:bg-clay-500 hover:text-white">
                  Book a consultation
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
