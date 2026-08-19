import { Router } from 'express';
import db from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Partner specialist clinics (fictional) that return indicative quotes.
const CLINICS = [
  'Regenix Clinic', 'CellRenew Centre', 'Vitalis Regenerative', 'NovaStem Institute',
  'Orthobiologics UK', 'Meridian Cell Therapy', 'Albion Stem Centre', 'Helix Regenerative',
  'Pioneer Cell Clinic', 'Aeon Longevity Clinic',
];

// Urgency of the enquiry nudges the indicative starting estimate.
const CONDITION_FACTOR = { excellent: 0.9, good: 1.0, fair: 1.08, poor: 1.18 };

// A lightweight, illustrative indicative-cost model (NOT a real quote).
function estimateValue({ condition }) {
  let value = 9000;
  value *= CONDITION_FACTOR[condition] ?? 1.0;
  return Math.max(500, Math.round(value / 50) * 50);
}

function makeOffers(submissionId, estimate) {
  const shuffled = [...CLINICS].sort(() => Math.random() - 0.5).slice(0, 4);
  return shuffled.map((name, i) => {
    // Indicative quotes cluster around the estimate, best one slightly below.
    const spread = 0.94 + Math.random() * 0.12; // 0.94 – 1.06
    const bump = i === 0 ? -0.03 : 0;
    const amount = Math.round((estimate * (spread + bump)) / 25) * 25;
    return {
      submission_id: submissionId,
      dealer_name: name,
      dealer_rating: Math.round((4.2 + Math.random() * 0.7) * 10) / 10,
      distance_mi: 2 + Math.floor(Math.random() * 40),
      offer_amount: amount,
    };
  });
}

// POST /api/sell — submit a car for valuation, returns offers
router.post('/', optionalAuth, (req, res) => {
  const { reg, make, model, year, mileage, condition = 'good', name, email } = req.body || {};
  if (!make || !model || !year || mileage == null || !name || !email) {
    return res
      .status(400)
      .json({ error: 'make, model, year, mileage, name and email are required' });
  }

  const estimate = estimateValue({ year, mileage, condition });
  const userId = req.user?.id ?? null;

  const info = db
    .prepare(
      `INSERT INTO sell_submissions
        (user_id, reg, make, model, year, mileage, condition, seller_name, seller_email, estimated_value)
       VALUES (@user_id, @reg, @make, @model, @year, @mileage, @condition, @seller_name, @seller_email, @estimated_value)`
    )
    .run({
      user_id: userId,
      reg: reg || null,
      make,
      model,
      year: Number(year),
      mileage: Number(mileage),
      condition,
      seller_name: name,
      seller_email: email,
      estimated_value: estimate,
    });

  const submissionId = info.lastInsertRowid;
  const offers = makeOffers(submissionId, estimate);

  const insertOffer = db.prepare(
    `INSERT INTO dealer_offers (submission_id, dealer_name, dealer_rating, distance_mi, offer_amount)
     VALUES (@submission_id, @dealer_name, @dealer_rating, @distance_mi, @offer_amount)`
  );
  const tx = db.transaction((rows) => rows.forEach((r) => insertOffer.run(r)));
  tx(offers);

  const savedOffers = db
    .prepare('SELECT * FROM dealer_offers WHERE submission_id = ? ORDER BY offer_amount DESC')
    .all(submissionId);

  res.status(201).json({
    submission: { id: submissionId, make, model, year: Number(year), mileage: Number(mileage), estimated_value: estimate },
    offers: savedOffers,
  });
});

// GET /api/sell/:id — retrieve a submission and its offers
router.get('/:id', (req, res) => {
  const submission = db.prepare('SELECT * FROM sell_submissions WHERE id = ?').get(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  const offers = db
    .prepare('SELECT * FROM dealer_offers WHERE submission_id = ? ORDER BY offer_amount DESC')
    .all(submission.id);
  res.json({ submission, offers });
});

export default router;
