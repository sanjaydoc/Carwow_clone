import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarImage from '../components/CarImage';
import CarCard from '../components/CarCard';
import StarRating from '../components/StarRating';
import Spinner from '../components/Spinner';
import { gbp, num } from '../utils/format';
import { useSaved } from '../context/SavedContext';
import { useAuth } from '../context/AuthContext';

export default function CarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSaved, toggle } = useSaved();
  const [car, setCar] = useState<Car | null>(null);
  const [similar, setSimilar] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .getCar(id!)
      .then(({ car, similar }) => {
        setCar(car);
        setSimilar(similar);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner label="Loading car…" />;
  if (notFound || !car)
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Car not found</h1>
        <Link to="/browse" className="btn-primary mt-6">
          Back to browse
        </Link>
      </div>
    );

  const saved = isSaved(car.id);
  const onSave = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/cars/${car.id}` } });
      return;
    }
    await toggle(car.id).catch(() => {});
  };

  const specs = [
    { label: 'Fuel type', value: car.fuel_type },
    { label: 'Transmission', value: car.transmission },
    { label: 'Body type', value: car.body_type },
    { label: 'Year', value: String(car.year) },
    { label: 'Mileage', value: car.mileage === 0 ? 'Brand new' : `${num(car.mileage)} miles` },
    { label: 'Engine', value: car.engine || '—' },
    { label: 'Power', value: car.power_bhp ? `${car.power_bhp} bhp` : '—' },
    { label: '0–60 mph', value: car.zero_to_sixty ? `${car.zero_to_sixty}s` : '—' },
    { label: 'Top speed', value: car.top_speed ? `${car.top_speed} mph` : '—' },
    {
      label: car.fuel_type === 'Electric' ? 'Range/economy' : 'Economy',
      value: car.economy_mpg ? `${car.economy_mpg} mpg` : 'Electric',
    },
    { label: 'Seats', value: car.seats ? String(car.seats) : '—' },
    { label: 'Doors', value: car.doors ? String(car.doors) : '—' },
  ];

  return (
    <div className="container-x py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-ink-700/60">
        <Link to="/" className="hover:text-clay-600">
          Home
        </Link>{' '}
        /{' '}
        <Link to="/browse" className="hover:text-clay-600">
          Browse
        </Link>{' '}
        / <span className="text-ink-800">{car.make} {car.model}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: image + specs */}
        <div>
          <div className="card overflow-hidden">
            <CarImage
              accent={car.accent}
              bodyType={car.body_type}
              make={car.make}
              model={car.model}
              year={car.year}
              angle={29}
              className="aspect-[16/10] w-full"
            />
          </div>

          <div className="mt-6 card p-6">
            <h2 className="font-display text-xl font-bold text-ink-900">Overview</h2>
            <p className="mt-2 leading-relaxed text-ink-700/80">{car.description}</p>

            <h3 className="mt-6 font-display text-lg font-bold text-ink-900">Specifications</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-0 sm:grid-cols-3">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between border-b border-cream-300 py-3">
                  <dt className="text-sm text-ink-700/60">{s.label}</dt>
                  <dd className="text-sm font-semibold text-ink-900">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Right: purchase panel */}
        <div>
          <div className="card sticky top-20 p-6">
            <div className="flex items-center justify-between">
              <span className="chip capitalize">{car.condition} car</span>
              <StarRating rating={car.rating} count={car.review_count} />
            </div>

            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-900">
              {car.make} {car.model}
            </h1>
            <p className="text-ink-700/70">{car.trim}</p>

            <div className="mt-5 rounded-2xl bg-cream-200 p-5">
              <p className="text-sm text-ink-700/60">Cash price</p>
              <p className="font-display text-4xl font-extrabold text-ink-900">{gbp(car.price)}</p>
              <p className="mt-1 text-sm text-ink-700/70">
                or from{' '}
                <span className="font-bold text-clay-600">{gbp(car.monthly_price)}/mo</span> on finance
              </p>
            </div>

            <button className="btn-primary mt-4 w-full py-3.5">Get best offers</button>
            <button onClick={onSave} className="btn-outline mt-2 w-full py-3.5">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill={saved ? '#D97757' : 'none'}
                stroke={saved ? '#D97757' : 'currentColor'}
                strokeWidth="2"
              >
                <path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 2 4.9 5.3 4.9c2 0 3.4 1.1 4.2 2.4h.9c.8-1.3 2.2-2.4 4.2-2.4 3.3 0 5 3.5 3.3 6.9C19.5 16.4 12 21 12 21z" />
              </svg>
              {saved ? 'Saved' : 'Save this car'}
            </button>

            <div className="mt-5 space-y-2 text-sm text-ink-700/70">
              <p className="flex items-center gap-2">
                <Check /> Free home delivery available
              </p>
              <p className="flex items-center gap-2">
                <Check /> 14-day money-back guarantee
              </p>
              <p className="flex items-center gap-2">
                <Check /> Trusted, vetted dealers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Similar cars */}
      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-extrabold text-ink-900">You might also like</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-clay-500" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
