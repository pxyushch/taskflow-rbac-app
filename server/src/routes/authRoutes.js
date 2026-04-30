const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { signToken } = require("../utils/jwt");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must have at least 2 characters.").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long.")
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address."),
  password: z.string().min(1, "Password is required.")
});

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const data = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    if (existingUser) {
      throw new AppError(409, "Email is already registered.");
    }

    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "ADMIN" : "MEMBER";
    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role
      }
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: sanitizeUser(user),
      message:
        role === "ADMIN"
          ? "First account created as ADMIN."
          : "Account created successfully."
    });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });
    if (!user) {
      throw new AppError(401, "Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError(401, "Invalid email or password.");
    }

    const token = signToken(user);
    return res.json({
      token,
      user: sanitizeUser(user)
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const prisma = req.app.locals.prisma;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      throw new AppError(404, "User not found.");
    }

    return res.json({ user: sanitizeUser(user) });
  })
);

module.exports = router;
