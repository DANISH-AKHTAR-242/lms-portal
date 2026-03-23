# LMS Portal Monorepo

A production-ready Learning Management System with a unified full-stack monorepo architecture.

## Project Overview

LMS Portal provides:
- secure authentication (cookie-based JWT + refresh flow)
- course catalog and course details
- enrollments and Razorpay-powered payments
- lecture delivery with video playback and progress tracking
- instructor workflows for course and lecture management
- analytics/event processing with Redis + BullMQ workers

This repository is now organized as a **single monorepo** with backend API, frontend web app, shared contracts, and infrastructure in one place.

## Architecture

- **Monorepo layout** with `apps/api` and `apps/web`
- **Shared layer** (`packages/shared`) for constants and API contract typings
- **Modular backend** with clear request flow:
  - routes/controllers → services → models (repository boundary)
- **Frontend integration** using React Query + Axios interceptors (CSRF + refresh)
- **Infra** includes Docker + Nginx reverse proxy for same-domain API + UI serving

## Folder Structure (Detailed)

```text
.
├── apps/
│   ├── api/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── tests/
│   │   │   ├── integration/
│   │   │   └── utils/
│   │   ├── utils/
│   │   ├── workers/
│   │   ├── ecosystem.config.cjs
│   │   ├── index.js
│   │   ├── jest.config.js
│   │   └── package.json
│   └── web/
│       ├── public/
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── courses/
│       │   │   └── payments/
│       │   ├── hooks/
│       │   ├── pages/
│       │   ├── store/
│       │   └── utils/
│       ├── .env.example
│       ├── package.json
│       └── vite.config.js
├── packages/
│   └── shared/
│       ├── api-types/
│       │   └── common.d.ts
│       ├── constants/
│       │   └── index.js
│       ├── types/
│       │   ├── course.d.ts
│       │   └── user.d.ts
│       └── package.json
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   └── docker-compose.yml
│   └── nginx/
│       └── nginx.conf
├── docs/
├── .env.example
├── package.json
└── package-lock.json
```

## Backend Documentation

### API Base
- Prefix: `/api/v1`

### Main API routes
- **Security**
  - `GET /api/v1/security/csrf-token`
- **Auth/User**
  - `POST /api/v1/user/signup`
  - `POST /api/v1/user/signin`
  - `POST /api/v1/user/signout`
  - `POST /api/v1/user/refresh`
  - `GET /api/v1/user/profile`
  - `PATCH /api/v1/user/profile`
- **Courses**
  - `GET /api/v1/courses/catalog`
  - `GET /api/v1/courses/:courseId/progress`
  - `POST /api/v1/courses/enroll`
  - `GET /api/v1/courses/enrolled`
  - `POST /api/v1/courses/:courseId/lectures/:lectureId/watch`
  - `POST /api/v1/courses` (instructor/admin)
  - `POST /api/v1/courses/:courseId/lectures` (instructor/admin)
  - `GET /api/v1/courses/:courseId/students` (instructor/admin)
- **Payments**
  - `POST /api/v1/payment/order`
  - `POST /api/v1/payment/verify`
  - `POST /api/v1/payment/failed`

### Auth Flow
1. User signs in via `/api/v1/user/signin`.
2. Access and refresh tokens are maintained via **httpOnly cookies**.
3. Frontend calls `/api/v1/user/refresh` on 401 once and retries original request.
4. Signout clears server-side session/refresh state and cookies.

### CSRF Handling
- CSRF token endpoint: `GET /api/v1/security/csrf-token`
- Frontend attaches token via `X-CSRF-Token` on mutating requests.
- CSRF middleware is enabled for cookie-authenticated API requests.

### CORS + Cookie Compatibility
- `CLIENT_URL` supports single or comma-separated origins.
- `credentials: true` is enabled.
- Cookie-based auth is compatible with same-domain proxy setup.

## Frontend Documentation

### Pages
- `/` → Landing page
- `/login` → Login page
- `/signup` → Signup page
- `/catalog` → Course catalog
- `/courses/:courseId` → Course details + checkout trigger
- `/dashboard` → Student dashboard + enrolled/progress
- `/courses/:courseId/learn` → Video player page
- `/instructor` → Instructor dashboard

### State Management
- **React Query** for server state (catalog, progress, enrollments, auth profile)
- **Zustand** for session/client state

### API Integration
- Axios client uses `withCredentials: true`
- Default base URL is `/` (same-domain)
- Dev proxy in Vite sends `/api`, `/health`, `/metrics` to backend
- CSRF token fetched lazily and cached
- Refresh flow implemented in response interceptor

## Frontend ↔ Backend Integration Snippets

### Axios client (CSRF + refresh)

```js
import axios from 'axios';
import { API_PREFIX } from '@lms/shared/constants/index';

const api = axios.create({
  baseURL: '/',
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  // attach X-CSRF-Token for mutating requests
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config?._retry) {
      error.config._retry = true;
      await api.post(`${API_PREFIX}/user/refresh`, null);
      return api(error.config);
    }
    throw error;
  }
);
```

### Shared API constants

```js
// packages/shared/constants/index.js
export const API_PREFIX = '/api/v1';
export const CSRF_TOKEN_ENDPOINT = `${API_PREFIX}/security/csrf-token`;
```

## Screenshots

> Replace placeholders with real captures before publishing.

- Landing page: `docs/screenshots/landing-page.png` *(placeholder)*
- Dashboard: `docs/screenshots/dashboard-page.png` *(placeholder)*
- Course page: `docs/screenshots/course-detail-page.png` *(placeholder)*
- Player page: `docs/screenshots/player-page.png` *(placeholder)*

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB
- Redis (recommended)

### Environment variables

1. API env:
```bash
cp .env.example .env
```

2. Web env:
```bash
cp apps/web/.env.example apps/web/.env
```

Important variables:
- `PORT` (API port, default `5000`)
- `CLIENT_URL` (frontend origin(s), comma-separated if needed)
- `MONGODB_URI`
- `SECRET_KEY`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `REDIS_URL` (and optional split redis URLs)
- `VITE_RAZORPAY_KEY_ID` (web)

## Running the Project

### Development (single command)

```bash
npm install
npm run dev
```

This starts both:
- API: `apps/api` (`nodemon`)
- Web: `apps/web` (`vite`)

### Individual app commands

```bash
npm run dev:api
npm run dev:web
npm test
npm run lint
npm run build
```

## Production Mode

### API with PM2 cluster

```bash
cd apps/api
pm2 start ecosystem.config.cjs
```

### Web build

```bash
npm run build
```

## Deployment Guide

### Docker

Infrastructure files are in `infra/docker`:
- `Dockerfile.api`
- `Dockerfile.web`
- `docker-compose.yml`

Run full stack:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

### Nginx

- Config path: `infra/nginx/nginx.conf`
- `/api/*` is proxied to API upstream
- `/` is served via web upstream
- This enables same-domain browser traffic for cookies + CSRF flows

### Domain Setup Notes

For production domains:
- point domain DNS to Nginx ingress/public IP
- terminate TLS at Nginx (or cloud LB)
- set secure cookie flags in production
- set `CLIENT_URL` to deployed frontend origin

## Scaling Notes

- API is stateless and horizontally scalable.
- PM2 cluster mode is configured for API processes.
- BullMQ workers can be scaled independently.
- Redis offloads session/token/rate-limit metadata.
- Nginx upstream load-balances API instances.
- Queue-depth-aware graceful degradation protects catalog endpoint under load.

