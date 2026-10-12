# Expense Voucher Frontend

React, TypeScript, and Vite frontend for the Expense Voucher Management System.

## Setup

Requirements: Node.js 20.19+ and npm.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` if you need a non-default API location. `VITE_API_BASE_URL` is empty for local development because Vite proxies `/api` to `http://localhost:3000`.
3. Start the backend from `../backend` and start this app with `npm run dev`.
4. Sign in with an account provisioned by the backend administrator. There is no public registration or bundled demo account.

## Commands

- `npm run dev` starts the Vite development server.
- `npm run build` typechecks and builds for production.
- `npm run lint` runs ESLint.
- `npm test` runs the frontend unit tests.
- `npm run preview` serves the production build locally.

## Authentication and API

All data is loaded from the NestJS API. In development, `/api` is proxied to port 3000. For production, serve the app and API on the same origin or configure `VITE_API_BASE_URL` to the API origin.

The short-lived access token is kept in memory. The rotating refresh token is persisted in `localStorage` to restore the session after browser restarts and is cleared when the session expires or the user signs out. Signature images are requested through the authenticated API and are not exposed as public static files.

Routes and available actions are role-aware for `EMPLOYEE`, `DIRECTOR`, and `ACCOUNTS`; the backend remains the authorization authority. Accounts has read-only access, and payment processing is not part of the current API.
