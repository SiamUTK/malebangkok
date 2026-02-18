const Stripe = require("stripe");

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
      maxNetworkRetries: 2,
      timeout: 20000,
    })
  : null;

module.exports = {
  stripe,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
};