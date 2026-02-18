# MaleBangkok – Premium Male Therapy & Elite Lifestyle Platform

Enterprise-grade SaaS-ready architecture for secure booking, payments, commission monetization, and AI-based guide recommendation.

## Architecture Tree

```text
malebangkok/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   ├── db.js
│   │   ├── stripe.js
│   │   ├── logger.js
│   │   └── schema.sql
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── rateLimiter.js
│   │   ├── validationMiddleware.js
│   │   └── errorMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── guideRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── adminRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── guideController.js
│   │   ├── bookingController.js
│   │   ├── paymentController.js
│   │   └── adminController.js
│   ├── services/
│   │   ├── pricingService.js
│   │   ├── commissionService.js
│   │   └── aiMatchingService.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── guideModel.js
│   │   ├── bookingModel.js
│   │   ├── paymentModel.js
│   │   └── reviewModel.js
│   ├── uploads/
│   ├── logs/
│   └── public/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api/axios.js
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── tokenStore.js
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── GuideProfile.jsx
│   │   │   ├── BookingFlow.jsx
│   │   │   ├── Payment.jsx
│   │   │   └── Dashboard.jsx
│   │   └── components/
│   └── dist/
└── README.md
```

## Security Design

- Helmet enabled globally.
- Route-level rate limits for login, booking, and payment endpoints.
- JWT auth middleware + role middleware (`client`, `guide`, `admin`).
- Joi request validation middleware for strong input contracts.
- Bcrypt password hashing.
- MySQL parameterized queries via `mysql2/promise`.
- Winston structured logging for security and ops auditing.
- Centralized error handling with sanitized production responses.
- Frontend JWT strategy: memory-first with optional session persistence; no localStorage JWT.

## Booking + Payment Lifecycle

1. `POST /api/bookings` calculates dynamic price via `pricingService` and stores booking as `pending`.
2. `POST /api/payments/intent` creates Stripe Payment Intent and links it to booking.
3. Stripe webhook `POST /api/payments/webhook` handles `payment_intent.succeeded`.
4. System marks booking `confirmed`, records payment status, calculates commission, and sends email notification.

## AI Matching

`services/aiMatchingService.js` provides modular scoring and ranking across:

- Age range
- Price range
- Verified status
- Rating
- Availability

Endpoint: `POST /api/guides/match`

## SQL Schema

Full schema is in [backend/config/schema.sql](backend/config/schema.sql), including:

- `users`
- `guides`
- `bookings`
- `payments`
- `reviews`
- `commissions`
- `verification_documents`

Includes foreign keys, indexes, normalized relationships, and status enums.

## Required Scripts

### Backend

- `npm run dev`
- `npm start`

### Frontend

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run build:hostinger`

## Hostinger Cloud Deployment

### 1) Backend (Node.js App)

1. Set **Application Root** = `backend`
2. Set **Startup File** = `server.js`
3. Set **Node Version** = `18+`
4. Install dependencies in backend: `npm install --omit=dev`
5. Configure environment variables from [backend/.env.example](backend/.env.example)

### 2) MySQL

1. Create MySQL database and user in Hostinger hPanel
2. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
3. Execute [backend/config/schema.sql](backend/config/schema.sql) in phpMyAdmin

### 3) Frontend Build + Static Serve

1. In `frontend`, set `VITE_API_BASE_URL=https://your-domain.com/api`
2. Build frontend into backend static folder: `npm run build:hostinger`
3. Restart Node.js app

The backend serves:

- API at `/api/*`
- Built React app from `backend/public`

## Production Environment Templates

- Backend env template: [backend/.env.example](backend/.env.example)
- Frontend env template: [frontend/.env.example](frontend/.env.example)
