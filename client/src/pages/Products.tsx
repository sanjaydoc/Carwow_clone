import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Car } from '../types';
import { PRODUCTS, type ProductStatus, therapiesForProduct } from '../data/products';
import { gbp } from '../utils/format';

const STATUS_STYLE: Record<ProductStatus, string> = {
  Approved: 'bg-green-50 text-green-700 ring-green-200',
  Device: 'bg-blue-50 text-blue-700 ring-blue-200',
  'Tissue graft': 'bg-teal-50 text-teal-700 ring-teal-200',
  Investigational: 'bg-amber-50 text-amber-700 ring-amber-200',
  Research: 'bg-slate-100 text-slate-600 ring-slate-200',
  Compounded: 'bg-violet-50 text-violet-700 ring-violet-200',
};
const STATUS_ORDER: ProductStatus[] = ['Approved', 'Device', 'Tissue graft', 'Investigational', 'Compounded', 'Research'];

export default function Products() {
  const [cars, setCars] = useState<Car[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ProductStatus | 'all'>('all');

  useEffect(() => {
    api.getCars({ limit: 300 }).then(({ cars }) => setCars(cars));
  }, []);

  // Build {product, therapies} for products actually used by ≥1 therapy.
  const groups = useMemo(() => {
    return PRODUCTS.map((p) => ({ product: p, therapies: therapiesForProduct(p, cars) }))
      .filter((g) => g.therapies.length > 0)
      .sort((a, b) =>
        STATUS_ORDER.indexOf(a.product.status) - STATUS_ORDER.indexOf(b.product.status) ||
        b.therapies.length - a.therapies.length,
      );
  }, [cars]);

  const filtered = groups.filter((g) => {
    if (status !== 'all' && g.product.status !== status) return false;
    if (!q.trim()) return true;
    const hay = `${g.product.name} ${g.product.supplier} ${g.product.category} ${g.product.country}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase()) || g.therapies.some((t) => t.model.toLowerCase().includes(q.trim().toLowerCase()));
  });

  const statuses = useMemo(
    () => Array.from(new Set(groups.map((g) => g.product.status))).sort(
      (a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b)),
    [groups],
  );

  return (
    <div className="bg-cream-100">
      <div className="container-x py-8">
        {/* header */}
        <div className="max-w-3xl">
          <span className="chip bg-clay-100 text-clay-700">Product Catalogue</span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
            The products behind every therapy
          </h1>
          <p className="mt-2 text-sm text-ink-700/70 sm:text-base">
            Each StemCells Protocol therapy is delivered with a defined biologic product or cell line.
            Approved products are named where they exist; investigational, research-grade and compounded
            items are labelled honestly. Illustrative demo data — not a treatment offer.
          </p>
        </div>

        {/* controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            id="product-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product, supplier or therapy…"
            className="min-w-[240px] flex-1 rounded-full border border-cream-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-clay-400"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatus('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                status === 'all' ? 'bg-clay-500 text-white ring-clay-500' : 'bg-white text-ink-700 ring-cream-300'
              }`}
            >
              All ({groups.length})
            </button>
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                  status === s ? `${STATUS_STYLE[s]} ring-2` : 'bg-white text-ink-700 ring-cream-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* product cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map(({ product, therapies }) => (
            <div key={product.name} className="rounded-2xl border border-cream-300 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink-900">{product.name}</h2>
                  <p className="mt-0.5 text-sm text-ink-700/70">
                    {product.supplier} · {product.country}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLE[product.status]}`}>
                  {product.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip bg-cream-200 text-ink-700">{product.category}</span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-700/80">{product.note}</p>

              <div className="mt-4 border-t border-cream-300 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">
                  Used in {therapies.length} therap{therapies.length === 1 ? 'y' : 'ies'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {therapies.map((t) => (
                    <Link
                      key={t.id}
                      to={`/therapies/${t.id}`}
                      className="rounded-full bg-clay-50 px-2.5 py-1 text-[12px] font-medium text-clay-700 transition hover:bg-clay-100"
                      title={`${t.make} · ${gbp(t.price)}`}
                    >
                      {t.model}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-10 text-center text-sm text-ink-700/60">No products match your search.</p>
        )}

        <p className="mt-10 text-center text-xs text-ink-700/50">
          ⚕️ Illustrative portfolio data. Named products belong to their respective manufacturers; listing
          here is for information only and is not an endorsement, affiliation, or offer of treatment.
        </p>
      </div>
    </div>
  );
}
