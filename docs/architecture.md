# LMS Backend Production Architecture

## Modular Monolith Structure

```text
index.js
config/
  cache.js
  circuit-breaker.js
  event-bus.js
  event-handlers.js
  metrics.js
  metrics-prometheus.js
  queues.js
  retry.js
  sentry.js
  token-store.js
controllers/
  user.controller.js        # Auth + Users module orchestration
  course.controller.js      # Courses + Analytics emit
  razorpay.controller.js    # Payments orchestration
models/
  user.model.js
  course.model.js
  lecture.model.js
  coursePurchase.model.js
  courseProgress.js
services/
  auth-user.service.js      # Users service + profile cache
  course-lecture.service.js # Courses + Media service + cache warming
  payment.service.js        # Payments service (retry/circuit/event)
  progress-analytics.service.js
  analytics.service.js
workers/
  domain-events.worker.js
  analytics.worker.js
routes/
  user.route.js
  course.route.js
  payment.route.js
  security.route.js
middleware/
  auth.middleware.js
  csrf.middleware.js
  idempotency.middleware.js
  observability.middleware.js
  validation.middleware.js
```

## Module Boundaries

- **Auth**: login/signup/signout/refresh + token rotation (`controllers/user.controller.js`, `utils/generateToken.js`, `config/token-store.js`)
- **Users**: profile read/write + session cache (`services/auth-user.service.js`)
- **Courses**: course CRUD/catalog/enroll (`controllers/course.controller.js`, `services/course-lecture.service.js`)
- **Payments**: order/verify/fail with idempotency + resilience (`routes/payment.route.js`, `services/payment.service.js`)
- **Media**: lecture upload and object storage fallback (`config/storage.js`, `services/course-lecture.service.js`)
- **Notifications**: async queue producer (`config/queues.js`)
- **Analytics**: event ingestion/worker/aggregations (`services/analytics.service.js`, `workers/analytics.worker.js`)

## Request → Service → Repository Flow

1. `routes/*.route.js` validates input and enforces auth/rate-limits.
2. `controllers/*.controller.js` orchestrate request context (userId, traceId, response DTO).
3. `services/*.service.js` execute business logic, resilience, caching, event emission.
4. `models/*.model.js` are repository boundary for MongoDB persistence.
5. Async side effects are emitted to BullMQ (`event-bus.js`, `queues.js`) and processed by workers.

## Event-Driven Contracts

Domain events:
- `USER_REGISTERED`
- `USER_ENROLLED`
- `PAYMENT_SUCCESS`
- `LECTURE_WATCHED`
- `COURSE_CREATED`
- `COURSE_VIEWED`

Event pipeline:
`API -> Service -> eventBus.emit/enqueueAnalyticsEvent -> BullMQ Queue -> Worker -> Mongo AnalyticsEvent`

## Caching Strategy

- Redis cache-aside in `config/cache.js`.
- TTL policy:
  - course catalog: 300s
  - course detail: 180s
  - user profile: 60s
  - user enrolled list: 120s
- Invalidation:
  - Course create/update/delete/lecture upload invalidate catalog cache.
  - User signout/session clear invalidates user profile cache.
- Warming:
  - startup invokes `warmCourseCatalogCache()`.

## Mongo Optimization

Indexes added for:
- users: role/lastActive, enrolledCourse.course, createdCourses
- courses: instructor+createdAt, isPublished+createdAt, category+level, enrolledStudent
- purchases: paymentId(unique), user+status+createdAt, course+status
- progress: course+isCompleted, user+lastAccessed

Query optimizations:
- `.lean()` used on catalog and enrolled-courses listing.
- Pagination added for enrolled-courses endpoint via `page` and `limit`.

## Observability

- Structured logging via Pino (`config/logger.js`).
- Trace propagation with `X-Trace-Id` on requests and queued payloads.
- Prometheus metrics endpoint: `GET /metrics/prometheus`.
- Snapshot metrics endpoint: `GET /metrics`.
- Sentry hook via `config/sentry.js` and global error handler.

## Scalability + Concurrency

- Stateless API with cookie JWT + refresh rotation state in Redis.
- Horizontal scaling friendly (`docker-compose`, nginx upstream).
- Workers are independently scalable (`workers/*.worker.js`).
- BullMQ concurrency set on workers (20).

## DevOps

- Multi-stage production Dockerfile.
- `docker-compose.yml` for app + mongo + redis + nginx.
- Nginx load-balancer config at `ops/nginx/nginx.conf`.
- GitHub Actions pipeline at `.github/workflows/ci-cd.yml` (lint/test/build/deploy placeholder).
- Deployment strategy recommendation: rolling or blue-green in deploy stage.

## Migration Plan (Incremental, Non-Breaking)

1. Introduce shared resilience/observability primitives (`retry`, `circuit-breaker`, `event-bus`, `metrics`).
2. Wrap existing payment/media flows with retry + circuit breakers.
3. Add event emission in existing controllers/services without API changes.
4. Add workers for domain and analytics queues.
5. Add cache-aside reads and invalidation around current query paths.
6. Add refresh rotation endpoint and keep existing auth endpoints intact.
7. Roll out Prometheus/Sentry endpoints and connect infra dashboards.
8. Deploy with workers separate from API instances.

## Future Microservices Extraction Path

Extract first without rewrites by preserving event contracts:

1. **Payments service**
   - Move `payment.service.js` + payment routes into standalone app.
   - Keep queue contracts (`PAYMENT_SUCCESS`) unchanged.
2. **Media service**
   - Move upload + transcode to separate worker/API.
   - Keep storage response contract (`provider/mediaUrl/publicId`).
3. **Notifications service**
   - Isolate notification queue consumers into dedicated service.

Because module boundaries already use service interfaces + async events, extraction becomes transport relocation instead of business-logic rewrite.
