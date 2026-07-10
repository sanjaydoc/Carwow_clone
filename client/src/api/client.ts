import type { Car, DealerOffer, Filters, Pagination, SellResult, User } from '../types';
import { mockApi } from './mockApi';

const BASE = '/api';

let authToken: string | null = localStorage.getItem('token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export interface CarQuery {
  search?: string;
  make?: string;
  body_type?: string;
  fuel_type?: string;
  transmission?: string;
  condition?: string;
  min_price?: number;
  max_price?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

const httpApi = {
  // Cars
  getCars: (q: CarQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
    });
    return request<{ cars: Car[]; pagination: Pagination }>(`/cars?${params.toString()}`);
  },
  getCar: (id: number | string) => request<{ car: Car; similar: Car[] }>(`/cars/${id}`),
  getFilters: () => request<Filters>('/cars/filters'),

  // Auth
  register: (data: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<{ user: User }>('/auth/me'),

  // Sell
  sell: (data: {
    reg?: string;
    make: string;
    model: string;
    year: number;
    mileage: number;
    condition: string;
    name: string;
    email: string;
  }) => request<SellResult>('/sell', { method: 'POST', body: JSON.stringify(data) }),
  getSubmission: (id: number | string) =>
    request<{ submission: SellResult['submission']; offers: DealerOffer[] }>(`/sell/${id}`),

  // Saved
  getSaved: () => request<{ cars: Car[] }>('/saved'),
  getSavedIds: () => request<{ ids: number[] }>('/saved/ids'),
  saveCar: (id: number) => request<{ saved: boolean }>(`/saved/${id}`, { method: 'POST' }),
  unsaveCar: (id: number) => request<{ saved: boolean }>(`/saved/${id}`, { method: 'DELETE' }),
};

// In the static / GitHub Pages build there is no backend, so route every call
// through the in-browser mock API instead of `fetch`.
const isStatic = import.meta.env.VITE_STATIC === 'true';

export const api = isStatic ? mockApi : httpApi;
