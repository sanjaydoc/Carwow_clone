<div align="center">

# 🚗 Carwow Clone

### A pixel-faithful, full-stack clone of [carwow.co.uk](https://www.carwow.co.uk) — browse, buy, sell & compare cars

*Built section-by-section to mirror Carwow's mobile & desktop experience, with real car photography, in a warm Claude-inspired orange theme.*

<br/>

[![Live demo](https://img.shields.io/badge/▶_Live_demo-sanjaydoc.github.io%2FCarwow__clone-D97757?style=for-the-badge)](https://sanjaydoc.github.io/Carwow_clone/)

[![License: MIT](https://img.shields.io/badge/License-MIT-D97757.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org)

<br/>

![Carwow clone — home](docs/screenshots/home-hero.png?v4)

</div>

---

## 🌐 Live demo

The **full interactive app** is deployed on GitHub Pages (a backend-free build that runs entirely in the browser), so you can click through the real thing — every page, flow and animation:

### 👉 **https://sanjaydoc.github.io/Carwow_clone/**

> Car photography loads live from a car-image CDN in your browser, with a Wikimedia fallback and a clean illustrated last resort.

---

## 📋 Table of contents

- [✨ Overview](#-overview)
- [🖼️ Screenshots](#️-screenshots)
- [🧩 Pages & features](#-pages--features)
- [🛠 Tech stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [⚡ Quickstart](#-quickstart) · [Windows](#-windows) · [macOS](#-macos) · [Linux](#-linux)
- [🔥 Dev mode](#-development-mode-hot-reload)
- [🌍 Static / Pages build](#-static--github-pages-build)
- [📡 API reference](#-api-reference)
- [🗂 Project structure](#-project-structure)
- [📝 License](#-license)

---

## ✨ Overview

**Carwow Clone** recreates the Carwow car-marketplace experience end to end. It's a single-page React app on top of a REST API, with a **backend-free "static" mode** that lets the entire thing run in the browser for the GitHub Pages demo.

The homepage is rebuilt **section-by-section** to match carwow.co.uk — a tabbed hero, promotional poster, budget & type & manufacturer browsing, "Electric is trending", Trustpilot-style reviews, guides, videos and a dark footer — and the primary journeys each have their own dedicated page: **Buying**, **Selling**, **EV Deals** and **Car Insurance**, plus car detail, compare and auth.

> 💡 A portfolio / learning project. Car data, valuations, offers and quotes are illustrative, generated from sample data.

---

## 🖼️ Screenshots

| Home | EV Deals |
| :---: | :---: |
| [![Home](docs/screenshots/home-desktop.png?v4)](docs/screenshots/home-desktop.png?v4) | [![EV Deals](docs/screenshots/ev-deals.png?v4)](docs/screenshots/ev-deals.png?v4) |

| Sell my car | Car insurance |
| :---: | :---: |
| [![Sell](docs/screenshots/sell.png?v4)](docs/screenshots/sell.png?v4) | [![Car insurance](docs/screenshots/car-insurance.png?v4)](docs/screenshots/car-insurance.png?v4) |

| Car detail | Compare |
| :---: | :---: |
| [![Car detail](docs/screenshots/car-detail.png?v4)](docs/screenshots/car-detail.png?v4) | [![Compare](docs/screenshots/compare.png?v4)](docs/screenshots/compare.png?v4) |

| Browse & filter | Log in | Home (mobile) |
| :---: | :---: | :---: |
| [![Browse](docs/screenshots/browse.png?v4)](docs/screenshots/browse.png?v4) | [![Login](docs/screenshots/login.png?v4)](docs/screenshots/login.png?v4) | [![Home mobile](docs/screenshots/home-mobile.png?v4)](docs/screenshots/home-mobile.png?v4) |

---

## 🧩 Pages & features

**🏠 Home** — carwow-style, section by section:
- Bold hero with a **tabbed search card** (Find a car / Sell my car / Read reviews) and category chips
- **Featured-deal poster**, top-rated cars, **browse by budget / car type / manufacturer** (real logos)
- **Electric is trending**, customer **reviews slider**, "we make car changing easy", popular used models
- **Latest car news & videos**, **Join the electric revolution**, and an **FAQ** accordion

**🛒 Buying** — a "What are you looking for?" chooser (Build a new car / New in-stock / Used / Leasing / quiz).

**💷 Selling** — instant valuation → competing **dealer offers**, plus **Carwow vs. paid sites** comparison table, "make your sale worth it", **Sell my car FAQs** and selling guides.

**⚡ EV Deals** — "save up to £X" hero, 🔥 **Latest price drops** slider, filterable **all electric deals** grid, and a "what's your car worth?" block.

**🛡️ Car Insurance** — why-compare blocks, three-step how-it-works, interactive **types-of-cover** tabs (TPO / TPFT / Comprehensive), cheaper-quote tips, reg quote CTA and FAQs.

**📄 Car detail** — real photo, full specs, cash & finance pricing, save button, similar cars.

**⚖️ Compare** — up to 3 cars side by side; best value per row highlighted.

**🔎 Browse** — search + filters (make, body, fuel, transmission, condition, price), sorting, pagination, URL-synced.

**🔐 Accounts** — Carwow-style login (Continue with Google, email/password), register, JWT auth, and ❤️ **saved cars**.

**📱 Mobile-first** — a native-style **floating bottom nav** (Buying / Selling / EV Deals / Log in / Menu) and a full-screen **menu** with dropdown accordions (New car reviews, Used cars, Car leasing, Car deals, Sell my car, Car guides, Car insurance).

---

## 🛠 Tech stack

| Layer | Technology |
| ----- | ---------- |
| **Front end** | React 18 · TypeScript · Vite · Tailwind CSS · React Router |
| **Back end** | Node.js · Express |
| **Database** | SQLite (`better-sqlite3`) |
| **Auth** | JWT (`jsonwebtoken`) · `bcryptjs` |
| **Imagery** | imagin.studio car CDN → Wikimedia fallback → SVG illustration; open car-logos dataset |

---

## 🏗 Architecture

```text
                ┌──────────────────────────────────────────┐
  Browser  ──►  │            Node.js (Express)             │
 (React SPA)    │   /api/*  ──►  routes ──► better-sqlite3 ──► SQLite
                │   /*      ──►  serves the built client    │
                └──────────────────────────────────────────┘
                          one server · one port (4000)

  GitHub Pages demo  ──►  same React app, VITE_STATIC=true
                          (in-browser mock API + localStorage, no backend)
```

---

## ⚡ Quickstart

**Prerequisites:** [Node.js 18+](https://nodejs.org) (includes npm) and Git. The npm commands are identical on every OS.

<details open>
<summary><b>🪟 Windows</b> (PowerShell / CMD)</summary>

```powershell
git clone https://github.com/sanjaydoc/Carwow_clone.git
cd Carwow_clone
npm install       # installs root, server & client
npm run seed      # seed sample cars
npm start         # builds the client and starts the single server
```
Open **http://localhost:4000**.
</details>

<details>
<summary><b>🍎 macOS</b></summary>

```bash
git clone https://github.com/sanjaydoc/Carwow_clone.git
cd Carwow_clone
npm install
npm run seed
npm start
```
Open **http://localhost:4000**.
</details>

<details>
<summary><b>🐧 Linux</b></summary>

```bash
git clone https://github.com/sanjaydoc/Carwow_clone.git
cd Carwow_clone
npm install
npm run seed
npm start
```
Open **http://localhost:4000**.
</details>

> ✅ **One command:** `npm start` builds the React app and boots the Express server, which serves the UI **and** the `/api` routes together on port **4000**.

---

## 🔥 Development mode (hot reload)

```bash
npm run dev
```

| Service | URL |
| ------- | --- |
| API (Express, `--watch`) | http://localhost:4000 |
| Client (Vite dev server, proxies `/api`) | http://localhost:5173 |

---

## 🌍 Static / GitHub Pages build

The live demo is a **backend-free** build: the client is compiled with `VITE_STATIC=true`, swapping the HTTP API for an in-browser mock (embedded catalogue + `localStorage`) and using `HashRouter`.

```bash
npm run build:pages   # builds the static client into ./docs
```

Commit the updated `docs/` — GitHub Pages serves it from **Settings → Pages → Deploy from a branch → `/docs`**.

---

## 📡 API reference

Base URL: `http://localhost:4000/api`

| Method | Endpoint | Auth | Description |
| ------ | -------- | :--: | ----------- |
| `GET` | `/health` | – | Health check |
| `GET` | `/cars` | – | List cars — `search, make, body_type, fuel_type, transmission, condition, min_price, max_price, sort, page, limit` |
| `GET` | `/cars/filters` | – | Distinct filter values + price range |
| `GET` | `/cars/:id` | – | A single car + similar cars |
| `POST` | `/auth/register` · `/auth/login` | – | Auth → `{ token, user }` |
| `GET` | `/auth/me` | ✅ | Current user |
| `POST` | `/sell` | – | Submit a car → valuation + dealer offers |
| `GET` | `/sell/:id` | – | A submission + its offers |
| `GET` · `POST` · `DELETE` | `/saved` · `/saved/:carId` | ✅ | List / save / un-save cars |

---

## 🗂 Project structure

```text
Carwow_clone/
├── package.json          # root scripts (start, build:pages, dev, seed)
├── scripts/build-pages.mjs
├── docs/                 # published GitHub Pages build + screenshots
├── server/               # Express + SQLite API
│   └── src/  index.js · db/ · middleware/ · routes/
└── client/               # React + Vite + Tailwind app
    └── src/
        ├── pages/        # Home, Buying, EvDeals, CarInsurance, Sell, CarDetail, Compare, Browse, Login, …
        ├── components/   # Navbar, MobileNav, CarCard, CarImage, BrandLogo, Footer, …
        ├── context/      # Auth + Saved providers
        └── api/          # client, mock API, static data, car photos
```

---

## 📝 License

Released under the [MIT License](LICENSE).

<div align="center">

Built with ❤️ using React, Vite, Tailwind CSS &amp; Node.js.

</div>
