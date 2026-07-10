interface Props {
  rating: number;
  count?: number;
  size?: number;
}

export default function StarRating({ rating, count, size = 16 }: Props) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" aria-label={`Rated ${rating} out of 5`}>
        {stars.map((s) => {
          const fill = Math.max(0, Math.min(1, rating - (s - 1)));
          return (
            <span key={s} className="relative inline-block" style={{ width: size, height: size }}>
              <Star size={size} className="text-ink-900/15" />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star size={size} className="text-clay-500" />
              </span>
            </span>
          );
        })}
      </div>
      <span className="text-sm font-semibold text-ink-800">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-sm text-ink-700/60">({count})</span>}
    </div>
  );
}

function Star({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
    </svg>
  );
}
