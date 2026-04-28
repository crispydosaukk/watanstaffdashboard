import Stripe from "stripe";

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
} else {
  console.warn("⚠️ STRIPE_SECRET_KEY not found in environment variables. Payments will be disabled.");
}

export default stripe;
