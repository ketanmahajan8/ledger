# Ledger

An expense-splitting app for households and shared living — built with a ledger-book aesthetic (serif headers, monospace figures, ruled-paper texture) and real-time balance updates.

## Features

- **Expense splitting** — track shared expenses and balances across a household
- **Multi-currency support** — USD, INR, EUR, GBP, and more, set per household
- **Live updates** — balances sync in real time across all members via Socket.io
- **Real authentication** — email/password accounts with bcrypt-hashed passwords and JWT session cookies; households and expenses are private to their actual members
- **Light/dark mode** — toggleable ledger-book visual theme

## Tech Stack

**Client:** React, Vite
**Server:** Express, Postgres
**Real-time:** Socket.io
**Auth:** bcrypt, JWT

## Project Structure

```
ledger/
├── client/          # React + Vite frontend
├── server/          # Express + Postgres backend
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL

### Setup

1. Clone the repo
   ```bash
   git clone <your-repo-url>
   cd ledger
   ```

2. Install dependencies
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. Set up environment variables

   Create a `.env` file in the `server` folder (see `.env.example` if provided) with:
   ```
   DATABASE_URL=postgres://user:password@localhost:5432/ledger
   JWT_SECRET=your_jwt_secret
   ```

4. Run the database migrations/schema against your local Postgres `ledger` database

5. Start the server
   ```bash
   cd server && npm start
   ```
   Runs on `http://localhost:4000`

6. Start the client
   ```bash
   cd client && npm run dev
   ```
   Runs on `http://localhost:5173`

## Live Demo

*(Add your deployed Vercel URL here once live)*

