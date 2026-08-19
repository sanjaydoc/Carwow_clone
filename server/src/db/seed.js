import db, { initSchema } from './index.js';
import { therapies } from './therapies.js';

initSchema();

const insert = db.prepare(`
  INSERT INTO cars (
    make, model, trim, year, price, monthly_price, body_type, fuel_type, transmission,
    mileage, color, condition, seats, doors, engine, power_bhp, zero_to_sixty, top_speed,
    economy_mpg, rating, review_count, accent, description
  ) VALUES (
    @make, @model, @trim, @year, @price, @monthly_price, @body_type, @fuel_type, @transmission,
    @mileage, @color, @condition, @seats, @doors, @engine, @power_bhp, @zero_to_sixty, @top_speed,
    @economy_mpg, @rating, @review_count, @accent, @description
  )
`);

const run = db.transaction((rows) => {
  db.prepare('DELETE FROM cars').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'cars'").run();
  for (const row of rows) insert.run(row);
});

run(therapies);

console.log(`✅ Seeded ${therapies.length} therapies into the database.`);
process.exit(0);
