# LMS Portal Backend

Production-oriented LMS backend using Express, MongoDB, JWT cookie auth, Cloudinary media, and Razorpay payments.

## Tech Stack
- Node.js + Express (ES Modules)
- MongoDB + Mongoose
- JWT authentication (httpOnly cookies)
- Razorpay payment integration
- Cloudinary media storage
- Redis (rate-limit/session metadata/cache when configured)
- BullMQ queues for async payment/media/notification jobs
- Object storage + CDN lecture delivery support (S3-compatible)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your credentials.
4. Start development server:
   ```bash
   npm run dev
   ```

## Testing
- Integration tests:
  ```bash
  npm test
  ```
  By default, integration specs are skipped in restricted environments.
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

## Production Architecture Additions
- Modular monolith module boundaries across Auth, Users, Courses, Payments, Media, Notifications, Analytics.
- Internal event bus with BullMQ domain events and DLQ support.
- Retry + circuit breaker around external calls (Razorpay, media upload).
- Redis cache-aside and startup cache warming.
- Refresh token rotation + revocation with Redis-backed token store.
- Prometheus + Pino + trace propagation (`X-Trace-Id`).

See detailed implementation and migration path in:
- `docs/architecture.md`

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
