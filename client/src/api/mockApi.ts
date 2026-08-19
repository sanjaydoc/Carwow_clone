// A fully client-side implementation of the API surface, used for the static
// GitHub Pages build (no backend). Data comes from the embedded catalogue and
// user state is persisted in localStorage. This lets the whole app run in the
// browser as an interactive demo.
import type { Car, DealerOffer, Filters, Pagination, SellResult, User } from '../types';
import type { CarQuery } from './client';
import { CARS } from './staticData';

const LS = {
  users: 'demo_users',
  session: 'demo_session',
  saved: 'demo_saved',
  submissions: 'demo_submissions',
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

const delay = <T,>(value: T, ms = 180): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

// ---- helpers ---------------------------------------------------------------

interface StoredUser extends User {
  password: string;
}

function currentUser(): User | null {
  const session = read<{ email: string } | null>(LS.session, null);
  if (!session) return null;
  const users = read<StoredUser[]>(LS.users, []);
  const u = users.find((x) => x.email === session.email);
  return u ? { id: u.id, name: u.name, email: u.email, created_at: u.created_at } : null;
}

const SORTS: Record<string, (a: Car, b: Car) => number> = {
  relevance: (a, b) => b.rating - a.rating || b.review_count - a.review_count,
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  monthly_asc: (a, b) => a.monthly_price - b.monthly_price,
  year_desc: (a, b) => b.year - a.year,
  rating_desc: (a, b) => b.rating - a.rating,
  mileage_asc: (a, b) => a.mileage - b.mileage,
};

const CONDITION_FACTOR: Record<string, number> = { excellent: 0.9, good: 1.0, fair: 1.08, poor: 1.18 };
const CLINICS = [
  'Regenix Clinic', 'CellRenew Centre', 'Vitalis Regenerative', 'NovaStem Institute',
  'Orthobiologics UK', 'Meridian Cell Therapy', 'Albion Stem Centre', 'Helix Regenerative',
  'Pioneer Cell Clinic', 'Aeon Longevity Clinic',
];

// Illustrative indicative-cost model (NOT a real quote).
function estimateValue(_year: number, _mileage: number, condition: string): number {
  let value = 9000;
  value *= CONDITION_FACTOR[condition] ?? 1;
  return Math.max(500, Math.round(value / 50) * 50);
}

// ---- the mock api ----------------------------------------------------------

export const mockApi = {
  getCars(q: CarQuery = {}): Promise<{ cars: Car[]; pagination: Pagination }> {
    let list = CARS.slice();
    if (q.search) {
      const s = q.search.toLowerCase();
      list = list.filter((c) =>
        `${c.make} ${c.model} ${c.trim ?? ''}`.toLowerCase().includes(s)
      );
    }
    if (q.make) list = list.filter((c) => c.make === q.make);
    if (q.body_type) list = list.filter((c) => c.body_type === q.body_type);
    if (q.fuel_type) list = list.filter((c) => c.fuel_type === q.fuel_type);
    if (q.transmission) list = list.filter((c) => c.transmission === q.transmission);
    if (q.condition) list = list.filter((c) => c.condition === q.condition);
    if (q.min_price != null) list = list.filter((c) => c.price >= q.min_price!);
    if (q.max_price != null) list = list.filter((c) => c.price <= q.max_price!);

    list.sort(SORTS[q.sort ?? 'relevance'] ?? SORTS.relevance);

    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(48, Math.max(1, q.limit ?? 12));
    const total = list.length;
    const start = (page - 1) * limit;
    const cars = list.slice(start, start + limit);
    return delay({ cars, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  },

  getCar(id: number | string): Promise<{ car: Car; similar: Car[] }> {
    const car = CARS.find((c) => c.id === Number(id));
    if (!car) return Promise.reject(new Error('Car not found'));
    const similar = CARS.filter((c) => c.id !== car.id && (c.body_type === car.body_type || c.make === car.make))
      .sort((a, b) => Math.abs(a.price - car.price) - Math.abs(b.price - car.price))
      .slice(0, 4);
    return delay({ car, similar });
  },

  getFilters(): Promise<Filters> {
    const distinct = (key: keyof Car) =>
      [...new Set(CARS.map((c) => c[key] as string))].sort();
    const prices = CARS.map((c) => c.price);
    return delay({
      makes: distinct('make'),
      body_types: distinct('body_type'),
      fuel_types: distinct('fuel_type'),
      transmissions: distinct('transmission'),
      conditions: distinct('condition'),
      price: { min: Math.min(...prices), max: Math.max(...prices) },
    });
  },

  register(data: { name: string; email: string; password: string }): Promise<{ token: string; user: User }> {
    const users = read<StoredUser[]>(LS.users, []);
    const email = data.email.toLowerCase();
    if (users.some((u) => u.email === email)) {
      return Promise.reject(new Error('An account with that email already exists'));
    }
    if (data.password.length < 6) {
      return Promise.reject(new Error('Password must be at least 6 characters'));
    }
    const user: StoredUser = {
      id: users.length + 1,
      name: data.name.trim(),
      email,
      password: data.password,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    write(LS.users, users);
    write(LS.session, { email });
    return delay({ token: `demo-${email}`, user: { id: user.id, name: user.name, email, created_at: user.created_at } });
  },

  login(data: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const users = read<StoredUser[]>(LS.users, []);
    const email = data.email.toLowerCase();
    const user = users.find((u) => u.email === email);
    if (!user || user.password !== data.password) {
      return Promise.reject(new Error('Invalid email or password'));
    }
    write(LS.session, { email });
    return delay({ token: `demo-${email}`, user: { id: user.id, name: user.name, email, created_at: user.created_at } });
  },

  me(): Promise<{ user: User }> {
    const user = currentUser();
    if (!user) return Promise.reject(new Error('Authentication required'));
    return delay({ user });
  },

  sell(data: {
    reg?: string; make: string; model: string; year: number;
    mileage: number; condition: string; name: string; email: string;
  }): Promise<SellResult> {
    const estimate = estimateValue(Number(data.year), Number(data.mileage), data.condition);
    const clinics = [...CLINICS].sort(() => Math.random() - 0.5).slice(0, 4);
    const submissions = read<SellResult[]>(LS.submissions, []);
    const id = submissions.length + 1;
    const offers: DealerOffer[] = clinics
      .map((name, i) => {
        const spread = 0.94 + Math.random() * 0.12 + (i === 0 ? -0.03 : 0);
        return {
          id: id * 100 + i,
          submission_id: id,
          dealer_name: name,
          dealer_rating: Math.round((4.2 + Math.random() * 0.7) * 10) / 10,
          distance_mi: 2 + Math.floor(Math.random() * 40),
          offer_amount: Math.round((estimate * spread) / 25) * 25,
        };
      })
      .sort((a, b) => b.offer_amount - a.offer_amount);

    const result: SellResult = {
      submission: {
        id, make: data.make, model: data.model,
        year: Number(data.year), mileage: Number(data.mileage), estimated_value: estimate,
      },
      offers,
    };
    submissions.push(result);
    write(LS.submissions, submissions);
    return delay(result, 700);
  },

  getSubmission(id: number | string): Promise<{ submission: SellResult['submission']; offers: DealerOffer[] }> {
    const submissions = read<SellResult[]>(LS.submissions, []);
    const found = submissions.find((s) => s.submission.id === Number(id));
    if (!found) return Promise.reject(new Error('Submission not found'));
    return delay({ submission: found.submission, offers: found.offers });
  },

  getSaved(): Promise<{ cars: Car[] }> {
    const ids = read<number[]>(LS.saved, []);
    return delay({ cars: CARS.filter((c) => ids.includes(c.id)) });
  },

  getSavedIds(): Promise<{ ids: number[] }> {
    return delay({ ids: read<number[]>(LS.saved, []) });
  },

  saveCar(id: number): Promise<{ saved: boolean }> {
    const ids = read<number[]>(LS.saved, []);
    if (!ids.includes(id)) ids.push(id);
    write(LS.saved, ids);
    return delay({ saved: true });
  },

  unsaveCar(id: number): Promise<{ saved: boolean }> {
    const ids = read<number[]>(LS.saved, []).filter((x) => x !== id);
    write(LS.saved, ids);
    return delay({ saved: false });
  },
};
