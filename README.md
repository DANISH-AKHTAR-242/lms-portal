# LMS Portal

Production-ready LMS platform with:
- **Backend API** (Express + MongoDB) for auth, courses, enrollment, payments, observability, and workers
- **Frontend Web App** (React + Vite) for student and instructor workflows

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Frontend App](#frontend-app)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Run](#run)
- [Testing](#testing)
- [Docker Compose](#docker-compose)
- [API Overview](#api-overview)
- [Security](#security)
- [Observability](#observability)
- [Architecture Notes](#architecture-notes)
- [Deployment](#deployment)
- [Useful Files](#useful-files)

## Features
- Role-based LMS workflows for students, instructors, and admins
- JWT auth with httpOnly cookies and refresh-token flow
- CSRF protection for cookie-authenticated requests
- Course catalog, enrollment, lecture progress tracking
- Razorpay integration for order, verification, and failed payment handling
- Cloudinary + S3-compatible object storage support
- Redis-backed caching, rate-limiting metadata, and token/session support
- BullMQ workers for domain events and analytics processing
- Metrics endpoints (JSON + Prometheus)
- Cache warming + queue-load-aware graceful degradation on catalog endpoint
- Modern frontend with React Query, Router, Axios interceptors, and Zustand state

## Tech Stack
- **Runtime/API:** Node.js, Express (ES Modules)
- **Database:** MongoDB, Mongoose
- **Cache/Queues:** Redis, BullMQ, IORedis
- **Payments:** Razorpay
- **Media:** Cloudinary, AWS S3 SDK (S3-compatible)
- **Security:** Helmet, HPP, express-mongo-sanitize, csurf, express-rate-limit
- **Validation:** express-validator, zod
- **Observability:** Pino, Prometheus (`prom-client`), Sentry
- **Testing:** Jest, Supertest, mongodb-memory-server
- **Frontend:** React, Vite, React Router, React Query, Axios, Tailwind CSS, Zustand

## Project Structure
```text
config/       App configuration (redis, queues, metrics, sentry, storage, etc.)
controllers/  Route orchestration and request/response handling
database/     MongoDB connection setup
middleware/   Auth, CSRF, validation, idempotency, observability
models/       Mongoose models
routes/       Route definitions
tests/        Jest test suites
services/     Core business logic
workers/      Background workers (analytics/events)
frontend/     React + Vite frontend application
index.js      Main app bootstrap
```

## Prerequisites
- Node.js 18+
- MongoDB (local/remote)
- Redis (recommended for production-like setup)

## Frontend App
Frontend source is in `/frontend`.

Frontend env setup:
```bash
cp frontend/.env.example frontend/.env
```

Frontend environment variables:
- `VITE_API_URL` (default backend URL, e.g. `http://localhost:5000`)
- `VITE_RAZORPAY_KEY_ID` (public Razorpay key)

## Environment Variables
Copy `.env.example` to `.env` and update values as needed.

```bash
cp .env.example .env
```

### Core
- `PORT` (default: `5000`)
- `NODE_ENV` (`development` / `production` / `test`)
- `CLIENT_URL` (frontend origin for CORS)
- `MONGODB_URI`
- `SECRET_KEY` (JWT signing key)

### Mongo Tuning
- `MONGO_MAX_POOL_SIZE`
- `MONGO_MIN_POOL_SIZE`
- `MONGO_READ_PREFERENCE`
- `MONGO_READ_CONCERN`

### Cloudinary
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Razorpay
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

### Redis
- `REDIS_URL`
- `REDIS_CACHE_URL`
- `REDIS_QUEUE_URL`
- `REDIS_RATE_LIMIT_URL`
- `REDIS_SENTINELS`
- `REDIS_MASTER_NAME`
- `REDIS_PASSWORD`

### Queue/Performance Controls
- `QUEUE_DEPTH_THRESHOLD`
- `DOMAIN_EVENT_WORKER_CONCURRENCY`
- `ANALYTICS_WORKER_CONCURRENCY`
- `ANALYTICS_QUEUE_PARTITION`
- `PAYMENT_TIMEOUT_MS`
- `PAYMENT_BULKHEAD_MAX_CONCURRENT`
- `PAYMENT_BULKHEAD_QUEUE_LIMIT`
- `ANALYTICS_BATCH_SIZE`
- `ANALYTICS_BATCH_WINDOW_MS`
- `ANALYTICS_SNAPSHOT_INTERVAL_MS`

### Object Storage / CDN
- `OBJECT_STORAGE_BUCKET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CDN_BASE_URL`

### Monitoring / Logging
- `SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE`
- `LOG_LEVEL`

## Getting Started
1. Install backend dependencies:
   ```bash
   npm install
   ```
2. Install frontend dependencies:
   ```bash
   cd frontend && npm install
   ```
3. Configure backend environment:
   ```bash
   cp .env.example .env
   ```
4. Configure frontend environment:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
5. Start the backend server:
   ```bash
   npm run dev
   ```
6. Start the frontend app (new terminal):
   ```bash
   cd frontend && npm run dev
   ```

## Run
- Backend development:
  ```bash
  npm run dev
  ```
- Backend production:
  ```bash
  npm start
  ```

Backend runs on `http://localhost:5000` by default.

- Frontend development:
  ```bash
  cd frontend && npm run dev
  ```
- Frontend production build:
  ```bash
  cd frontend && npm run build
  ```

## Testing
Run backend tests:

```bash
npm test
```

Notes:
- Uses Jest in-band (`--runInBand`).
- Integration suites are skipped by default in restricted environments.
- To run integration tests with in-memory MongoDB:
  ```bash
  RUN_INTEGRATION_TESTS=true npm test
  ```
- To run integration tests against an existing MongoDB instance:
  ```bash
  TEST_MONGODB_URI=mongodb://127.0.0.1:27017/lms_test npm test
  ```

Frontend quality checks:
```bash
cd frontend && npm run lint
cd frontend && npm run build
```

## Docker Compose
The repository includes a multi-service Docker Compose setup in `docker-compose.yml`:
- `app`, `app-2`, `app-3` (backend instances)
- `mongo` (MongoDB)
- `redis` (Redis)
- `nginx` (reverse proxy/load balancer)

Run:
```bash
docker compose up --build
```

## API Overview
### Health
- `GET /health`

### Security
- `GET /api/v1/security/csrf-token`

### Auth & User
- `POST /api/v1/user/signup`
- `POST /api/v1/user/signin`
- `POST /api/v1/user/signout`
- `POST /api/v1/user/refresh`
- `GET /api/v1/user/profile`
- `PATCH /api/v1/user/profile`

### Courses (Instructor/Admin)
- `GET /api/v1/courses/catalog`
- `POST /api/v1/courses`
- `PATCH /api/v1/courses/:courseId`
- `DELETE /api/v1/courses/:courseId`
- `POST /api/v1/courses/:courseId/lectures`
- `GET /api/v1/courses/:courseId/students`

### Courses (Student/Admin)
- `POST /api/v1/courses/enroll`
- `GET /api/v1/courses/enrolled`
- `POST /api/v1/courses/:courseId/lectures/:lectureId/watch`
- `GET /api/v1/courses/:courseId/progress`

### Payments
(Authenticated + `Idempotency-Key` header required)
- `POST /api/v1/payment/order`
- `POST /api/v1/payment/verify`
- `POST /api/v1/payment/failed`

## Security
- JWT auth token is set via `httpOnly` cookie.
- CSRF protection is enabled for cookie-authenticated flows.
  - Fetch CSRF token from `GET /api/v1/security/csrf-token`
  - Send token in `X-CSRF-Token` header on protected requests
- Helmet, HPP, NoSQL sanitize, and rate limiting are enabled globally.
- `sameSite` cookie mode is `none` in production and `strict` in development.

## Observability
- `GET /metrics` returns structured JSON metrics snapshot.
- `GET /metrics/prometheus` returns Prometheus scrape format.
- Add `X-Trace-Id` to correlate logs and async processing.
- Sentry integration is available through `SENTRY_DSN`.

## Architecture Notes
- Modular monolith organized by Auth, Users, Courses, Payments, Media, Notifications, Analytics.
- Event-driven processing via BullMQ workers and domain events.
- Redis role separation for cache/queue/rate-limit use cases.
- Enrollment and lecture progress data are stored in dedicated collections.
- For a deeper architecture breakdown, see `docs/architecture.md`.

## Deployment
- Docker image: `Dockerfile`
- Local stack (app, mongo, redis, nginx): `docker-compose.yml`
- Nginx load balancer config: `ops/nginx/nginx.conf`
- PM2 process config: `ecosystem.config.cjs`

## Useful Files
- `.env.example` — environment variable template
- `docs/architecture.md` — architecture details and module boundaries
- `lms-portal.postman_collection.json` — API collection for manual testing
- `WARP.md` — local development guidance
