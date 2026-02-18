# MaleBangkok – Premium Male Therapy & Elite Lifestyle Guide Platform in Bangkok

## 1) Global System Overview

### 1.1 Platform Architecture Overview
- Web Client (Guest/User/Guide/Admin) → API Gateway (REST) → Domain Services → Data Layer
- Web Client → Authentication Service (JWT issuance and refresh)
- Web Client → Booking Service → Payment Service (Stripe)
- Payment Service ↔ Stripe API (Payment Intent lifecycle)
- Stripe Webhook → Webhook Handler → Booking Status Update → Notification Service
- AI Matching Service → Guide Ranking Engine → Recommendation Feed
- Admin Console → Moderation Service → Compliance/Audit Logging

### 1.2 User Roles and Access Scope
- Guest: Public discovery access only; no booking, payment, or private dashboard access
- Registered User: Full booking lifecycle, payment, dashboard, review submission
- Guide: Verification onboarding, availability management, booking execution, payout visibility
- Admin: Role-restricted operational control, approvals, risk monitoring, revenue oversight

### 1.3 High-Level Cross-Role Flow
- Guest/User/Guide/Admin → Authentication Check → Role Resolution → Route Authorization → Feature Surface Rendering
- All protected actions → JWT Validation → Permission Check → Action Logging → Response

## 2) User Journey Flow (Client Side)

### 2.1 A. Guest Flow
#### 2.1.1 Discovery Entry
1. Guest → Open Landing Page → View Premium Positioning → View Trust Cues
2. Guest → Explore Guide Catalog → Apply Basic Filters → View Guide Cards
3. Guest → Select Guide Card → View Guide Profile → View Availability Snapshot
4. Guest → Click Book → Authentication Gate Triggered → Register/Login Prompt

#### 2.1.2 Arrow Flow
- Guest → Landing Page → Browse Guides → View Profile → Click Book → Register Prompt

### 2.2 B. Registration Flow
#### 2.2.1 Account Creation and Validation
1. Guest → Register Form → Submit Name/Email/Password → Create Pending Account
2. System → Send Verification Email → User Opens Verification Link → Email Confirmed
3. User → Login Form → Credential Validation → JWT Issued
4. User → First-Time Profile Setup → Save Preferences/Contact Settings → Dashboard Entry

#### 2.2.2 Arrow Flow
- Guest → Register → Email Verification → Login → JWT Issued → Profile Setup → User Dashboard

### 2.3 C. Booking Flow
#### 2.3.1 End-to-End Booking Lifecycle
1. User → Browse/Match Guides → Select Guide
2. User → Open Booking Form → Select Date → Select Time Slot
3. User → Select Duration → Add Premium Options
4. System → Run Real-Time Availability Check
5. System → Calculate Base Price + Options + Fees
6. User → Review Booking Summary → Confirm Booking
7. System → Create Booking (Status: Pending Payment)
8. System → Create Payment Intent → Redirect to Secure Payment
9. Payment Result:
   - Success: Stripe Confirmation → Booking Status Updated
   - Failure: Return to Payment Retry Path
10. System → Send Confirmation Email/Notification
11. User → Booking Marked Confirmed in Dashboard

#### 2.3.2 Arrow Flow
- User → Select Guide → Select Date/Time → Select Duration → Add Premium Options → Price Calculation → Confirm Booking (Pending) → Payment Redirect → Payment Success → Booking Confirmed → Email Notification

### 2.4 D. Post-Booking Flow
#### 2.4.1 Booking Management
1. User → Open Dashboard → View Upcoming/Completed/Cancelled Bookings
2. User → Open Booking Detail → Track Live Status
3. User → Request Cancellation → Rule Check (Window/Penalty) → Cancellation Outcome
4. User → Session Completed → Submit Review (if eligible)

#### 2.4.2 Arrow Flow
- User Dashboard → Booking Status Tracking → Cancellation Check → Session Complete → Review Submission

## 3) Guide Journey Flow

### 3.1 Guide Onboarding and Verification
1. Candidate Guide → Apply as Guide
2. Guide → Submit Profile + Verification Documents
3. System → Validation Checks → Queue for Admin Review
4. Admin Review Outcome:
   - Approved → Guide Account Activated
   - Rejected → Rejection Notice + Optional Reapply Path

### 3.2 Guide Operational Flow
1. Approved Guide → Set Availability Calendar
2. System → Publish Guide Availability
3. Booking Created by User → Guide Receives Booking Notification
4. Guide → Accept/Confirm Session Logistics (if required by policy)
5. Session End → Guide Marks Session Complete
6. System → Trigger Payout Eligibility and Tracking

### 3.3 Guide Arrow Flows
- Guide Candidate → Application → Document Upload → Admin Review → Approved/Rejected
- Approved Guide → Manage Availability → Receive Booking Notification → Complete Session → Payout Tracking

## 4) Admin Journey Flow

### 4.1 Role-Based Admin Access
1. Admin → Secure Login
2. System → Role Verification (Admin Scope)
3. Admin → Access Dashboard Overview

### 4.2 Admin Operations
1. Admin → Review Guide Applications → Approve/Reject
2. Admin → Monitor Active and Historical Bookings
3. Admin → View Revenue Dashboard
4. Admin → Review Commission Calculations
5. Admin → Investigate Suspicious Activity Flags

### 4.3 Admin Arrow Flow
- Admin Login → Role Validation → Dashboard → Approve Guides → Monitor Bookings → View Revenue → Commission Oversight → Risk Flag Review

## 5) Payment Flow (Detailed)

### 5.1 Transaction Lifecycle
1. User Confirms Booking → Booking Service Creates Booking (Pending)
2. Booking Service → Payment Service: Create Stripe Payment Intent
3. Payment Service → Return Client Secret/Redirect Parameters
4. User → Complete Payment on Secure Stripe Flow
5. Stripe → Emit Webhook Event (`payment_intent.succeeded` or failure event)
6. Webhook Handler → Verify Signature and Event Integrity
7. On Success:
   - Update Payment Status: Succeeded
   - Update Booking Status: Confirmed
   - Generate Commission Record
   - Trigger User/Guide Notifications
8. On Failure:
   - Update Payment Status: Failed
   - Keep/Set Booking Status: Pending Payment or Cancelled by policy
   - Trigger Retry/Recovery Notifications

### 5.2 Arrow Flow
- Booking Confirmed by User → Booking Created (Pending) → Stripe Payment Intent Created → User Pays → Stripe Webhook Confirmation → Update Payment/Booking Status → Generate Commission Record → Send Notifications

## 6) AI Matching Flow

### 6.1 Recommendation Lifecycle
1. User → Open Matching Input
2. User → Submit Preferences (service style, language, schedule, budget range, optional constraints)
3. Matching Engine → Normalize Inputs
4. Matching Engine → Apply Weight Scoring Logic
5. Ranking Engine → Compute Candidate Scores and Sort
6. System → Return Ranked Guide Recommendations
7. User → Click Recommendation
8. System → Track Impression/Click/Conversion Metrics

### 6.2 Arrow Flow
- User Preference Input → Normalize Data → Weight Scoring Logic → Ranking Algorithm → Recommended Guides Returned → Recommendation Click Tracking

## 7) Error & Edge Case Flow

### 7.1 Payment Failed
- User → Payment Attempt → Failure Event → Payment Status Failed → Prompt Retry/Alternate Method → Booking Remains Pending or Auto-Cancel by timeout policy

### 7.2 Double Booking Attempt
- User → Select Occupied Time Slot → Availability Recheck at Confirm Step → Conflict Detected → Block Booking Creation → Return Alternative Slots

### 7.3 Guide Unavailable After Selection
- User → Booking In Progress → Guide Availability Changes → Final Validation Fails → Notify Unavailable → Suggest New Time or Alternate Guide

### 7.4 Expired Session / Token
- User Action on Protected Route → JWT Expired → Refresh Attempt
  - Refresh Success → Continue Flow
  - Refresh Failed → Force Re-Login

### 7.5 Rate Limit Triggered
- Repeated Requests → Rate Limiter Triggered → Return Throttled Response → Cooldown Window Enforced → Retry After Window

### 7.6 Invalid Token
- Request with Invalid Signature/Format → Auth Middleware Rejects → 401 Response → Security Event Logged

## 8) Privacy & Security Touchpoints

### 8.1 JWT Validation Points
- Login/Refresh Endpoints → Token issuance/renewal controls
- Protected API Routes → Access token validation on each request
- Sensitive Actions (booking, payment, profile edits) → Revalidation and scope checks

### 8.2 Role-Based Route Protection
- User-only routes → Deny Guest/Guide/Admin mismatch
- Guide-only routes → Restrict payout/availability controls
- Admin routes → Strict role assertion with elevated audit trail

### 8.3 Secure Payment Flow
- No raw card data stored in platform services
- Stripe-hosted/secure payment collection only
- Webhook signature verification mandatory before status mutation

### 8.4 Sensitive Data Masking
- PII minimized in logs and operator views
- Contact and identity fields masked by role visibility rules
- Payment artifacts stored as references/tokens, not full instrument data

### 8.5 Audit Logging
- Auth events: login attempts, token failures, privilege checks
- Financial events: payment status updates, commission generation, payout changes
- Risk events: repeated failures, suspicious booking patterns, admin overrides

## 9) State Diagram Summary

### 9.1 Booking State Transitions
- `pending` → `paid` → `confirmed` → `completed`
- `pending` → `cancelled`
- `paid` → `cancelled` (policy-dependent refund branch)

### 9.2 Guide Verification State Transitions
- `submitted` → `under_review` → `approved`
- `submitted` → `under_review` → `rejected`
- `rejected` → `submitted` (reapply flow)

### 9.3 Payment State Transitions
- `initiated` → `processing` → `succeeded`
- `initiated` → `processing` → `failed`
- `failed` → `processing` (retry flow)

## 10) Consolidated End-to-End System Flow

### 10.1 Primary Platform Flow
- Guest → Discover Guides → Register/Login → Profile Setup → AI Recommendations/Browse → Select Guide → Booking Creation (Pending) → Stripe Payment → Webhook Confirmation → Booking Confirmed → Session Completed → Review + Payout + Commission Finalization

### 10.2 Trust and Compliance Overlay
- Every protected step → JWT Validation → Role Authorization → Security Logging
- Every payment mutation → Webhook Verification → Idempotent Status Update → Audit Record
- Every failure branch → Deterministic Error State → User/Guide/Admin Notification Path
