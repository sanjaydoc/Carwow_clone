import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarImage from '../components/CarImage';
import Spinner from '../components/Spinner';
import { gbp } from '../utils/format';

function saving(car: Car) {
  return Math.round((car.price * 0.09) / 10) * 10;
}

function EvDealCard({ car, wide = false }: { car: Car; wide?: boolean }) {
  return (
    <Link
      to={`/cars/${car.id}`}
      className={`group flex flex-col rounded-3xl bg-cream-200 p-5 transition hover:shadow-card-hover ${
        wide ? '' : 'w-[320px] shrink-0 snap-start'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-xl font-extrabold text-ink-900">
          {car.make} {car.model}
        </h3>
        <span className="chip bg-green-100 text-green-800">⚡ EV Grant</span>
      </div>
      <p className="mt-1 text-sm text-ink-700/70">{car.description?.split('.')[0]}.</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="rounded-md bg-green-200 px-2 py-0.5 text-sm font-extrabold text-green-900">
          {Math.round(car.rating * 2)}/10
        </span>
        <span className="text-sm font-semibold text-ink-900 underline underline-offset-4">
          {car.make} {car.model} review
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
        Avg. saving {gbp(saving(car))}
      </span>

      <div className="mt-4 flex items-end justify-between rounded-2xl bg-white p-4">
        <div>
          <p className="text-sm text-ink-700/70">New {car.make} {car.model}</p>
          <p className="font-display font-extrabold text-ink-900">
            From {gbp(car.price)}{' '}
            <span className="font-semibold text-ink-700/70">({gbp(car.monthly_price)}* / month)</span>
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

const filters = ['Brand', 'Body type', 'Budget', 'Equipment'];

export default function EvDeals() {
  const [evs, setEvs] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCars({ fuel_type: 'Electric', limit: 48 })
      .then(({ cars }) => setEvs(cars))
      .finally(() => setLoading(false));
  }, []);

  const maxSaving = evs.length ? Math.max(...evs.map(saving)) : 7340;

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink-900 text-white">
        <div className="container-x py-14">
          <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl">
            New EV deals — save up to <span className="text-clay-400">{gbp(maxSaving)}</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/70">
            EV grant, no EV grant — there are always big deals on electric cars on carwow.
          </p>
          <div className="mt-7 flex max-w-md flex-col gap-3">
            <Link to="/browse?fuel_type=Electric&condition=new" className="btn-primary justify-center py-4 text-base">
              Build your EV
            </Link>
            <Link
              to="/browse?fuel_type=Electric"
              className="btn justify-center rounded-full bg-white/10 py-4 text-base font-semibold text-white transition hover:bg-white/20"
            >
              Browse in-stock EVs
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <Spinner label="Loading EV deals…" />
      ) : (
        <>
          {/* Latest price drops */}
          <section className="container-x py-12">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-clay-600 sm:text-3xl">
                  Latest price drops
                </h2>
                <p className="text-ink-700/70">Carwow's best EV savings as they come in.</p>
              </div>
            </div>
            <div className="-mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[...evs].sort((a, b) => saving(b) - saving(a)).map((car) => (
                <EvDealCard key={car.id} car={car} />
              ))}
            </div>
          </section>

          {/* All electric deals */}
          <section className="container-x pb-16">
            <h2 className="font-display text-2xl font-extrabold uppercase text-ink-900 sm:text-3xl">
              All electric deals available
            </h2>
            <p className="mt-1 text-ink-700/70">Find out more information on the electric deals below.</p>

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

            <p className="mt-6 font-display text-xl font-extrabold text-ink-900">{evs.length} cars found</p>

            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {evs.map((car) => (
                <EvDealCard key={car.id} car={car} wide />
              ))}
            </div>
          </section>

          {/* What's your car worth */}
          <section className="container-x pb-16">
            <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-white sm:px-10">
              <div className="absolute -right-10 top-0 h-64 w-64 rounded-full bg-clay-500/25 blur-3xl" />
              <div className="relative max-w-lg">
                <h2 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">
                  What's your car worth?
                </h2>
                <p className="mt-3 text-white/70">Instant valuation. Fast sale. No fees.</p>
                <Link to="/sell" className="btn mt-6 rounded-full bg-white px-8 py-3.5 font-bold text-ink-900 hover:bg-clay-500 hover:text-white">
                  Value my car
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
