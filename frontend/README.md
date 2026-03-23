# LMS Portal Frontend

Production-ready React frontend for the LMS backend.

## Tech Stack
- React + Vite
- React Query
- Axios (cookies + CSRF + refresh interceptors)
- Tailwind CSS
- Zustand
- React Router (lazy loaded routes)

## Environment
Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

- `VITE_API_URL` (default backend URL)
- `VITE_RAZORPAY_KEY_ID` (public Razorpay key)

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Project Structure
```text
src/
  api/
  components/
  features/
    auth/
    courses/
    payments/
  hooks/
  pages/
  store/
  utils/
```

## Security and Auth Notes
- Uses backend cookie auth (`withCredentials: true`), no localStorage token storage.
- CSRF token is fetched from `/api/v1/security/csrf-token` and attached to mutating requests.
- Axios interceptor retries once on `401` by calling `/api/v1/user/refresh`.
- Handles expired session by clearing client auth state and redirecting to login-protected routes.

## Deployment Notes
- Deploy on Vercel/Netlify as static Vite app.
- Ensure backend CORS `CLIENT_URL` matches deployed frontend origin.
- Cookies must be configured with `sameSite=none` and `secure=true` in production backend.
