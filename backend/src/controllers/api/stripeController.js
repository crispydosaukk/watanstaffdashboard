import Stripe from "stripe";
import db from "../../config/db.js";

const getStripeKeys = async () => {
  try {
    const [rows] = await db.query(
      "SELECT stripe_publishable_key, stripe_secret_key FROM settings LIMIT 1"
    );

    if (rows.length && rows[0].stripe_secret_key) {
      return {
        secret: rows[0].stripe_secret_key,
        publishable: rows[0].stripe_publishable_key
      };
    }
  } catch (e) {
    console.error("Stripe global keys DB error:", e);
  }

  return { secret: null, publishable: null };
};

export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = "gbp", restaurant_id } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 0,
        message: "Invalid amount",
      });
    }

    const { secret, publishable } = await getStripeKeys();

    if (!secret) {
      return res.status(500).json({
        status: 0,
        message: "Stripe is not configured (missing secret key)",
      });
    }

    const stripeInstance = new Stripe(secret, {
      apiVersion: "2023-10-16",
    });

    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: Math.round(amount * 100), // pounds → pence
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return res.json({
      status: 1,
      clientSecret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      publishableKey: publishable
    });
  } catch (error) {
    console.error("Stripe error:", error);
    return res.status(500).json({
      status: 0,
      message: error.message || "Stripe error",
    });
  }
};

/**
 * GET /api/stripe/restaurant-key?restaurant_id=<id>
 * Returns only the publishable key for a restaurant (safe to expose to mobile/frontend).
 * NEVER returns the secret key.
 */
export const getRestaurantStripeKey = async (req, res) => {
  try {
    const { restaurant_id } = req.query;

    if (!restaurant_id) {
      return res.status(400).json({ status: 0, message: "restaurant_id is required" });
    }

    const { publishable } = await getStripeKeys();

    if (!publishable) {
      return res.json({
        status: 0,
        message: "Stripe publishable key not found/configured",
        publishableKey: null
      });
    }

    return res.json({
      status: 1,
      publishableKey: publishable,
    });
  } catch (error) {
    console.error("getRestaurantStripeKey error:", error);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};
