# LMS Portal Backend

Production-oriented LMS backend using Express, MongoDB, JWT cookie auth, Cloudinary media, and Razorpay payments.

## Tech Stack
- Node.js + Express (ES Modules)
- MongoDB + Mongoose
- JWT authentication (httpOnly cookies)
- Razorpay payment integration
- Cloudinary media storage

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

## Key API Routes
### Health
- `GET /health`

### Auth
- `POST /api/v1/user/signup`
- `POST /api/v1/user/signin`
- `POST /api/v1/user/signout`
- `GET /api/v1/user/profile`
- `PATCH /api/v1/user/profile`

### Course (Instructor)
- `POST /api/v1/courses`
- `PATCH /api/v1/courses/:courseId`
- `DELETE /api/v1/courses/:courseId`
- `POST /api/v1/courses/:courseId/lectures`
- `GET /api/v1/courses/:courseId/students`

### Course (Student)
- `POST /api/v1/courses/enroll`
- `GET /api/v1/courses/enrolled`
- `POST /api/v1/courses/:courseId/lectures/:lectureId/watch`
- `GET /api/v1/courses/:courseId/progress`

### Payment
- `POST /api/v1/payment/order`
- `POST /api/v1/payment/verify`
- `POST /api/v1/payment/failed`

## Security Notes
- JWT cookie is configured as `httpOnly` and `secure` in production.
- `sameSite` is `none` in production and `strict` in development.
- Helmet, HPP, Mongo sanitize, and rate limiting are enabled.
