import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import CarCard from '../components/CarCard';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import { useSaved } from '../context/SavedContext';

export default function Saved() {
  const { savedIds } = useSaved();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSaved()
      .then(({ cars }) => setCars(cars))
      .finally(() => setLoading(false));
  }, []);

  // Reflect un-saves made from the cards without a refetch.
  const visible = cars.filter((c) => savedIds.has(c.id));

  if (loading) return <Spinner label="Loading your saved therapies…" />;

  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Saved therapies</h1>
      <p className="mt-1 text-ink-700/70">
        {visible.length} {visible.length === 1 ? 'therapy' : 'therapies'} you're keeping an eye on.
      </p>

      {visible.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <span className="icon-tile mx-auto h-16 w-16 text-clay-500"><Icon name="heart" className="h-8 w-8" /></span>
          <h3 className="mt-3 font-display text-xl font-bold">No saved therapies yet</h3>
          <p className="mt-1 text-ink-700/70">
            Tap the heart on any therapy to save it here for later.
          </p>
          <Link to="/browse" className="btn-primary mt-5">
            Browse therapies
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}
