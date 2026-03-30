import express from "express";
import { register, login, profile, updateProfile } from "../controllers/api/auth.js";
import auth from "../middleware/auth.js";
import { getRestaurants, getRestaurantById, getRestaurantTimings } from "../controllers/api/restaurantController.js";
import { getCategories } from "../controllers/api/categoryController.js";
import { getProducts } from "../controllers/api/productController.js";
import { addToCart, getCart, removeFromCart } from "../controllers/api/cartController.js";
import {
  createOrder,
  getAllOrders,
  getCustomerOrders,
  getOrder
} from "../controllers/api/OrderController.js";

import { getWalletSummary } from "../controllers/api/walletController.js";
import { redeemLoyaltyToWallet } from "../controllers/api/loyaltyController.js";
import { getProfile } from "../controllers/api/profileController.js";
import { createPaymentIntent, getRestaurantStripeKey } from "../controllers/api/stripeController.js";
import { getPaymentHistory } from "../controllers/api/paymentController.js";
import { saveFcmToken } from "../controllers/api/notificationController.js";
import { updateOrderStatus } from "../controllers/api/OrderController.js";
import {
  getNotifications,
  markNotificationRead
} from "../controllers/api/notificationListController.js";
import { getAppSettings } from "../controllers/api/settingsController.js";
import { getActiveOffers } from "../controllers/api/offerController.js";
import { reserveTable } from "../controllers/api/tableReservationController.js";


const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", auth, profile);
router.get("/wallet/summary", auth, getWalletSummary);

router.get("/restaurants", getRestaurants);
router.get("/restaurant/:id", getRestaurantById);
router.get("/restaurant-timings/:restaurant_id", getRestaurantTimings);

router.get("/app-settings", getAppSettings);
router.get("/categories", getCategories);
router.get("/products", getProducts);

router.post("/cart/add", addToCart);
router.get("/cart", getCart);
router.post("/cart/remove", removeFromCart);

router.post("/stripe/create-payment-intent", createPaymentIntent);
router.get("/stripe/restaurant-key", getRestaurantStripeKey);
// ORDERS
router.post("/create-order", auth, createOrder);

// ADMIN / RESTAURANT ORDERS
router.get("/orders", auth, getAllOrders);

// CUSTOMER ORDER HISTORY
router.get("/orders/customer/:customer_id", auth, getCustomerOrders);

// SINGLE ORDER DETAILS
router.get("/orders/:order_id", auth, getOrder);
router.post("/save-fcm-token", auth, saveFcmToken);
router.post("/orders/update-status", auth, updateOrderStatus);

router.get("/notifications", auth, getNotifications);
router.post("/notifications/read", auth, markNotificationRead);


router.get("/payments/history", auth, getPaymentHistory);
router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);

router.post("/loyalty/redeem", auth, redeemLoyaltyToWallet);

// PROMOTIONAL OFFERS
router.get("/offers", getActiveOffers);

// TABLE RESERVATIONS
router.post("/table-reservation", auth, reserveTable);

export default router;
