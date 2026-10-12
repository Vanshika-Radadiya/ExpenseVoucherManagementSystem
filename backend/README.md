# Expense Voucher API

Node.js, NestJS, TypeScript, Prisma, and MySQL backend for the Expense Voucher Management System.

## Requirements

- Node.js 22 or newer
- MySQL 8 or compatible
- npm

## Setup

1. Create a MySQL database named `expense_voucher` and a database user with access to it.
2. Copy `.env.example` to `.env`, then set `DATABASE_URL` and a random `JWT_ACCESS_SECRET` of at least 32 characters.
3. Install dependencies and generate the Prisma client:

   ```bash
   npm install --legacy-peer-deps
   npm run db:generate
   ```

   `--legacy-peer-deps` is currently needed with the generated npm dependency tree and npm 10. A normal `npm install` may also work with a newer npm release.
4. Apply migrations and provision accounts:

   ```bash
   npm run db:migrate -- --name init
   ```

   Supply `SEED_USERS_JSON` as a temporary environment variable or secret-manager value before running `npm run db:seed`. Each account requires `email`, `fullName`, `role` (`EMPLOYEE`, `DIRECTOR`, or `ACCOUNTS`), and a password of at least 12 characters. `employeeId` is optional. Never commit real credentials or seed JSON.
5. Start the API:

   ```bash
   npm run start:dev
   ```

   The API listens on `http://localhost:3000/api`. The health endpoint is `GET /api`.

## Useful Commands

```bash
npm run build
npm test
npm run test:e2e
npm run lint
npm run db:studio
```

## Architecture

- `src/auth`: login, JWT access tokens, rotating hashed refresh sessions, authentication and role guards.
- `src/vouchers`: DTO validation, workflow service, abstract repository contract, Prisma persistence, and voucher routes.
- `src/signatures`: abstract storage contract and local-disk adapter. Signature files are not served as static assets.
- `src/dashboards`: role-scoped dashboard aggregation.
- `src/database`: shared Prisma client lifecycle.
- `prisma/schema.prisma`: MySQL schema; `prisma/migrations`: schema migrations.

Interfaces describe compile-time contracts. Abstract classes are used where NestJS needs runtime dependency-injection tokens, including repositories and signature storage; they are not added to data objects without useful behavior.

## Data Model

- `User`: email, name, optional employee ID, password hash, active flag, and one of the three roles.
- `Voucher`: unique generated number, system-assigned voucher date, employee-entered expense date and details, amount, status, signature storage keys, and decision fields.
- `VoucherCounter`: per-year sequence used for voucher numbers (`EV-YYYY-000001`).
- `VoucherEvent`: actor-attributed creation, edit, submission, approval, and rejection history.
- `RefreshSession`: SHA-256 hash of each refresh token, expiry, and revocation timestamp.

Amounts use MySQL `DECIMAL(12,2)`. Timestamps are UTC. Employee identity displayed on a voucher is snapshotted at draft creation.

## API

All routes are prefixed with `/api`. Login returns a bearer access token and a refresh token. Send the access token as `Authorization: Bearer <token>`. Refresh and logout accept `{ "refreshToken": "..." }`.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Login with email/password |
| POST | `/auth/refresh` | Public | Rotate refresh token |
| POST | `/auth/logout` | Public | Revoke refresh token |
| POST | `/vouchers` | Employee | Create a draft |
| GET | `/vouchers` | All roles | List; employees see only their own |
| GET | `/vouchers/:id` | All roles | Voucher details |
| PATCH | `/vouchers/:id` | Employee | Edit a draft |
| DELETE | `/vouchers/:id` | Employee | Delete a draft |
| POST | `/vouchers/:id/signatures/employee` | Employee | Upload multipart field `signature` |
| POST | `/vouchers/:id/submit` | Employee | Submit a signed draft |
| POST | `/vouchers/:id/approve` | Director | Approve with multipart field `signature` |
| POST | `/vouchers/:id/reject` | Director | Reject with `{ "reason": "..." }` |
| GET | `/vouchers/:id/signatures/:kind` | All roles | Authenticated signature retrieval (`employee` or `director`) |
| GET | `/dashboards/me` | All roles | Dashboard data for caller's role |

List query parameters include `search`, `status`, `department`, `category`, `fromDate`, `toDate`, `minAmount`, `maxAmount`, `page`, `pageSize`, `sortBy`, and `sortDirection`.

## Workflow and Security Decisions

- New vouchers begin as `DRAFT`; submitting moves them to `PENDING_APPROVAL`.
- Only draft vouchers can be edited or deleted. A submitted voucher is read-only to its employee.
- Only the Director can approve or reject pending vouchers. Approval requires a Director signature; rejection requires a reason.
- Approved and rejected vouchers are terminal. Rejected vouchers cannot be revised/resubmitted; the employee creates a new voucher instead.
- Accounts can view all vouchers and signatures but cannot change workflow state or mark vouchers paid. Payment execution is out of scope.
- Account creation is controlled through the seed command; there is no public registration endpoint.
- Signature files are written to `SIGNATURE_STORAGE_PATH`, defaulting to `storage/signatures`. Store this directory on persistent protected storage for deployments and back it up appropriately.
- Signature upload accepts PNG, JPEG, and WebP up to 5 MB. Files use random names and are retrieved through authenticated routes.
- Department and category are free-text fields in this version; no taxonomy-management API is included.

## Verification

`npm run build` typechecks and builds the backend. `npm test` runs unit tests. The current e2e suite mocks Prisma and checks API health and unauthenticated route protection; database-backed integration scenarios should use a dedicated test database.
