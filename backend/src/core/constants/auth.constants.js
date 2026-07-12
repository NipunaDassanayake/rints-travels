const USER_ROLES = Object.freeze({
  TOURIST: "TOURIST",
  ADMIN: "ADMIN",
  TOUR_GUIDE: "TOUR_GUIDE",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
});

const USER_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
  DELETED: "DELETED",
});

const AUTH_PROVIDERS = Object.freeze({
  LOCAL: "LOCAL",
  GOOGLE: "GOOGLE",
});

const TOKEN_TYPES = Object.freeze({
  ACCESS: "access",
  REFRESH: "refresh",
});

module.exports = {
  USER_ROLES,
  USER_STATUS,
  AUTH_PROVIDERS,
  TOKEN_TYPES,
};