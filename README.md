# Carwow Clone 🚗

A full-stack **car marketplace** inspired by [Carwow](https://www.carwow.co.uk) — browse, buy, sell and compare cars. Built with **React + Vite + Tailwind** on the front end and a **Node.js (Express) + SQLite** API, served together from a **single server with a single command**.

> Styled with a warm **orange (Claude-inspired)** theme and a fully **mobile-friendly** layout, including a native-style bottom navigation bar.

---

## ✨ Features

- **Home** – bold hero with a tabbed *Find a car / Sell my car* search card, category chips, browse-by-budget / car-type / manufacturer sections.
- **Browse** – search, filter (make, body type, fuel, transmission, condition, max price), sort and paginate. Filters sync to the URL.
- **Car detail** – full specs, finance pricing, save button and “you might also like” similar cars.
- **Compare** – put up to 3 cars side by side; best value in each row is highlighted.
- **Sell my car** – enter your car’s details to get an instant valuation and competing **dealer offers**.
- **Accounts** – register / log in with JWT auth (passwords hashed with bcrypt).
- **Saved cars** – heart any car to save it to your account.
- **Responsive** – mobile-first, with a fixed bottom nav bar and a sticky “sell your car” banner on small screens.

## 🛠 Tech stack

| Layer      | Tech                                             |
| ---------- | ------------------------------------------------ |
| Front end  | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Back end   | Node.js, Express                                 |
| Database   | SQLite (via `better-sqlite3`)                    |
| Auth       | JWT (`jsonwebtoken`) + `bcryptjs`                |

## 🚀 Getting started

Requires **Node.js 18+**.

```bash
# 1. Install all dependencies (root, server and client)
npm install

# 2. Seed the database with sample cars
npm run seed

# 3. Build the client and start the single server
npm start
```

Then open **http://localhost:4000** — the same server serves the API **and** the built React app.

### One server, one command

`npm start` runs `npm run build` (builds the React app to `client/dist`) and then starts the Express server, which serves both the static front end and the `/api` routes on **port 4000**. No second dev server, no proxy needed in production.

### Optional: hot-reloading dev mode

If you want live reload while developing, `npm run dev` runs the API (with `--watch`) and the Vite dev server together, with `/api` proxied to the backend:

```bash
npm run dev
# API:    http://localhost:4000
# Client: http://localhost:5173
```

## 📡 API overview

| Method | Endpoint                | Description                              |
| ------ | ----------------------- | ---------------------------------------- |
| GET    | `/api/health`           | Health check                             |
| GET    | `/api/cars`             | List cars (filter/sort/paginate)         |
| GET    | `/api/cars/filters`     | Available filter values                  |
| GET    | `/api/cars/:id`         | Single car + similar cars                |
| POST   | `/api/auth/register`    | Create an account                        |
| POST   | `/api/auth/login`       | Log in                                   |
| GET    | `/api/auth/me`          | Current user (auth)                      |
| POST   | `/api/sell`             | Submit a car → valuation + dealer offers |
| GET    | `/api/sell/:id`         | Retrieve a submission + offers           |
| GET    | `/api/saved`            | Saved cars (auth)                        |
| POST   | `/api/saved/:carId`     | Save a car (auth)                        |
| DELETE | `/api/saved/:carId`     | Un-save a car (auth)                     |

## 📁 Project structure

```
Carwow_clone/
├── package.json          # root scripts (single-command start)
├── server/               # Express + SQLite API
│   └── src/
│       ├── index.js      # server entry (also serves client/dist)
│       ├── db/           # schema + seed data
│       ├── middleware/   # JWT auth
│       └── routes/       # cars, auth, sell, saved
└── client/               # React + Vite + Tailwind app
    └── src/
        ├── pages/        # Home, Browse, CarDetail, Compare, Sell, …
        ├── components/   # Navbar, MobileNav, CarCard, …
        ├── context/      # Auth + Saved providers
        └── api/          # typed API client
```

## ⚙️ Configuration

The server reads optional environment variables (see `server/.env.example`):

- `PORT` – server port (default `4000`)
- `JWT_SECRET` – secret for signing tokens (set this in production!)
- `CLIENT_ORIGIN` – allowed CORS origin for dev

## 📝 Notes

This is a demo project. Car data, valuations and dealer offers are generated from sample data and simple models — they’re for illustration only.
