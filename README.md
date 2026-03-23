# LMS Portal Backend

Production-ready LMS backend built with Express and MongoDB, with JWT cookie authentication, course management, media handling, and payment flows.

## Features
- Role-based LMS workflows for students and instructors
- JWT auth with httpOnly cookies and refresh-token flow
- Razorpay integration for course payments
- Cloudinary + S3-compatible object storage support
- Redis-backed caching, rate-limit metadata, and token/session support
- BullMQ workers for async jobs (payments/media/notifications)
- Metrics endpoints (JSON + Prometheus)
- SWR cache refresh + stampede lock + queue backpressure-aware degradation

## Tech Stack
- Node.js + Express (ES Modules)
- MongoDB + Mongoose
- Redis
- BullMQ
- Razorpay
- Cloudinary
- AWS S3 SDK (S3-compatible object storage)
- Jest + Supertest

## Getting Started
### Prerequisites
- Node.js 18+
- MongoDB
- Redis (recommended for production-like local setup)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Configure `.env` values (MongoDB URI, JWT secret, Cloudinary, Razorpay, etc.).

### Run
- Development:
  ```bash
  npm run dev
  ```
- Production:
  ```bash
  npm start
  ```

## Testing
- Run tests:
  ```bash
  npm test
  ```
  Integration specs are skipped by default in restricted environments.
  To run them with in-memory MongoDB:
  ```bash
  RUN_INTEGRATION_TESTS=true npm test
  ```
  Or provide an existing MongoDB URI:
  ```bash
  TEST_MONGODB_URI=mongodb://127.0.0.1:27017/lms_test npm test
  ```
  - Uses test DB (in-memory MongoDB or provided URI)
  - Mocks Razorpay and media upload clients in integration tests

## Useful Files
- Architecture notes: `docs/architecture.md`
- Docker image config: `Dockerfile`
- Local Docker stack: `docker-compose.yml`
- PM2 process config: `ecosystem.config.cjs`
- Postman collection: `lms-portal.postman_collection.json`

## Key API Routes
### Health
- `GET /health`

### Auth
- `POST /api/v1/user/signup`
- `POST /api/v1/user/signin`
- `POST /api/v1/user/signout`
- `POST /api/v1/user/refresh`
- `GET /api/v1/user/profile`
- `PATCH /api/v1/user/profile`

### Course (Instructor)
- `POST /api/v1/courses`
- `PATCH /api/v1/courses/:courseId`
- `DELETE /api/v1/courses/:courseId`
- `POST /api/v1/courses/:courseId/lectures`
- `GET /api/v1/courses/:courseId/students`
- `GET /api/v1/courses/catalog` (cached catalog)

### Course (Student)
- `POST /api/v1/courses/enroll`
- `GET /api/v1/courses/enrolled`
- `POST /api/v1/courses/:courseId/lectures/:lectureId/watch`
- `GET /api/v1/courses/:courseId/progress`

### Payment
- `POST /api/v1/payment/order` (requires `Idempotency-Key` header)
- `POST /api/v1/payment/verify` (requires `Idempotency-Key` header)
- `POST /api/v1/payment/failed`

### Observability
- `GET /metrics` (basic structured metrics snapshot)
- `GET /metrics/prometheus` (Prometheus scrape format)

## Production Architecture
- Modular monolith module boundaries across Auth, Users, Courses, Payments, Media, Notifications, Analytics.
- Internal event bus with BullMQ domain events and DLQ support.
- Retry + circuit breaker around external calls (Razorpay, media upload).
- Redis cache-aside and startup cache warming.
- Redis role-separated URLs (`REDIS_CACHE_URL`, `REDIS_QUEUE_URL`, `REDIS_RATE_LIMIT_URL`) with Sentinel-ready config.
- Refresh token rotation + revocation with Redis-backed token store.
- Enrollment and lecture progress moved to dedicated collections with pagination-based aggregation reads.
- Prometheus + Pino + trace propagation (`X-Trace-Id`).

## Deployment
- Docker: `Dockerfile`
- Local stack: `docker-compose.yml`
- Nginx LB config: `ops/nginx/nginx.conf`
- PM2 clustering/workers: `ecosystem.config.cjs`

## Security Notes
- JWT cookie is configured as `httpOnly` and `secure` in production.
- `sameSite` is `none` in production and `strict` in development.
- Helmet, HPP, Mongo sanitize, and rate limiting are enabled.
- CSRF protection is enabled for cookie-authenticated requests. Fetch a token from `GET /api/v1/security/csrf-token` and send it via `X-CSRF-Token` for protected routes.
- In production, CSRF cookie settings require HTTPS (`secure: true` with `sameSite=none`).
- Add `X-Trace-Id` header to correlate request logs across services.
