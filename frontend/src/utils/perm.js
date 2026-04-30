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

export function can(required, passedUser, passedPerms) {
  if (!required) return true;

  const user = passedUser || getUser();
  const roleTitle = (user.role_title || user.role || "").toLowerCase();

  // 🔥 SUPER ADMIN BYPASS
  if (String(user.role_id) === "6" || roleTitle.includes("super") || roleTitle.includes("admin") || String(user.role_id) === "1") {
    return true;
  }

  // normal permissions for other roles
  const perms = (passedPerms || getPerms()).map(p => String(p).toLowerCase());
  return perms.includes(String(required).toLowerCase());
}


/**
 * Returns the first route the user has permission for.
 * Defaults to '/dashboard' if they have it, or the first available.
 * If no permissions, returns '/login'.
 */
export function getSafePath(passedUser, passedPerms) {
  const user = passedUser || getUser();
  const roleTitle = (user.role_title || user.role || "").toLowerCase();

  // Super Admin bypass
  if (String(user.role_id) === "6" || roleTitle.includes("super") || roleTitle.includes("admin") || String(user.role_id) === "1") {
    return "/dashboard";
  }

  const perms = (passedPerms || getPerms()).map(p => String(p).toLowerCase());

  const map = [
    { perm: "dashboard", path: "/dashboard" },
    { perm: "staff_management", path: "/staff" },
    { perm: "all_staff", path: "/allstaff" },
    { perm: "restaurant", path: "/restuarent" },
    { perm: "access", path: "/access" },
  ];

  for (const item of map) {
    if (perms.includes(item.perm)) {
      return item.path;
    }
  }

  return "/login"; // fallback if no perms at all
}


