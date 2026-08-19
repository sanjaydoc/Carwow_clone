import { DepartmentIcon } from './icons';

// Department glyph in a soft red badge (replaces the old car-manufacturer logo).
// Prop name kept as `make` since it maps to the department field.
export default function BrandLogo({ make }: { make: string }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-50 text-clay-600">
      <DepartmentIcon name={make} className="h-5 w-5" />
    </span>
  );
}
