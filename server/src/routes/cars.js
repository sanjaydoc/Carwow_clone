import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

const SORTS = {
  relevance: 'rating DESC, review_count DESC',
  price_asc: 'price ASC',
  price_desc: 'price DESC',
  monthly_asc: 'monthly_price ASC',
  year_desc: 'year DESC',
  rating_desc: 'rating DESC',
  mileage_asc: 'mileage ASC',
};

// GET /api/cars — list with filtering, sorting and pagination
router.get('/', (req, res) => {
  const {
    search, make, body_type, fuel_type, transmission, condition,
    min_price, max_price, min_year, sort = 'relevance',
    page = '1', limit = '12',
  } = req.query;

  const where = [];
  const params = {};

  if (search) {
    where.push('(make LIKE @search OR model LIKE @search OR trim LIKE @search)');
    params.search = `%${search}%`;
  }
  if (make) { where.push('make = @make'); params.make = make; }
  if (body_type) { where.push('body_type = @body_type'); params.body_type = body_type; }
  if (fuel_type) { where.push('fuel_type = @fuel_type'); params.fuel_type = fuel_type; }
  if (transmission) { where.push('transmission = @transmission'); params.transmission = transmission; }
  if (condition) { where.push('condition = @condition'); params.condition = condition; }
  if (min_price) { where.push('price >= @min_price'); params.min_price = Number(min_price); }
  if (max_price) { where.push('price <= @max_price'); params.max_price = Number(max_price); }
  if (min_year) { where.push('year >= @min_year'); params.min_year = Number(min_year); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = SORTS[sort] || SORTS.relevance;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(48, Math.max(1, Number(limit) || 12));
  const offset = (pageNum - 1) * perPage;

  const total = db.prepare(`SELECT COUNT(*) AS n FROM cars ${whereSql}`).get(params).n;
  const rows = db
    .prepare(`SELECT * FROM cars ${whereSql} ORDER BY ${orderSql} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: perPage, offset });

  res.json({
    cars: rows,
    pagination: { page: pageNum, limit: perPage, total, pages: Math.ceil(total / perPage) },
  });
});

// GET /api/cars/filters — distinct values to build filter UI
router.get('/filters', (_req, res) => {
  const distinct = (col) =>
    db.prepare(`SELECT DISTINCT ${col} AS v FROM cars ORDER BY v`).all().map((r) => r.v);
  const priceRange = db.prepare('SELECT MIN(price) AS min, MAX(price) AS max FROM cars').get();
  res.json({
    makes: distinct('make'),
    body_types: distinct('body_type'),
    fuel_types: distinct('fuel_type'),
    transmissions: distinct('transmission'),
    conditions: distinct('condition'),
    price: priceRange,
  });
});

// GET /api/cars/:id
router.get('/:id', (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id = ?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Car not found' });

  const similar = db
    .prepare(
      `SELECT * FROM cars WHERE id != @id AND (body_type = @body OR make = @make)
       ORDER BY ABS(price - @price) LIMIT 4`
    )
    .all({ id: car.id, body: car.body_type, make: car.make, price: car.price });

  res.json({ car, similar });
});

export default router;
