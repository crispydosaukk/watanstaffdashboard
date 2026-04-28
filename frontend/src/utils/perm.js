// frontend/src/utils/perm.js

// Get permissions array (for normal roles)
export function getPerms() {
  try {
    return JSON.parse(localStorage.getItem("perms") || "[]");
  } catch {
    return [];
  }
}

// New helper: get logged-in user
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export function can(required) {
  if (!required) return true;

  const user = getUser();
  const roleTitle = (user.role_title || user.role || "").toLowerCase();

  // 🔥 SUPER ADMIN BYPASS
  if (user.role_id === 6 || roleTitle.includes("super")) {
    return true;
  }

  // normal permissions for other roles
  const perms = getPerms();
  return perms.includes(String(required).toLowerCase());
}

/**
 * Returns the first route the user has permission for.
 * Defaults to '/dashboard' if they have it, or the first available.
 * If no permissions, returns '/login'.
 */
export function getSafePath() {
  const user = getUser();
  const roleTitle = (user.role_title || user.role || "").toLowerCase();

  // Super Admin bypass
  if (user.role_id === 6 || roleTitle.includes("super")) {
    return "/dashboard";
  }

  const perms = getPerms().map(p => p.toLowerCase());

  const map = [
    { perm: "dashboard", path: "/dashboard" },
    { perm: "restaurant", path: "/restuarent" },
    { perm: "access", path: "/access" },
    { perm: "category", path: "/category" },
    { perm: "product", path: "/product" },
    { perm: "customer_info", path: "/customerinfo" },
    { perm: "customer_details", path: "/customerdetails" },
    { perm: "order_management", path: "/orders" },
    { perm: "table_reservations", path: "/table-reservations" },
    { perm: "settings", path: "/settings" },
    { perm: "restaurant_registration", path: "/restaurantregistration" },
    { perm: "promotional_offers", path: "/offers" },
    { perm: "finance_management", path: "/finance" }
  ];

  for (const item of map) {
    if (perms.includes(item.perm)) {
      return item.path;
    }
  }

  return "/login"; // fallback if no perms at all
}

