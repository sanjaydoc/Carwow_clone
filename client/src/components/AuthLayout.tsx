import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import CarImage from './CarImage';

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="container-x grid min-h-[80vh] items-center gap-10 py-10 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2">
          <span className="font-display text-2xl font-extrabold text-ink-900">
            StemCells <span className="text-clay-500">Protocol</span>
          </span>
        </Link>
        <h1 className="font-display text-3xl font-extrabold text-ink-900">{title}</h1>
        <p className="mt-2 text-ink-700/70">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>

      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-10 text-white">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-clay-500/30 blur-3xl" />
          <CarImage
            accent="#4285F4"
            bodyType="MSC"
            make="Age Rejuvenation"
            model="Regenerative Therapy"
            year={2024}
            className="aspect-[16/10] w-full rounded-2xl bg-white"
          />
          <h2 className="mt-8 font-display text-2xl font-extrabold">
            The considered way to explore regenerative care
          </h2>
          <p className="mt-2 text-white/70">
            Shortlist therapies, book expert consultations and manage everything in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
