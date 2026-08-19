import { Link, useNavigate } from 'react-router-dom';
import type { Car } from '../types';
import { gbp, statusLabel, isResearch } from '../utils/format';
import CarImage from './CarImage';
import StarRating from './StarRating';
import { useSaved } from '../context/SavedContext';
import { useAuth } from '../context/AuthContext';

export default function CarCard({ car }: { car: Car }) {
  const { user } = useAuth();
  const { isSaved, toggle } = useSaved();
  const navigate = useNavigate();
  const saved = isSaved(car.id);

  const onSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: `/therapies/${car.id}` } });
      return;
    }
    try {
      await toggle(car.id);
    } catch {
      /* ignore */
    }
  };

  return (
    <Link
      to={`/therapies/${car.id}`}
      className="group card overflow-hidden transition hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative">
        <CarImage
          accent={car.accent}
          bodyType={car.body_type}
          make={car.make}
          model={car.model}
          year={car.year}
          className="h-44 w-full"
        />
        <span
          className={`absolute left-3 top-3 chip backdrop-blur ${
            isResearch(car.condition) ? 'bg-clay-500/90 text-white' : 'bg-white/90'
          }`}
        >
          {statusLabel(car.condition)}
        </span>
        <button
          onClick={onSave}
          aria-label={saved ? 'Remove from saved' : 'Save therapy'}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 ${
            saved ? 'text-clay-600' : 'text-ink-700 hover:text-clay-600'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 2 4.9 5.3 4.9c2 0 3.4 1.1 4.2 2.4h.9c.8-1.3 2.2-2.4 4.2-2.4 3.3 0 5 3.5 3.3 6.9C19.5 16.4 12 21 12 21z" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold leading-tight text-ink-900">
              {car.make} {car.model}
            </h3>
            <p className="text-sm text-ink-700/70">{car.trim}</p>
          </div>
        </div>

        <div className="mt-2">
          <StarRating rating={car.rating} count={car.review_count} size={14} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip">{car.body_type}</span>
          <span className="chip">{car.fuel_type}</span>
          <span className="chip">{car.transmission}</span>
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-cream-300 pt-3">
          <div>
            <p className="font-display text-xl font-extrabold text-ink-900">{gbp(car.price)}</p>
            <p className="text-xs text-ink-700/60">or {gbp(car.monthly_price)}/mo</p>
          </div>
          <span className="btn-primary px-4 py-2 text-sm group-hover:bg-clay-600">View</span>
        </div>
      </div>
    </Link>
  );
}
