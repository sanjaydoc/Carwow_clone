import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All routes here require authentication.
router.use(requireAuth);

// GET /api/saved — the current user's saved cars
router.get('/', (req, res) => {
  const cars = db
    .prepare(
      `SELECT c.*, s.created_at AS saved_at
       FROM saved_cars s JOIN cars c ON c.id = s.car_id
       WHERE s.user_id = ? ORDER BY s.created_at DESC`
    )
    .all(req.user.id);
  res.json({ cars });
});

// GET /api/saved/ids — just the ids, for toggling UI state
router.get('/ids', (req, res) => {
  const ids = db
    .prepare('SELECT car_id FROM saved_cars WHERE user_id = ?')
    .all(req.user.id)
    .map((r) => r.car_id);
  res.json({ ids });
});

// POST /api/saved/:carId
router.post('/:carId', (req, res) => {
  const car = db.prepare('SELECT id FROM cars WHERE id = ?').get(req.params.carId);
  if (!car) return res.status(404).json({ error: 'Car not found' });
  db.prepare('INSERT OR IGNORE INTO saved_cars (user_id, car_id) VALUES (?, ?)').run(
    req.user.id,
    car.id
  );
  res.status(201).json({ saved: true, car_id: car.id });
});

// DELETE /api/saved/:carId
router.delete('/:carId', (req, res) => {
  db.prepare('DELETE FROM saved_cars WHERE user_id = ? AND car_id = ?').run(
    req.user.id,
    req.params.carId
  );
  res.json({ saved: false, car_id: Number(req.params.carId) });
});

export default router;
