const AppError = require("../utils/AppError");
const { verifyToken } = require("../utils/jwt");

function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "Authentication required."));
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next(new AppError(401, "Invalid authorization header."));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role, email: payload.email };
    return next();
  } catch (_error) {
    return next(new AppError(401, "Invalid or expired token."));
  }
}

function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "You are not allowed to perform this action."));
    }

    return next();
  };
}

module.exports = { requireAuth, authorizeRoles };
