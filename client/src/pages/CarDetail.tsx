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

  const isER100 = /ER-100/i.test(car.model);

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
        / <span className="text-ink-800">{car.model}</span>
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

          {isER100 && (
            <div className="mt-6 card p-6">
              <h2 className="font-display text-xl font-bold text-ink-900">Genome vs. epigenome</h2>
              <p className="mt-2 text-ink-700/80">
                ER-100 works on the <b>epigenome</b>, not the genome — here's the difference, and why that
                matters.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-cream-300 bg-cream-100 p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-clay-100 text-lg">🧬</span>
                    <h3 className="font-display font-bold text-ink-900">Genome</h3>
                  </div>
                  <p className="mt-3 text-sm text-ink-700/80">
                    The full <b>DNA sequence</b> — the actual letters A, T, G, C (~3&nbsp;billion base pairs,
                    ~20,000 genes). It's the <b>hardware</b>: the same in every cell of your body, and largely
                    fixed for life.
                  </p>
                </div>
                <div className="rounded-2xl border border-cream-300 bg-cream-100 p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-clay-100 text-lg">🏷️</span>
                    <h3 className="font-display font-bold text-ink-900">Epigenome</h3>
                  </div>
                  <p className="mt-3 text-sm text-ink-700/80">
                    A layer of <b>chemical marks on top of</b> the DNA (methylation, histone modifications,
                    chromatin). It's the <b>software</b>: it decides which genes are switched <b>on or off</b>,
                    differs between cell types, shifts with age — and is <b>reversible</b>.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-ink-900 p-5 text-white">
                <p className="text-sm">
                  <b className="text-clay-300">The key idea:</b> your genome is identical in every cell — what
                  makes a brain cell different from a skin cell is the <b>epigenome</b> telling each one which
                  genes to use.
                </p>
              </div>

              <h3 className="mt-5 font-display font-bold text-ink-900">Why this matters for ER-100</h3>
              <p className="mt-2 text-ink-700/80">
                As we age, the epigenome gets "noisy" — genes drift on and off incorrectly even though the DNA
                sequence is fine. ER-100's partial reprogramming (OSK: OCT4, SOX2, KLF4) <b>re-writes those
                marks back toward a youthful pattern — without editing a single letter of DNA</b>. It changes
                the <i>settings</i>, not the <i>code</i>, which is the crucial safety point.
              </p>
              <p className="mt-3 text-sm italic text-ink-700/60">
                Think of it as: <b>genome = the piano; epigenome = which keys are played, and how.</b> Ageing
                plays the wrong notes; reprogramming retunes the performance without rebuilding the piano.
              </p>
            </div>
          )}

          {isER100 && (
            <div className="mt-6 card p-6">
              <h2 className="font-display text-xl font-bold text-ink-900">
                Where do OCT4, SOX2 &amp; KLF4 come from?
              </h2>
              <p className="mt-2 text-ink-700/80">
                They are <b>natural human genes already present in every cell</b> — not invented molecules. The
                only "synthetic" part is the gene-therapy system that re-supplies and controls them.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[360px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="text-left text-ink-700/60">
                      <th className="border-b border-cream-300 py-2 pr-4 font-semibold">Factor</th>
                      <th className="border-b border-cream-300 py-2 pr-4 font-semibold">Gene</th>
                      <th className="border-b border-cream-300 py-2 font-semibold">Location</th>
                    </tr>
                  </thead>
                  <tbody className="text-ink-900">
                    <tr>
                      <td className="border-b border-cream-300 py-2 pr-4 font-bold">OCT4</td>
                      <td className="border-b border-cream-300 py-2 pr-4"><i>POU5F1</i></td>
                      <td className="border-b border-cream-300 py-2">Chromosome 6</td>
                    </tr>
                    <tr>
                      <td className="border-b border-cream-300 py-2 pr-4 font-bold">SOX2</td>
                      <td className="border-b border-cream-300 py-2 pr-4"><i>SOX2</i></td>
                      <td className="border-b border-cream-300 py-2">Chromosome 3</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-bold">KLF4</td>
                      <td className="py-2 pr-4"><i>KLF4</i></td>
                      <td className="py-2">Chromosome 9</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-ink-700/70">
                These "switch" genes are highly active in embryonic stem cells and largely <b>switched off</b>{' '}
                in adult cells — the therapy briefly re-awakens the cell's own copies.
              </p>

              <h3 className="mt-5 font-display font-bold text-ink-900">What the therapy actually does</h3>
              <ul className="mt-2 space-y-2 text-ink-700/80">
                <li className="flex gap-2">
                  <span className="text-clay-600">•</span>
                  <span>An <b>AAV gene-therapy vector</b> carries lab-cloned copies of the OSK coding sequences into the target cells.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-clay-600">•</span>
                  <span>The cell reads them and makes the <b>real, natural human OCT4 / SOX2 / KLF4 proteins</b>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-clay-600">•</span>
                  <span>An <b>inducible switch</b> (e.g. doxycycline / "Tet-On") turns them on <b>briefly, then off</b> — a partial, transient reset rather than a full wipe back to a stem cell.</span>
                </li>
              </ul>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-cream-300 bg-cream-100 p-4 text-sm text-ink-700/80">
                  <b className="text-ink-900">Why only three factors?</b> The original cocktail is OSK{' '}
                  <b>+ c-Myc</b>. c-Myc is an <b>oncogene</b> (cancer risk), so ER-100 uses only <b>OSK</b> for
                  safety.
                </div>
                <div className="rounded-2xl border border-cream-300 bg-cream-100 p-4 text-sm text-ink-700/80">
                  <b className="text-ink-900">DNA stays untouched.</b> Because it uses the cell's own
                  machinery, it nudges the epigenetic settings <b>without changing the DNA sequence</b>.
                </div>
              </div>

              <p className="mt-4 text-sm italic text-ink-700/60">
                In short: the factors are natural genes already in your genome; the lab-made construct simply
                re-awakens and controls them for a short, safe window.
              </p>
            </div>
          )}
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

            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-clay-600">{car.make}</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight text-ink-900">
              {car.model}
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
                fill={saved ? '#4285F4' : 'none'}
                stroke={saved ? '#4285F4' : 'currentColor'}
                strokeWidth="2"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
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
