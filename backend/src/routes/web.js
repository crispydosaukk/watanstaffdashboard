import express from "express";
import { login } from "../controllers/admin/AuthController.js";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";

import {
  getProducts,
  addProduct,
  removeProduct,
  updateProduct,
  reorderProducts,
  searchGlobalProducts,
  getGlobalProductsByCategory,
  importGlobalProducts
} from "../controllers/admin/ProductController.js";

import { getDashboardStats, getOrderDetails, getRestaurantsList } from "../controllers/admin/DashboardController.js";

import {
  index as listPermissions,
  create as createPermission,
  update as updatePermissionCtrl,
  remove as deletePermissionCtrl,
} from "../controllers/admin/PermissionController.js";

import {
  index as listRoles,
  create as createRole,
  update as updateRole,
  remove as deleteRole,
} from "../controllers/admin/RolesController.js";

import {
  index as listUsers,
  create as createUser,
  update as updateUser,
  remove as deleteUser,
} from "../controllers/admin/UsersController.js";

import {
  show as getRestaurant,
  upsert as upsertRestaurant,
  index as listRestaurants,
} from "../controllers/admin/RestaurantController.js";

import {
  getCategories,
  addCategory,
  removeCategory,
  updateCategory,
  reorderCategories,
  searchGlobalCategories
} from "../controllers/admin/CategoryController.js";

import {
  getCustomers,
  getCustomerByIdCtrl,
  addCustomer,
  editCustomer,
  removeCustomer,
  getCustomersByUser,
} from "../controllers/admin/CustomerController.js";

import {
  getSettings,
  saveSettings,
} from "../controllers/admin/SettingsController.js";

import {
  store as saveMerchantProfile,
  index as listMerchantProfiles,
  updateStatus as updateMerchantStatus,
  getMyProfile as getMyMerchantProfile,
  updateMyProfile as updateMyMerchantProfile,
} from "../controllers/admin/MerchantStoreProfileController.js";



const router = express.Router();

/* AUTH */
router.post("/auth/login", login);

/* PERMISSIONS */
router.get("/permissions", listPermissions);
router.post("/permissions", createPermission);
router.put("/permissions/:id", updatePermissionCtrl);
router.delete("/permissions/:id", deletePermissionCtrl);

/* ROLES */
router.get("/roles", listRoles);
router.post("/roles", createRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

/* USERS */
router.get("/users", listUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

/* RESTAURANT -- use upload.single to accept optional photo */
router.get("/restaurants", auth, listRestaurants);
router.get("/restaurant", auth, getRestaurant);
router.post("/restaurant", auth, upload.single("photo"), upsertRestaurant);

/* CATEGORY */
router.put("/category/reorder", auth, reorderCategories);
router.get("/category/search-global", auth, searchGlobalCategories);
router.get("/category", auth, getCategories);
router.post("/category", auth, upload.single("image"), addCategory);
router.put("/category/:id", auth, upload.single("image"), updateCategory);
router.delete("/category/:id", auth, removeCategory);

/* PRODUCTS */
/* PRODUCT REORDER */
router.put("/products/reorder", auth, reorderProducts);
router.get("/products/search-global", auth, searchGlobalProducts);
router.get("/products/global-by-category", auth, getGlobalProductsByCategory);
router.post("/products/import-global", auth, importGlobalProducts);

router.get("/products", auth, getProducts);
router.post("/products", auth, upload.single("image"), addProduct);
router.delete("/products/:id", auth, removeProduct);
router.put("/products/:id", auth, upload.single("image"), updateProduct);


router.get("/customers/by-user", auth, getCustomersByUser); // 👈 New Route
router.get("/customers", getCustomers);
router.get("/customers/:id", getCustomerByIdCtrl);
router.post("/customers", addCustomer);
router.put("/customers/:id", editCustomer);
router.delete("/customers/:id", removeCustomer);

/* SETTINGS */
router.get("/settings", auth, getSettings);
router.post("/settings", auth, saveSettings);

/* DASHBOARD */
router.get("/dashboard/restaurants", auth, getRestaurantsList);
router.get("/dashboard-stats", auth, getDashboardStats);
router.get("/dashboard/order-details/:order_number", auth, getOrderDetails);


/* MERCHANT STORE PROFILES */
router.get("/merchant-profiles", auth, listMerchantProfiles);
router.post("/merchant-profiles", auth, saveMerchantProfile);
router.put("/merchant-profile/update-status/:id", auth, updateMerchantStatus);
router.get("/merchant-profile/me", auth, getMyMerchantProfile);
router.put("/merchant-profile/my-update", auth, updateMyMerchantProfile);

export default router;
