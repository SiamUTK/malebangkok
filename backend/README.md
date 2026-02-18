# MaleBangkok Backend (Production)

## 1) Production Folder Tree

```text
backend/
├── server.js
├── package.json
├── .env.example
├── README.md
├── config/
│   ├── db.js
│   ├── stripe.js
│   ├── logger.js
│   └── schema.sql
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── validationMiddleware.js
│   ├── rateLimiter.js
│   └── errorMiddleware.js
├── routes/
│   ├── authRoutes.js
│   ├── guideRoutes.js
│   ├── bookingRoutes.js
│   ├── paymentRoutes.js
│   └── adminRoutes.js
├── controllers/
│   ├── authController.js
│   ├── guideController.js
│   ├── bookingController.js
│   ├── paymentController.js
│   └── adminController.js
├── services/
│   ├── pricingService.js
│   ├── commissionService.js
│   └── aiMatchingService.js
├── models/
│   ├── userModel.js
│   ├── guideModel.js
│   ├── bookingModel.js
│   ├── paymentModel.js
│   ├── commissionModel.js
│   └── reviewModel.js
├── utils/
│   └── tokenUtils.js
├── logs/
├── uploads/
└── public/
```

## 2) Environment Setup

1. Copy `.env.example` to `.env`.
2. Set strong production values for:
   - `JWT_SECRET`
   - `DB_*`
   - `CORS_ORIGIN`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
3. Use `NODE_ENV=production` in cloud deployment.

## 3) Database Setup

Run schema from `config/schema.sql` on your MySQL instance:

```bash
mysql -u <user> -p <database> < config/schema.sql
```

## 4) Local Run

```bash
npm install
npm run dev
```

Production:

```bash
npm install --omit=dev
npm start
```

Health check endpoint:

```text
GET /api/health
```

## 5) Hostinger Cloud Node.js App Deployment

- **Node version**: `18+` (recommended latest 18 LTS or 20 LTS if supported)
- **Application root**: `backend`
- **Startup file / command**: `server.js` (or `npm start`)
- **Build/install step**: `npm install --omit=dev`
- **Environment variables**: add all values from `.env.example` in Hostinger panel

### Stripe Webhook

Configure Stripe webhook endpoint to:

```text
https://<your-domain>/api/payments/webhook
```

Subscribe at minimum to:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

Use the webhook signing secret in `STRIPE_WEBHOOK_SECRET`.

## 6) Security Controls Included

- `helmet` hardening
- Global + route-specific `express-rate-limit`
- Joi request validation
- Parameterized MySQL queries (`mysql2` pool)
- JWT authentication + role middleware
- Centralized error handling (safe in production)
- Winston structured logging to console + files
- No sensitive fields returned in API responses

## 7) Core Flows Implemented

- Auth: register/login/me with bcrypt + JWT
- Guide: admin create, public list/detail, verified flag
- Booking: pending creation, dynamic pricing, double-booking prevention, status state machine
- Payments: Stripe intent creation + webhook confirmation
- Commission: platform share + guide payout persisted on successful payment
- Admin metrics: users, guides, bookings, GMV, platform revenue, guide payout
