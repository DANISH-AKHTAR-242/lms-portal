# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Running the Server
- **Development**: `npm run dev` (uses nodemon for auto-reload)
- **Production**: `npm start`

### Environment
- Uses ES6 modules (`"type": "module"` in package.json)
- Entry point: `index.js`
- Environment variables defined in `.env` (do not commit this file)

## Architecture Overview

### Express.js Backend with MVC Pattern
This is a Node.js/Express LMS (Learning Management System) backend with MongoDB, featuring course management, user authentication, and Razorpay payment integration.

### Core Structure
```
controllers/    - Business logic for routes
models/         - Mongoose schemas (User, Course, Lecture, CoursePurchase)
routes/         - API endpoint definitions
middleware/     - Auth, validation, error handling
database/       - MongoDB connection with retry logic (DatabaseConnection class)
utils/          - Cloudinary media upload, JWT token generation, Multer config
```

### Security & Middleware Stack
Applied in this order (see `index.js`):
1. **helmet**: Security headers
2. **hpp**: HTTP parameter pollution protection
3. **express-mongo-sanitize**: NoSQL injection prevention
4. **express-rate-limit**: Global rate limiting (100 requests/15 min per IP on `/api` routes)
5. **morgan**: Request logging (development only)
6. **cors**: Configured for CLIENT_URL with credentials support

### Database Architecture
- **MongoDB Connection**: Singleton pattern with automatic retry (3 attempts, 5s interval)
- **Mongoose**: Strict query mode enabled, debug mode in development
- Connection monitors: `connected`, `error`, `disconnected` events with auto-reconnect
- Graceful shutdown on `SIGTERM`

### Authentication Flow
- **JWT-based** authentication (7-day expiry)
- Tokens stored in httpOnly cookies
- `isAuthenticated` middleware verifies JWT and attaches `req.id` (user ID)
- Password hashing with bcryptjs (cost factor: 12)

### Data Models & Relationships

**User Model:**
- Roles: `student`, `instructor`, `admin`
- References: `enrolledCourse[]` (array of {course, enrolledAt}), `createdCourses[]`
- Methods: `comparePassword()`, `getResetPasswordToken()`, `updateLastActive()`
- Virtual: `totalEnrolledCourses`

**Course Model:**
- References: `instructor` (User), `lectures[]` (Lecture), `enrolledStudent[]` (User)
- Levels: `beginner`, `intermediate`, `advanced`
- Auto-calculates: `totalLectures` on save
- Virtual: `averageRating` (placeholder)

**Lecture Model:**
- References Cloudinary `publicId` for video management
- Fields: `videoUrl`, `duration`, `isPreview`, `order`

**CoursePurchase Model:**
- Payment tracking with Razorpay integration
- Status flow: `pending` → `completed`/`failed`/`refunded`
- Indexes on: `{user, course}`, `status`, `createdAt`
- Virtual: `isRefundable` (30-day window check)
- Method: `processRefund(reason, amount)`

### API Routes
- `/health` - Health check endpoint
- `/api/v1/user` - User authentication and profile management
  - POST `/signup` - Create account (validates with `validateSignup`)
  - POST `/signin` - Login
  - POST `/signout` - Logout
  - GET `/profile` - Get current user (requires auth)
  - PATCH `/profile` - Update profile with avatar upload (requires auth)

### File Upload Strategy
- **Multer**: Handles multipart/form-data
- **Cloudinary**: Media storage (images/videos)
  - `uploadMedia(file)` - Auto-detects resource type
  - `deleteMediaFromCloudinary(publicId)` - Image deletion
  - `deleteVideoFromCloudinary(publicId)` - Video deletion

### Error Handling
- **ApiError** class: Custom operational errors with statusCode
- **catchAsync**: Wrapper for async route handlers
- **Global error handler**: Returns error details (stack trace in development only)
- 404 handler for undefined routes

## Important Patterns & Known Issues

### Common Bugs to Watch For
The codebase contains several typos and logic errors:

1. **User Model (user.model.js:76)**: `isModified` should be `this.isModified`
2. **User Model (user.model.js:84,88,99)**: `userSchema.method` should be `userSchema.methods` (plural)
3. **User Model (user.model.js:101)**: `this.lastActive()` should be `this.save()`
4. **Course Model (course.model.js:85)**: `this.lectures.lenght` should be `this.lectures.length`
5. **generateToken (generateToken.js:10)**: `res.cookies()` should be `res.cookie()`
6. **User Controller (user.controller.js:28,47)**: Missing `await` on `User.findOne()` and `User.findById()`
7. **User Controller (user.controller.js:30)**: Logic error - should be `!user || !(await user.comparePassword(password))`
8. **Razorpay Controller (razorpay.controller.js:25)**: `pending` should be `"pending"` (string)
9. **Error Middleware (error.middleware.js:20)**: `AppError` should be `ApiError`
10. **Auth Middleware (auth.middleware.js:14)**: `jwtError` returns undefined - should throw `new ApiError`

### Code Conventions
- **ES6 imports/exports**: Always use `import`/`export`, never `require`
- **Async/await**: Wrap async route handlers with `catchAsync`
- **Error throwing**: Use `throw new ApiError(message, statusCode)` for operational errors
- **Database queries**: Always `await` Mongoose queries
- **Password selection**: Use `.select("+password")` when authentication is needed
- **Token generation**: Call `generateToken(res, user, message)` after successful auth operations

### Environment Variables Required
```
PORT
NODE_ENV (development/production)
CLIENT_URL
MONGODB_URI
SECRET_KEY (JWT signing)
CLOUDINARY_URL
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_CLOUD_NAME
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
```

### Payment Integration
- Razorpay order creation requires amount in **paisa** (multiply by 100)
- Payment verification uses HMAC SHA256 signature
- Order receipt format: `course_{courseId}`
