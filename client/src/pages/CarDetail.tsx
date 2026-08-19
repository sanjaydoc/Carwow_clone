import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarImage from '../components/CarImage';
import CarCard from '../components/CarCard';
import StarRating from '../components/StarRating';
import Spinner from '../components/Spinner';
import { gbp, statusLabel, isResearch } from '../utils/format';
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

  if (loading) return <Spinner label="Loading therapy…" />;
  if (notFound || !car)
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Therapy not found</h1>
        <Link to="/browse" className="btn-primary mt-6">
          Back to browse
        </Link>
      </div>
    );

  const saved = isSaved(car.id);
  const onSave = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/therapies/${car.id}` } });
      return;
    }
    await toggle(car.id).catch(() => {});
  };

  const specs = [
    { label: 'Cell source', value: car.fuel_type },
    { label: 'Delivery route', value: car.transmission },
    { label: 'Category', value: car.body_type },
    { label: 'Offered since', value: String(car.year) },
    { label: 'Treatment setting', value: car.color || '—' },
    { label: 'Cell source detail', value: car.engine || '—' },
    { label: 'Reported success', value: car.power_bhp ? `${car.power_bhp}%` : '—' },
    { label: 'Typical sessions', value: car.zero_to_sixty ? String(car.zero_to_sixty) : '—' },
    { label: 'Recovery', value: car.top_speed ? `${car.top_speed} days` : '—' },
    { label: 'Follow-up', value: car.economy_mpg ? `${car.economy_mpg} months` : '—' },
    { label: 'Cell dose', value: car.seats ? `${car.seats}M cells` : '—' },
    {
      label: 'Trial phase',
      value: car.condition === 'new' || car.doors === 4 ? 'Established' : `Phase ${car.doors}`,
    },
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

            <h3 className="mt-6 font-display text-lg font-bold text-ink-900">Clinical details</h3>
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
              <span
                className={`chip ${
                  isResearch(car.condition) ? 'bg-clay-500 text-white' : 'bg-clay-50 text-clay-700'
                }`}
              >
                {statusLabel(car.condition)}
              </span>
              <StarRating rating={car.rating} count={car.review_count} />
            </div>

            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink-900">
              {car.make} {car.model}
            </h1>
            {car.trim && <p className="text-ink-700/70">Protocol: {car.trim}</p>}

            {isResearch(car.condition) && (
              <p className="mt-2 text-sm text-clay-700">
                Investigational — offered within clinical-trial settings.
              </p>
            )}

            <div className="mt-5 rounded-2xl bg-cream-200 p-5">
              <p className="text-sm text-ink-700/60">Treatment cost</p>
              <p className="font-display text-4xl font-extrabold text-ink-900">{gbp(car.price)}</p>
              <p className="mt-1 text-sm text-ink-700/70">
                Financing from{' '}
                <span className="font-bold text-clay-600">{gbp(car.monthly_price)}/mo</span>
              </p>
            </div>

            <Link to="/consultation" className="btn-primary mt-4 block w-full py-3.5 text-center">
              Book a consultation
            </Link>
            <button onClick={onSave} className="btn-outline mt-2 w-full py-3.5">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill={saved ? '#DC2626' : 'none'}
                stroke={saved ? '#DC2626' : 'currentColor'}
                strokeWidth="2"
              >
                <path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 2 4.9 5.3 4.9c2 0 3.4 1.1 4.2 2.4h.9c.8-1.3 2.2-2.4 4.2-2.4 3.3 0 5 3.5 3.3 6.9C19.5 16.4 12 21 12 21z" />
              </svg>
              {saved ? 'Saved' : 'Save therapy'}
            </button>

            <div className="mt-5 space-y-2 text-sm text-ink-700/70">
              <p className="flex items-center gap-2">
                <Check /> Consultation with a specialist
              </p>
              <p className="flex items-center gap-2">
                <Check /> Transparent, itemised pricing
              </p>
              <p className="flex items-center gap-2">
                <Check /> Accredited, research-led clinics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Related therapies */}
      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-extrabold text-ink-900">Related therapies</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-sm italic text-ink-700/50">
        Illustrative demo — not medical advice; figures are sample data.
      </p>
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
