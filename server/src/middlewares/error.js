const { ZodError } = require("zod");
const AppError = require("../utils/AppError");

function notFoundHandler(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (error.code === "P2002") {
    return res.status(409).json({ message: "A unique field already exists." });
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error.";

  if (process.env.NODE_ENV !== "production") {
    return res.status(statusCode).json({
      message,
      stack: error.stack
    });
  }

  return res.status(statusCode).json({ message });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
