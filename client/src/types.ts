export interface Car {
  id: number;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  price: number;
  monthly_price: number;
  body_type: string;
  fuel_type: string;
  transmission: string;
  mileage: number;
  color: string | null;
  condition: 'new' | 'used';
  seats: number | null;
  doors: number | null;
  engine: string | null;
  power_bhp: number | null;
  zero_to_sixty: number | null;
  top_speed: number | null;
  economy_mpg: number | null;
  rating: number;
  review_count: number;
  accent: string;
  description: string | null;
  saved_at?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface Filters {
  makes: string[];
  body_types: string[];
  fuel_types: string[];
  transmissions: string[];
  conditions: string[];
  price: { min: number; max: number };
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface DealerOffer {
  id: number;
  submission_id: number;
  dealer_name: string;
  dealer_rating: number;
  distance_mi: number;
  offer_amount: number;
}

export interface SellResult {
  submission: {
    id: number;
    make: string;
    model: string;
    year: number;
    mileage: number;
    estimated_value: number;
  };
  offers: DealerOffer[];
}
