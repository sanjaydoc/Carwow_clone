import { CategoryIcon } from './icons';

// Therapy-category glyph (MSC / HSC / iPSC / Exosome / Immune cell / PRP).
// Prop kept as `type` since it maps to the body_type/category field.
export default function CarTypeIcon({ type, className = '' }: { type: string; className?: string }) {
  return <CategoryIcon name={type} className={className} strokeWidth={2} />;
}
