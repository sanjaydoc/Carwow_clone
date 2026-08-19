import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarImage from '../components/CarImage';
import Spinner from '../components/Spinner';
import { gbp, statusLabel } from '../utils/format';

function EvDealCard({ car, wide = false }: { car: Car; wide?: boolean }) {
  return (
    <Link
      to={`/therapies/${car.id}`}
      className={`group flex flex-col rounded-3xl bg-cream-200 p-5 transition hover:shadow-card-hover ${
        wide ? '' : 'w-[320px] shrink-0 snap-start'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-xl font-extrabold text-ink-900">
          {car.make} {car.model}
        </h3>
        <span className="chip bg-clay-100 text-clay-700">🔬 {statusLabel(car.condition)}</span>
      </div>
      <p className="mt-1 text-sm text-ink-700/70">{car.description?.split('.')[0]}.</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="rounded-md bg-clay-200 px-2 py-0.5 text-sm font-extrabold text-clay-900">
          {car.body_type}
        </span>
        <span className="text-sm font-semibold text-ink-900 underline underline-offset-4">
          {car.fuel_type} cells
        </span>
      </div>

      <CarImage
        accent={car.accent}
        bodyType={car.body_type}
        make={car.make}
        model={car.model}
        year={car.year}
        className="my-4 h-44 w-full bg-transparent"
      />

      <span className="w-fit rounded-lg bg-ink-900 px-3 py-1 text-sm font-bold text-clay-300">
        Under research
      </span>

      <div className="mt-4 flex items-end justify-between rounded-2xl bg-white p-4">
        <div>
          <p className="text-sm text-ink-700/70">{car.make} {car.model}</p>
          <p className="font-display font-extrabold text-ink-900">
            Indicative from {gbp(car.price)}{' '}
            <span className="font-semibold text-ink-700/70">(Finance from {gbp(car.monthly_price)}/mo)</span>
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

const filters = ['Department', 'Category', 'Cell source', 'Delivery route'];

export default function EvDeals() {
  const [evs, setEvs] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

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
            <div className="flex items-start gap-3">
              <span className="text-3xl">🔬</span>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-clay-600 sm:text-3xl">
                  Latest trial openings
                </h2>
                <p className="text-ink-700/70">New investigational therapies as they open.</p>
              </div>
            </div>
            <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {evs.map((car) => (
                <EvDealCard key={car.id} car={car} />
              ))}
            </div>
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
              Investigational therapies are experimental and offered within clinical-trial settings; this is an
              illustrative demo, not medical advice.
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
