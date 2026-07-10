import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Car, Filters, Pagination } from '../types';
import CarCard from '../components/CarCard';
import Spinner from '../components/Spinner';

const sorts = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'monthly_asc', label: 'Monthly: low to high' },
  { value: 'year_desc', label: 'Newest first' },
  { value: 'rating_desc', label: 'Top rated' },
  { value: 'mileage_asc', label: 'Lowest mileage' },
];

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [cars, setCars] = useState<Car[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const get = (k: string) => params.get(k) || '';

  useEffect(() => {
    api.getFilters().then(setFilters);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .getCars({
        search: get('search'),
        make: get('make'),
        body_type: get('body_type'),
        fuel_type: get('fuel_type'),
        transmission: get('transmission'),
        condition: get('condition'),
        max_price: get('max_price') ? Number(get('max_price')) : undefined,
        sort: get('sort') || 'relevance',
        page: Number(get('page')) || 1,
        limit: 12,
      })
      .then((res) => {
        setCars(res.cars);
        setPagination(res.pagination);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const clearAll = () => setParams(new URLSearchParams());

  const activeCount = ['make', 'body_type', 'fuel_type', 'transmission', 'condition', 'max_price', 'search'].filter(
    (k) => get(k)
  ).length;

  const Select = ({ label, k, options }: { label: string; k: string; options: string[] }) => (
    <div>
      <label className="label">{label}</label>
      <select value={get(k)} onChange={(e) => update(k, e.target.value)} className="input capitalize">
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o} className="capitalize">
            {o}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="container-x py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">Browse cars</h1>
          <p className="mt-1 text-ink-700/70">
            {pagination ? `${pagination.total} cars available` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="btn-outline px-4 py-2.5 text-sm lg:hidden"
          >
            Filters {activeCount > 0 && `(${activeCount})`}
          </button>
          <select
            value={get('sort') || 'relevance'}
            onChange={(e) => update('sort', e.target.value)}
            className="input w-auto py-2.5 text-sm"
          >
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="card sticky top-20 space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-ink-900">Filters</h2>
              {activeCount > 0 && (
                <button onClick={clearAll} className="text-sm font-semibold text-clay-600">
                  Clear all
                </button>
              )}
            </div>

            <div>
              <label className="label">Search</label>
              <input
                value={get('search')}
                onChange={(e) => update('search', e.target.value)}
                placeholder="Make or model"
                className="input"
              />
            </div>

            {filters && (
              <>
                <Select label="Make" k="make" options={filters.makes} />
                <Select label="Body type" k="body_type" options={filters.body_types} />
                <Select label="Fuel type" k="fuel_type" options={filters.fuel_types} />
                <Select label="Transmission" k="transmission" options={filters.transmissions} />
                <Select label="Condition" k="condition" options={filters.conditions} />
                <div>
                  <label className="label">
                    Max price: {get('max_price') ? `£${Number(get('max_price')).toLocaleString()}` : 'Any'}
                  </label>
                  <input
                    type="range"
                    min={filters.price.min}
                    max={filters.price.max}
                    step={1000}
                    value={get('max_price') || filters.price.max}
                    onChange={(e) => update('max_price', e.target.value)}
                    className="w-full accent-clay-500"
                  />
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Results */}
        <div>
          {loading ? (
            <Spinner label="Finding cars…" />
          ) : cars.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-4xl">🚗</p>
              <h3 className="mt-3 font-display text-xl font-bold">No cars match your filters</h3>
              <p className="mt-1 text-ink-700/70">Try widening your search or clearing filters.</p>
              <button onClick={clearAll} className="btn-primary mt-5">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {cars.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>

              {pagination && pagination.pages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => update('page', String(pagination.page - 1))}
                    className="btn-outline px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-4 text-sm font-semibold text-ink-700">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => update('page', String(pagination.page + 1))}
                    className="btn-outline px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
