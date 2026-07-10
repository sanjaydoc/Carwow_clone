<div align="center">

# 🚗 Carwow Clone

### A full‑stack car marketplace to **browse, buy, sell & compare** cars

*Inspired by [carwow.co.uk](https://www.carwow.co.uk) — rebuilt from scratch with a warm, Claude‑inspired orange theme and a fully mobile‑friendly UI.*

<br/>

[![License: MIT](https://img.shields.io/badge/License-MIT-D97757.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org)

<br/>

![Carwow clone home page](docs/screenshots/home-desktop.png)

</div>

---

## 📋 Table of contents

- [✨ Overview](#-overview)
- [🖼️ Screenshots](#️-screenshots)
- [🧩 Features](#-features)
- [🛠 Tech stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [⚡ Quickstart](#-quickstart)
  - [Prerequisites](#prerequisites)
  - [Windows](#-windows)
  - [macOS](#-macos)
  - [Linux](#-linux)
- [🔥 Development mode](#-development-mode-hot-reload)
- [📡 API reference](#-api-reference)
- [🗂 Project structure](#-project-structure)
- [⚙️ Configuration](#️-configuration)
- [❓ FAQ / Troubleshooting](#-faq--troubleshooting)
- [📝 License](#-license)

---

## ✨ Overview

**Carwow Clone** is a complete car marketplace built as a modern single‑page app on top of a REST API. Shoppers can search and filter a catalogue of new & used cars, read the specs, compare models side‑by‑side, save favourites to their account, and get an instant valuation with **competing dealer offers** when selling their own car.

The whole thing runs from **one server with one command** — the Node/Express backend serves both the `/api` routes **and** the compiled React app on a single port. No separate frontend server, no proxy juggling in production.

> 💡 This is a portfolio / learning project. The car data, valuations and dealer offers are generated from sample data and simple models — they are illustrative, not real.

---

## 🖼️ Screenshots

| Home (desktop) | Car detail |
| :---: | :---: |
| ![Home](docs/screenshots/home-desktop.png) | ![Car detail](docs/screenshots/car-detail.png) |

| Browse & filter | Compare cars |
| :---: | :---: |
| ![Browse](docs/screenshots/browse-desktop.png) | ![Compare](docs/screenshots/compare-desktop.png) |

| Sell → dealer offers | Home (mobile) | Mobile menu |
| :---: | :---: | :---: |
| ![Sell offers](docs/screenshots/sell-offers.png) | ![Home mobile](docs/screenshots/home-mobile.png) | ![Mobile menu](docs/screenshots/mobile-menu.png) |

---

## 🧩 Features

- 🏠 **Home** — bold hero with a tabbed *Find a car / Sell my car* search card, horizontally‑scrollable category chips, and browse‑by‑budget / car‑type / manufacturer sections.
- 🔎 **Browse** — search plus filters (make, body type, fuel, transmission, condition, max price), sorting and pagination. **All filters sync to the URL** so results are shareable.
- 📄 **Car detail** — full specification table, cash & finance pricing, save button, and “you might also like” similar cars.
- ⚖️ **Compare** — put up to **3 cars side by side**; the best value in each row is highlighted.
- 💷 **Sell my car** — enter your car’s details for an instant valuation and a list of **competing dealer offers**, sorted by best price.
- 🔐 **Accounts** — register / log in with JWT auth (passwords hashed with bcrypt).
- ❤️ **Saved cars** — heart any car to save it to your account, with optimistic UI updates.
- 📱 **Mobile‑first** — a native‑style fixed **bottom navigation bar** and a sticky “sell your car” banner on small screens.
- 🎨 **Themed** — a cohesive warm‑orange design system in both light content and dark feature sections.

---

## 🛠 Tech stack

| Layer | Technology |
| ----- | ---------- |
| **Front end** | React 18 · TypeScript · Vite · Tailwind CSS · React Router |
| **Back end** | Node.js · Express |
| **Database** | SQLite (via `better-sqlite3`) |
| **Auth** | JSON Web Tokens (`jsonwebtoken`) · `bcryptjs` |
| **Tooling** | ESLint‑ready TypeScript · single‑command build & serve |

---

## 🏗 Architecture

```text
                      ┌─────────────────────────────────────────┐
                      │           Node.js (Express)             │
   Browser  ───────►  │                                         │
   (React SPA)        │   /api/*   ──►  Route handlers          │
                      │                   │                     │
                      │                   ▼                     │
                      │              better-sqlite3  ──►  SQLite│
                      │                                         │
                      │   /*       ──►  serves client/dist      │
                      └─────────────────────────────────────────┘
                                one server · one port (4000)
```

The React app is compiled to static files in `client/dist`. In production the Express server serves those files for all non‑API routes and handles SPA fallback, so the entire application is delivered from **a single origin**.

---

## ⚡ Quickstart

### Prerequisites

- **[Node.js](https://nodejs.org) 18 or newer** (includes npm) — check with `node -v`
- **Git**

The commands below are identical on every OS thanks to npm scripts. Pick your platform for the exact terminal steps.

<details open>
<summary><b>🪟 Windows</b></summary>

Use **PowerShell** or **Command Prompt** (install Node via the [official installer](https://nodejs.org) or `winget install OpenJS.NodeJS.LTS`).

```powershell
# 1. Clone the repo
git clone https://github.com/sanjaydoc/Carwow_clone.git
cd Carwow_clone

# 2. Install all dependencies (root, server & client)
npm install

# 3. Seed the database with sample cars
npm run seed

# 4. Build the client and start the single server
npm start
```

Then open **http://localhost:4000** in your browser.

</details>

<details>
<summary><b>🍎 macOS</b></summary>

Install Node via the [official installer](https://nodejs.org) or Homebrew (`brew install node`).

```bash
# 1. Clone the repo
git clone https://github.com/sanjaydoc/Carwow_clone.git
cd Carwow_clone

# 2. Install all dependencies (root, server & client)
npm install

# 3. Seed the database with sample cars
npm run seed

# 4. Build the client and start the single server
npm start
```

Then open **http://localhost:4000** in your browser.

</details>

<details>
<summary><b>🐧 Linux</b></summary>

Install Node via [nodesource](https://github.com/nodesource/distributions), your package manager, or [nvm](https://github.com/nvm-sh/nvm).

```bash
# 1. Clone the repo
git clone https://github.com/sanjaydoc/Carwow_clone.git
cd Carwow_clone

# 2. Install all dependencies (root, server & client)
npm install

# 3. Seed the database with sample cars
npm run seed

# 4. Build the client and start the single server
npm start
```

Then open **http://localhost:4000** in your browser.

</details>

> ✅ **One command to run it all:** `npm start` compiles the React app and then boots the Express server, which serves the UI **and** the API together on port **4000**.

---

## 🔥 Development mode (hot reload)

Prefer live reloading while you hack on the UI? Run the API and the Vite dev server together:

```bash
npm run dev
```

| Service | URL |
| ------- | --- |
| API (Express, `--watch`) | http://localhost:4000 |
| Client (Vite dev server) | http://localhost:5173 |

In dev mode Vite proxies `/api` to the backend automatically, so you still hit a single URL (`5173`) in the browser.

---

## 📡 API reference

Base URL: `http://localhost:4000/api`

| Method | Endpoint | Auth | Description |
| ------ | -------- | :--: | ----------- |
| `GET` | `/health` | – | Health check |
| `GET` | `/cars` | – | List cars — supports `search`, `make`, `body_type`, `fuel_type`, `transmission`, `condition`, `min_price`, `max_price`, `sort`, `page`, `limit` |
| `GET` | `/cars/filters` | – | Distinct filter values + price range |
| `GET` | `/cars/:id` | – | A single car plus similar cars |
| `POST` | `/auth/register` | – | Create an account → `{ token, user }` |
| `POST` | `/auth/login` | – | Log in → `{ token, user }` |
| `GET` | `/auth/me` | ✅ | Current user |
| `POST` | `/sell` | – | Submit a car → valuation + dealer offers |
| `GET` | `/sell/:id` | – | Retrieve a submission + offers |
| `GET` | `/saved` | ✅ | The current user’s saved cars |
| `POST` | `/saved/:carId` | ✅ | Save a car |
| `DELETE` | `/saved/:carId` | ✅ | Un‑save a car |

**Example — search for electric cars under £50k, cheapest first:**

```bash
curl "http://localhost:4000/api/cars?fuel_type=Electric&max_price=50000&sort=price_asc"
```

**Example — get an instant valuation:**

```bash
curl -X POST http://localhost:4000/api/sell \
  -H "Content-Type: application/json" \
  -d '{"make":"BMW","model":"3 Series","year":2020,"mileage":28000,"condition":"good","name":"Sanjay","email":"sanjay@example.com"}'
```

---

## 🗂 Project structure

```text
Carwow_clone/
├── package.json              # root scripts — single-command build & start
├── README.md
├── LICENSE
├── docs/
│   ├── index.html            # GitHub Pages landing page
│   └── screenshots/          # UI screenshots used in the docs
├── server/                   # Express + SQLite API
│   ├── .env.example
│   └── src/
│       ├── index.js          # server entry — also serves client/dist
│       ├── db/
│       │   ├── index.js      # schema
│       │   └── seed.js       # sample car data
│       ├── middleware/
│       │   └── auth.js       # JWT sign / verify
│       └── routes/
│           ├── cars.js
│           ├── auth.js
│           ├── sell.js
│           └── saved.js
└── client/                   # React + Vite + Tailwind app
    └── src/
        ├── pages/            # Home, Browse, CarDetail, Compare, Sell, Login, …
        ├── components/       # Navbar, MobileNav, CarCard, CarImage, …
        ├── context/          # Auth + Saved providers
        ├── api/              # typed API client
        └── utils/            # formatting helpers
```

---

## ⚙️ Configuration

The server reads optional environment variables (copy `server/.env.example` → `server/.env`):

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORT` | `4000` | Server port |
| `JWT_SECRET` | `dev-secret-change-me` | Secret used to sign JWTs — **set this in production!** |
| `CLIENT_ORIGIN` | `*` | Allowed CORS origin (useful in dev) |

Setting an env var per platform (optional):

```powershell
# Windows (PowerShell)
$env:PORT=5000; npm start
```
```bash
# macOS / Linux
PORT=5000 npm start
```

---

## ❓ FAQ / Troubleshooting

<details>
<summary><b>The page is blank / “Cannot GET /”.</b></summary>

Run `npm start` (not `npm run serve`) at least once so the client is built into `client/dist`. `npm start` runs the build for you.
</details>

<details>
<summary><b>Port 4000 is already in use.</b></summary>

Start on another port: `PORT=5000 npm start` (macOS/Linux) or `$env:PORT=5000; npm start` (Windows PowerShell).
</details>

<details>
<summary><b>No cars appear in Browse.</b></summary>

You probably skipped seeding. Run `npm run seed` and refresh.
</details>

<details>
<summary><b><code>better-sqlite3</code> failed to install / build.</b></summary>

It ships prebuilt binaries for common platforms. If your platform needs a compile, install build tools: **Windows** → `npm i -g windows-build-tools` or install “Desktop development with C++” via Visual Studio Build Tools; **macOS** → `xcode-select --install`; **Linux** → `sudo apt install build-essential python3`.
</details>

---

## 📝 License

Released under the [MIT License](LICENSE).

<div align="center">

Built with ❤️ using React, Vite, Tailwind CSS &amp; Node.js.

</div>
